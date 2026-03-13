import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Animated,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as Location from 'expo-location';
import eventEmitter, { EVENTS } from '../utils/EventEmitter';
import { userAPI } from '../services/api';
import { ToastContext } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;
const SLIDER_WIDTH = SCREEN_WIDTH - 60; // Account for padding

// Default filter values
// NOTE: gender default will be overridden based on user's profile (men see women, women see men)
const DEFAULT_FILTERS = {
  // Basic filters
  gender: 'all', // This will be dynamically changed based on user's gender
  minAge: 18,
  maxAge: 66,
  verifiedPhotosOnly: false,

  // Activity filter
  activity: 'thisWeek', // 'online', 'today', 'thisWeek'

  // Location filter
  maxDistance: 10000, // km - default to global range

  // Premium filters
  memberType: 'all', // 'all', 'new', 'hot'
  minHeight: 120, // cm
  maxHeight: 200, // cm
  minWeight: 30, // kg
  maxWeight: 125, // kg

  // Lifestyle filters
  noChildren: 'any',
  wantsChildren: 'any',
  education: 'any',
};

const FILTERS_STORAGE_KEY = '@dating_app_filters';
const FILTERS_VERSION_KEY = '@dating_app_filters_version';
const CURRENT_FILTERS_VERSION = '5'; // Increment when default logic changes

// Module-level cache for user gender to prevent repeated API calls
// IMPORTANT: must be cleared on logout to avoid stale data across accounts
let cachedUserGender = null;

// Call this on logout to reset the cache
export const clearCachedUserGender = () => {
  cachedUserGender = null;
};

const genderToDefaultFilter = (gender) => {
  if (gender === 'man' || gender === 'male') return 'women';
  if (gender === 'woman' || gender === 'female') return 'men';
  return 'all';
};

// Helper function to get default gender based on user's gender
const getDefaultGenderForUser = async () => {
  // Return cached value if available
  if (cachedUserGender !== null) {
    return cachedUserGender;
  }

  try {
    // Import dynamically to avoid circular dependency
    const { userAPI } = await import('../services/api');
    const { data } = await userAPI.getProfile();

    // Backend returns { user: { gender: '...' } }
    const userGender = data.user?.gender;
    const defaultGender = genderToDefaultFilter(userGender);

    // Cache the result (only on success)
    cachedUserGender = defaultGender;
    return defaultGender;
  } catch (error) {
    console.error('Failed to get user gender:', error);
    // Don't cache error results, allow retry next time
    return 'all';
  }
};

// Helper function to load filters from AsyncStorage
export const getStoredFilters = async () => {
  try {
    // Check filter version - clear cache if outdated
    const savedVersion = await AsyncStorage.getItem(FILTERS_VERSION_KEY);

    if (savedVersion !== CURRENT_FILTERS_VERSION) {
      await AsyncStorage.removeItem(FILTERS_STORAGE_KEY);
      await AsyncStorage.setItem(FILTERS_VERSION_KEY, CURRENT_FILTERS_VERSION);
    }

    const savedFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);

    // Get default gender based on user profile (men see women, women see men)
    const defaultGender = await getDefaultGenderForUser();

    const defaultFilters = {
      ...DEFAULT_FILTERS,
      gender: defaultGender, // Dynamic default gender
    };

    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);

      // ALWAYS override gender if it's 'all' - we want users to see opposite gender by default
      if (!parsed.gender || parsed.gender === 'all') {
        parsed.gender = defaultGender;
        // Save updated value
        await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ ...parsed, gender: defaultGender }));
      }

      return { ...defaultFilters, ...parsed };
    }

    // First time - use default with dynamic gender
    return defaultFilters;
  } catch (error) {
    console.error('Failed to load filters:', error);
    // Fallback - try to get user gender
    const fallbackGender = await getDefaultGenderForUser();
    return {
      ...DEFAULT_FILTERS,
      gender: fallbackGender || 'all',
    };
  }
};

// 1-50: 1'er, 50-100: 2'şer, sonra kademeli — 100 km slider'ın ~%50'sinde
const DISTANCE_STEPS = [
  ...Array.from({ length: 50 }, (_, i) => i + 1),       // 1–50 (1'er) → 50 adım
  ...Array.from({ length: 25 }, (_, i) => 52 + i * 2),  // 52–100 (2'şer) → 25 adım
  // 100 sonrası — 74 adım daha (toplamda ~148, 100km = %50)
  105, 110, 115, 120, 125, 130, 135, 140, 145, 150,
  155, 160, 165, 170, 175, 180, 185, 190, 195, 200,
  210, 220, 230, 240, 250, 260, 270, 280, 290, 300,
  320, 340, 360, 380, 400, 430, 460, 500, 550, 600,
  650, 700, 750, 800, 850, 900, 950, 1000,
  1100, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000,
  6000, 7500, 10000, 12500, 15000, 17500, 20037,
];

const distanceToIndex = (km) => {
  let closest = 0;
  let minDiff = Math.abs(DISTANCE_STEPS[0] - km);
  for (let i = 1; i < DISTANCE_STEPS.length; i++) {
    const diff = Math.abs(DISTANCE_STEPS[i] - km);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  }
  return closest;
};

// Custom Marker Component for slider thumbs
const CustomMarker = () => (
  <View style={styles.customMarker}>
    <View style={styles.markerInner} />
  </View>
);

export default function FiltersModal({ visible, onClose }) {
  const { t } = useLanguage();
  // Don't use DEFAULT_FILTERS directly - it will be loaded with dynamic gender
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, gender: 'all' });
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userGender, setUserGender] = useState(null); // Current user's gender
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data is already loaded
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const { showToast } = useContext(ToastContext);

  // Animate modal - ULTRA FAST
  useEffect(() => {
    if (visible) {
      // Start animation immediately - ULTRA FAST settings
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,  // Increased from 80
        friction: 8,   // Reduced from 9
      }).start();

      // Load data only if not already loaded
      if (!dataLoaded) {
        const init = async () => {
          // Only load profile if not already loaded
          let gender = userGender;
          if (!gender) {
            gender = await loadUserProfile();
          }
          await loadFilters(gender);

          // Only load location if not already loaded
          if (!userLocation) {
            loadUserLocation();
          }

          setDataLoaded(true); // Mark as loaded
        };
        init();
      } else {
        // Data already loaded, just show it
        setLoading(false);
      }
    } else {
      // Close animation - FASTER
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,  // Reduced from 300
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Load user's profile to get gender
  const loadUserProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      const userGender = data.user?.gender; // Backend returns { user: { gender: '...' } }
      setUserGender(userGender); // 'man' or 'woman'
      return userGender;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  };

  // Get default gender filter based on user's gender
  const getDefaultGender = () => genderToDefaultFilter(userGender);

  // Load user's current location
  const loadUserLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Failed to get location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Generate static map URL (using OpenStreetMap tiles via static image)
  const getMapUrl = () => {
    if (!userLocation) return null;
    const { latitude, longitude } = userLocation;
    const zoom = 13;
    // Using Google Static Maps API (free tier)
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=400x150&maptype=roadmap&markers=color:blue%7C${latitude},${longitude}&key=`;
  };

  // Alternative: OpenStreetMap static image via third party service
  const getOSMMapUrl = () => {
    if (!userLocation) return null;
    const { latitude, longitude } = userLocation;
    // Using a free static map service
    return `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${longitude},${latitude}&z=13&l=map&size=400,150&pt=${longitude},${latitude},pm2blm`;
  };

  const loadFilters = async (gender = null) => {
    try {
      // Check version first
      const savedVersion = await AsyncStorage.getItem(FILTERS_VERSION_KEY);
      if (savedVersion !== CURRENT_FILTERS_VERSION) {
        console.log('🧹 Clearing old filters cache (component)');
        await AsyncStorage.removeItem(FILTERS_STORAGE_KEY);
        await AsyncStorage.setItem(FILTERS_VERSION_KEY, CURRENT_FILTERS_VERSION);
      }

      const savedFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);

      // Set default gender based on user's gender
      // Men should see women, women should see men
      let defaultGender = 'all';
      if (gender === 'man') {
        defaultGender = 'women';
      } else if (gender === 'woman') {
        defaultGender = 'men';
      }

      const defaultFilters = {
        ...DEFAULT_FILTERS,
        gender: defaultGender,
      };

      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);

        // ALWAYS override if gender is 'all' - users should see opposite gender by default
        if (!parsed.gender || parsed.gender === 'all') {
          parsed.gender = defaultGender;
          // Save with updated gender (don't emit event - this is initial load)
          const updatedFilters = { ...defaultFilters, ...parsed, gender: defaultGender };
          setFilters(updatedFilters);
          saveFilters(updatedFilters, false);
        } else {
          setFilters({ ...defaultFilters, ...parsed });
        }
      } else {
        // First time opening - use default with dynamic gender and save (don't emit event)
        setFilters(defaultFilters);
        saveFilters(defaultFilters, false);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFilters = async (newFilters, emitEvent = true) => {
    try {
      await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
      setFilters(newFilters);

      // Emit event to notify screens that filters changed (only if requested)
      if (emitEvent) {
        eventEmitter.emit(EVENTS.FILTERS_CHANGED);
      }
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    saveFilters(newFilters, false); // DON'T emit event - wait for modal close
  };

  const updateSliderFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    saveFilters(newFilters, false); // DON'T emit event for sliders - wait for Close button
  };

  const updateRangeFilter = (minKey, maxKey, values) => {
    const newFilters = { ...filters, [minKey]: values[0], [maxKey]: values[1] };
    saveFilters(newFilters, false); // DON'T emit event - wait for Close button
  };

  const handleClose = () => {
    // Emit event when closing - this is when filters should be applied
    eventEmitter.emit(EVENTS.FILTERS_CHANGED);
    onClose();
  };

  const resetFilters = async () => {
    // Create default filters with gender based on user's gender
    const defaultFilters = {
      ...DEFAULT_FILTERS,
      gender: getDefaultGender(), // Set based on user's gender
    };
    await saveFilters(defaultFilters, true); // Save and emit event

    // Show success toast
    showToast(t('filters.resetConfirm'), 2000);

    // Close modal after reset
    onClose();
  };

  // Render section header
  const renderSectionHeader = (title) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  // Render row with chevron (for selection screens)
  const renderSelectRow = (label, value, onPress) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  // Render row with toggle
  const renderToggleRow = (label, value, onChange, icon = null) => (
    <View style={styles.row}>
      <View style={styles.rowLabelContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: '#2D2D2D' }}
        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : value ? '#FFFFFF' : '#F3F4F6'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );

  // Render activity tabs
  const renderActivityTabs = () => {
    const activities = [
      { key: 'online', label: t('filters.activity.onlineNow') },
      { key: 'today', label: t('filters.activity.today') },
      { key: 'thisWeek', label: t('filters.activity.thisWeek') },
    ];

    return (
      <View style={styles.tabContainer}>
        {activities.map((activity) => (
          <TouchableOpacity
            key={activity.key}
            style={[
              styles.tab,
              filters.activity === activity.key && styles.tabActive,
            ]}
            onPress={() => updateFilter('activity', activity.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                filters.activity === activity.key && styles.tabTextActive,
              ]}
            >
              {activity.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render search location radio buttons
  // Render premium member type tabs
  const renderMemberTypeTabs = () => {
    const types = [
      { key: 'all', label: t('filters.premium.allMembers') },
      { key: 'new', label: t('filters.premium.new') },
      { key: 'hot', label: t('filters.premium.hot') },
    ];

    return (
      <View style={styles.tabContainer}>
        {types.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.tab,
              filters.memberType === type.key && styles.tabActive,
            ]}
            onPress={() => updateFilter('memberType', type.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                filters.memberType === type.key && styles.tabTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render Range Slider (Single line with two thumbs)
  const renderRangeSlider = (label, minKey, maxKey, minValue, maxValue, unit, step = 1) => (
    <View style={styles.sliderSection}>
      <View style={styles.sliderHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {filters[minKey]} - {filters[maxKey]}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        <MultiSlider
          values={[filters[minKey], filters[maxKey]]}
          min={minValue}
          max={maxValue}
          step={step}
          sliderLength={SLIDER_WIDTH}
          onValuesChange={(values) => updateRangeFilter(minKey, maxKey, values)}
          selectedStyle={styles.selectedTrack}
          unselectedStyle={styles.unselectedTrack}
          trackStyle={styles.track}
          markerStyle={styles.marker}
          pressedMarkerStyle={styles.pressedMarker}
          customMarker={CustomMarker}
          allowOverlap={false}
          snapped
          minMarkerOverlapDistance={20}
        />
      </View>
    </View>
  );

  // Format distance for display
  const formatDistance = (km) => {
    if (km >= 10000) {
      return `${(km / 1000).toFixed(0)}K`;
    }
    return km.toString();
  };

  // Render distance slider — kademeli adımlarla, 100km ~%50'de
  const renderDistanceSlider = (label, unit) => {
    const currentIndex = distanceToIndex(filters.maxDistance);
    return (
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.sliderValue}>
            {formatDistance(filters.maxDistance)} {unit}
          </Text>
        </View>
        <View style={styles.sliderContainer}>
          <MultiSlider
            values={[currentIndex]}
            min={0}
            max={DISTANCE_STEPS.length - 1}
            step={1}
            sliderLength={SLIDER_WIDTH}
            onValuesChange={(values) => updateSliderFilter('maxDistance', DISTANCE_STEPS[values[0]])}
            selectedStyle={styles.selectedTrack}
            unselectedStyle={styles.unselectedTrack}
            trackStyle={styles.track}
            markerStyle={styles.marker}
            pressedMarkerStyle={styles.pressedMarker}
            customMarker={CustomMarker}
            snapped
          />
        </View>
      </View>
    );
  };

  // Get gender display text
  const getGenderText = () => {
    switch (filters.gender) {
      case 'men': return t('filters.gender.men');
      case 'women': return t('filters.gender.women');
      default: return t('filters.gender.all');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>{t('filters.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('filters.title')}</Text>
            <TouchableOpacity onPress={resetFilters} activeOpacity={0.7}>
              <Text style={styles.resetText}>{t('filters.reset')}</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Gender */}
            {renderSelectRow(t('filters.gender.title'), getGenderText(), () => {
              const genders = ['all', 'men', 'women'];
              const currentIndex = genders.indexOf(filters.gender);
              const nextIndex = (currentIndex + 1) % genders.length;
              updateFilter('gender', genders[nextIndex]);
            })}

            {/* Age Range - Single line with two thumbs */}
            {renderRangeSlider(t('filters.ageRange'), 'minAge', 'maxAge', 18, 80, '')}

            {/* Verified Photos Only */}
            {renderToggleRow(
              t('filters.verifiedOnly'),
              filters.verifiedPhotosOnly,
              (value) => updateFilter('verifiedPhotosOnly', value),
              <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            )}

            <View style={styles.divider} />

            {/* Activity Filter Tabs */}
            {renderActivityTabs()}

            <View style={styles.divider} />

            {/* Mini Map */}
            <View style={styles.mapContainer}>
              {locationLoading ? (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator size="large" color="#2D2D2D" />
                  <Text style={styles.mapPlaceholderText}>{t('filters.location.loading')}</Text>
                </View>
              ) : userLocation ? (
                <Image
                  source={{
                    uri: `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${userLocation.longitude},${userLocation.latitude}&z=14&l=map&size=650,300&pt=${userLocation.longitude},${userLocation.latitude},pm2blm`,
                  }}
                  style={styles.mapImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.mapPlaceholderText}>{t('filters.location.unavailable')}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={loadUserLocation}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryButtonText}>{t('filters.location.enableLocation')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Distance - Worldwide range up to 20,037 km (half Earth circumference) */}
            {renderDistanceSlider(t('filters.distance'), t('filters.km'))}

            <View style={styles.divider} />

            {/* Premium Search Section */}
            {renderSectionHeader(t('filters.premium.title'))}
            {renderMemberTypeTabs()}

            {/* Height - Single line with two thumbs */}
            {renderRangeSlider(t('filters.height'), 'minHeight', 'maxHeight', 100, 220, t('filters.cm'))}

            {/* Weight - Single line with two thumbs */}
            {renderRangeSlider(t('filters.weight'), 'minWeight', 'maxWeight', 30, 150, t('filters.kg'))}

            <View style={styles.divider} />

            {/* Lifestyle Filters */}
            {renderSelectRow(t('filters.lifestyle.noChildren'), filters.noChildren === 'any' ? t('filters.lifestyle.any') : filters.noChildren, () => {
              const options = ['any', 'yes', 'no'];
              const currentIndex = options.indexOf(filters.noChildren);
              const nextIndex = (currentIndex + 1) % options.length;
              updateFilter('noChildren', options[nextIndex]);
            })}

            {renderSelectRow(t('filters.lifestyle.wantsChildren'), filters.wantsChildren === 'any' ? t('filters.lifestyle.any') : filters.wantsChildren, () => {
              const options = ['any', 'yes', 'no'];
              const currentIndex = options.indexOf(filters.wantsChildren);
              const nextIndex = (currentIndex + 1) % options.length;
              updateFilter('wantsChildren', options[nextIndex]);
            })}

            {renderSelectRow(t('filters.lifestyle.education'), (() => {
              const eduLabels = { 'any': t('filters.lifestyle.any'), 'High School': t('filters.lifestyle.highSchool'), 'Bachelor': t('filters.lifestyle.bachelor'), 'Master': t('filters.lifestyle.master'), 'PhD': t('filters.lifestyle.phd') };
              return eduLabels[filters.education] || t('filters.lifestyle.any');
            })(), () => {
              const options = ['any', 'High School', 'Bachelor', 'Master', 'PhD'];
              const currentIndex = options.indexOf(filters.education);
              const nextIndex = (currentIndex + 1) % options.length;
              updateFilter('education', options[nextIndex]);
            })}

            {/* Bottom Padding */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeText: {
    fontSize: 16,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  resetText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1F2937',
  },
  // Map Container
  mapContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mapImage: {
    width: '100%',
    height: 130,
  },
  mapPlaceholder: {
    height: 130,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Sliders
  sliderSection: {
    marginVertical: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderValue: {
    fontSize: 16,
    color: '#2D2D2D',
    fontWeight: '600',
  },
  sliderValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderBadge: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  sliderBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  // Multi Slider Styles
  selectedTrack: {
    backgroundColor: '#2D2D2D',
  },
  unselectedTrack: {
    backgroundColor: '#E5E7EB',
  },
  track: {
    height: 4,
    borderRadius: 2,
  },
  marker: {
    backgroundColor: '#2D2D2D',
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#2D2D2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pressedMarker: {
    backgroundColor: '#1A1A1A',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  // Custom Marker
  customMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2D2D2D',
  },
});
