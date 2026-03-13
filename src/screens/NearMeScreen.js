import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nearbyAPI, swipeAPI, userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import SocketService from '../services/SocketService';
import eventEmitter, { EVENTS } from '../utils/EventEmitter';
import DynamicHeader from '../components/DynamicHeader';
import OnlineStatusDot from '../components/OnlineStatusDot';
import FiltersModal, { getStoredFilters } from '../components/FiltersModal';
import CustomAlert from '../components/CustomAlert';
import PremiumModal from '../components/PremiumModal';
import { NotificationContext } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function NearMeScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const isDark = isDarkMode; // For backward compatibility
  const { t } = useLanguage();
  const { showCustomNotification } = useContext(NotificationContext);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [gridColumns, setGridColumns] = useState(3); // 2 or 3 columns
  const [searchQuery, setSearchQuery] = useState('');
  const [likedUsers, setLikedUsers] = useState(new Set()); // Track liked users
  const [dislikedUsers, setDislikedUsers] = useState(new Set()); // Track disliked users
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [animatingUsers, setAnimatingUsers] = useState(new Map()); // Track animating users with their Animated.Value
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });

  useEffect(() => {
    // Load filters once on mount and cache them
    const initializeScreen = async () => {
      const storedFilters = await getStoredFilters();
      loadNearbyUsers(storedFilters);
    };

    initializeScreen();

    const handleFiltersChanged = async () => {
      console.log('🔄 Filters changed, reloading Near Me users...');
      setUsers([]);
      setLoading(true);
      const storedFilters = await getStoredFilters();
      loadNearbyUsers(storedFilters);
    };

    // Register socket listeners
    SocketService.on('user_online', ({ userId }) => {
      console.log('🟢 User online in NearMe:', userId);
      setOnlineUsers((prev) => new Set([...prev, userId]));
    }, 'NearMeScreen');

    SocketService.on('user_offline', ({ userId }) => {
      console.log('🔴 User offline in NearMe:', userId);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }, 'NearMeScreen');

    eventEmitter.on(EVENTS.FILTERS_CHANGED, handleFiltersChanged);

    return () => {
      eventEmitter.off(EVENTS.FILTERS_CHANGED, handleFiltersChanged);

      // Cleanup socket listeners
      console.log('🧹 Cleaning up NearMeScreen socket listeners');
      SocketService.off('user_online', 'NearMeScreen');
      SocketService.off('user_offline', 'NearMeScreen');
    };
  }, []);

  useEffect(() => {
    // Filter users based on search query and disliked users
    let filtered = users.filter(user => !dislikedUsers.has(user.id));

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort users by online status: Online -> Recent (24h) -> Offline
    // Optimize: Cache online status to avoid recalculating in sort
    const userStatusCache = new Map();
    filtered.forEach(user => {
      userStatusCache.set(user.id, getOnlineStatus(user));
    });

    filtered.sort((a, b) => {
      const statusA = userStatusCache.get(a.id);
      const statusB = userStatusCache.get(b.id);

      // Priority: online (0) > recent (1) > offline (2)
      const priorityMap = { online: 0, recent: 1, offline: 2 };
      const priorityA = priorityMap[statusA] || 2;
      const priorityB = priorityMap[statusB] || 2;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same status, sort by last active time (most recent first)
      const lastActiveA = new Date(a.last_active_at || a.last_active || 0);
      const lastActiveB = new Date(b.last_active_at || b.last_active || 0);
      return lastActiveB - lastActiveA;
    });

    setFilteredUsers(filtered);
  }, [searchQuery, users, dislikedUsers, onlineUsers]);

  const loadNearbyUsers = async (cachedFilters = null, loadMore = false) => {
    try {
      // Prevent multiple simultaneous requests
      if (loadMore && loadingMore) return;
      if (loadMore && !hasMore) return;

      if (loadMore) {
        setLoadingMore(true);
      }

      // Load stored filters (use cache if provided)
      const storedFilters = cachedFilters || await getStoredFilters();

      // Convert filter format to API format
      const apiFilters = {
        gender: storedFilters.gender,
        minAge: storedFilters.minAge,
        maxAge: storedFilters.maxAge,
        verifiedPhotosOnly: storedFilters.verifiedPhotosOnly,
        activity: storedFilters.activity,
        searchLocation: storedFilters.searchLocation,
        maxDistance: storedFilters.maxDistance,
        memberType: storedFilters.memberType,
        minHeight: storedFilters.minHeight,
        maxHeight: storedFilters.maxHeight,
        minWeight: storedFilters.minWeight,
        maxWeight: storedFilters.maxWeight,
        noChildren: storedFilters.noChildren,
        wantsChildren: storedFilters.wantsChildren,
        education: storedFilters.education,
        // City search params
        searchCity: storedFilters.searchCity,
        searchCityLat: storedFilters.searchCityCoords?.latitude,
        searchCityLng: storedFilters.searchCityCoords?.longitude,
        // Pagination params
        limit: 20,
        offset: loadMore ? offset : 0,
      };

      console.log('🔍 API filters:', JSON.stringify(apiFilters));
      let { data } = await nearbyAPI.getNearbyUsers(apiFilters);

      // If no users found and not loading more, retry with wider distance
      if (!loadMore && (!data.users || data.users.length === 0)) {
        const distanceFallbacks = [500, 2000, 20037];
        for (const fallbackDistance of distanceFallbacks) {
          if (fallbackDistance <= apiFilters.maxDistance) continue;
          console.log(`📍 No users found, retrying with ${fallbackDistance}km...`);
          const retryResult = await nearbyAPI.getNearbyUsers({ ...apiFilters, maxDistance: fallbackDistance });
          if (retryResult.data.users && retryResult.data.users.length > 0) {
            data = retryResult.data;
            break;
          }
        }
      }

      if (loadMore) {
        // Append new users
        setUsers(prev => [...prev, ...(data.users || [])]);
      } else {
        // Replace users (refresh)
        setUsers(data.users || []);
        setOffset(0);
      }

      setHasMore(data.has_more || false);
      setOffset(data.offset || 0);
    } catch (error) {
      console.error('Failed to load nearby users:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('nearMe.errors.failedToLoad'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 Refreshing nearby users...');
    setOffset(0);
    setHasMore(true);
    const storedFilters = await getStoredFilters();
    await loadNearbyUsers(storedFilters);
  };

  const loadMoreUsers = () => {
    if (!loadingMore && hasMore) {
      console.log('📜 Loading more users...');
      loadNearbyUsers(null, true);
    }
  };

  const getPhotoUrl = (photoUrls) => {
    if (!photoUrls) return null;
    try {
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = photoUrls;
      }

      if (urls && urls.length > 0) {
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      console.log('Error parsing photo URLs:', e);
      return null;
    }
    return null;
  };

  const getOnlineStatus = (user) => {
    // Check real-time online status first
    if (onlineUsers.has(user.id)) {
      return 'online';
    }

    // Check both last_active and last_active_at for compatibility
    const lastActiveField = user.last_active_at || user.last_active;
    if (!lastActiveField) return 'offline';

    const now = new Date();
    const lastActive = new Date(lastActiveField);
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    if (diffMinutes < 5) return 'online'; // Less than 5 mins - green
    if (diffMinutes < 60) return 'recent'; // Less than 1 hour - orange
    return 'offline'; // Red
  };


  const getLastActiveText = (user) => {
    const lastActiveField = user.last_active_at || user.last_active;
    if (!lastActiveField) return t('nearMe.lastActive.longTimeAgo');

    const now = new Date();
    const lastActive = new Date(lastActiveField);
    const diffSeconds = Math.floor((now - lastActive) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Right now (less than 60 seconds)
    if (diffSeconds < 60) return t('nearMe.lastActive.rightNow');

    // 1 to 59 Seconds Ago
    if (diffSeconds < 120) return t('nearMe.lastActive.secondAgo');
    if (diffMinutes < 1) return t('nearMe.lastActive.secondsAgo', { count: diffSeconds });

    // 1 to 59 Minutes Ago
    if (diffMinutes === 1) return t('nearMe.lastActive.minuteAgo');
    if (diffMinutes < 60) return t('nearMe.lastActive.minutesAgo', { count: diffMinutes });

    // 1 to 24 Hours Ago
    if (diffHours === 1) return t('nearMe.lastActive.hourAgo');
    if (diffHours < 24) return t('nearMe.lastActive.hoursAgo', { count: diffHours });

    // 1 to 1 Week Ago (1-6 days)
    if (diffDays === 1) return t('nearMe.lastActive.dayAgo');
    if (diffDays < 7) return t('nearMe.lastActive.daysAgo', { count: diffDays });

    // 1 to 1 Month Ago (1-4 weeks)
    if (diffWeeks === 1) return t('nearMe.lastActive.weekAgo');
    if (diffWeeks < 4) return t('nearMe.lastActive.weeksAgo', { count: diffWeeks });

    // 1 to 1 Year Ago (1-12 months)
    if (diffMonths === 1) return t('nearMe.lastActive.monthAgo');
    if (diffMonths < 12) return t('nearMe.lastActive.monthsAgo', { count: diffMonths });

    // 1 Year+ Ago
    if (diffYears === 1) return t('nearMe.lastActive.yearAgo');
    return t('nearMe.lastActive.yearsAgo', { count: diffYears });
  };

  const handleLike = async (user) => {
    try {
      console.log('💖 Liking user:', user.id);
      const { data } = await swipeAPI.swipe(user.id, 'like');
      setLikedUsers(prev => new Set([...prev, user.id]));

      // Check if it's a match
      if (data.is_match) {
        console.log('🎉 It\'s a match! Navigating to MatchAnimation');

        // Get current user data from AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        const currentUser = userData ? JSON.parse(userData) : { name: 'You', photo_urls: [] };

        // Navigate to Match Animation screen
        navigation.navigate('MatchAnimation', {
          currentUser: {
            name: currentUser.name,
            photo_urls: currentUser.photo_urls,
          },
          matchedUser: {
            id: user.id,
            name: user.name,
            photo_urls: user.photo_urls,
          },
          matchId: data.match_id,
        });
      } else {
        // Show notification banner only if not a match
        showCustomNotification({
          type: 'like_sent',
          name: user.name,
        });
      }

      console.log('✅ User liked successfully');
    } catch (error) {
      console.error('❌ Failed to like user:', error);

      // Handle 409 - already liked this user
      if (error?.response?.status === 409) {
        console.log('ℹ️ Already liked this user, updating UI');
        setLikedUsers(prev => new Set([...prev, user.id]));
        // Silently ignore - user already liked, just update the heart icon
        return;
      }

      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('nearMe.errors.failedToLike'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleDislike = async (userId) => {
    try {
      console.log('👎 Hiding user:', userId);

      // Create animation value
      const fadeAnim = new Animated.Value(1);
      const blurAnim = new Animated.Value(0);

      setAnimatingUsers(prev => new Map(prev).set(userId, { fadeAnim, blurAnim }));

      // Start blur and fade animation
      Animated.parallel([
        Animated.timing(blurAnim, {
          toValue: 10,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After animation, wait a bit then remove the card
        setTimeout(() => {
          setDislikedUsers(prev => new Set([...prev, userId]));
          setAnimatingUsers(prev => {
            const updated = new Map(prev);
            updated.delete(userId);
            return updated;
          });
        }, 400);
      });

      // Send hide API request
      try {
        await userAPI.hideUser(userId);
        console.log('✅ User hidden successfully');

        // Show notification
        showCustomNotification({
          type: 'user_hidden',
          message: t('nearMe.userHidden'),
        });
      } catch (apiError) {
        // If 409 (already hidden), just ignore and complete the animation
        if (apiError?.response?.status === 409) {
          console.log('ℹ️ User already hidden, removing from view');
        } else {
          // For other errors, show alert but still complete animation
          console.error('❌ API error while hiding user:', apiError);
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('nearMe.errors.failedToSync'),
            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
          });
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleDislike:', error);

      // Reset animation on unexpected error
      setAnimatingUsers(prev => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const handleMessagePress = async (user) => {
    try {
      console.log('💬 Creating or getting match for user:', user.id);
      const { data } = await swipeAPI.getOrCreateMatch(user.id);
      console.log('✅ Match data:', data);

      navigation.navigate('Chat', {
        match: {
          match_id: data.match_id,
          user: data.user,
        }
      });
    } catch (error) {
      console.error('❌ Failed to create/get match:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('nearMe.errors.failedToStartChat'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleUserPress = (user) => {
    console.log('User pressed:', user.name);
    navigation.navigate('UserProfileView', { userId: user.id, user });
  };

  const handleFilterPress = () => {
    setShowFiltersModal(true);
  };

  const getItemWidth = () => {
    const padding = 2; // Left and right padding
    const gap = 2; // Gap between items
    if (gridColumns === 2) {
      return (width - padding * 2 - gap) / 2;
    }
    return (width - padding * 2 - gap * 2) / 3;
  };

  const renderUserCard = (user) => {
    const photoUrl = getPhotoUrl(user.photo_urls);
    const onlineStatus = getOnlineStatus(user);
    const lastActiveText = getLastActiveText(user);
    const itemWidth = getItemWidth();
    const firstName = user.name.split(' ')[0];
    const isLiked = likedUsers.has(user.id) || user.has_liked; // Check both local state and backend
    const isDisliked = dislikedUsers.has(user.id);
    const isAnimating = animatingUsers.has(user.id);
    const animation = animatingUsers.get(user.id);
    const hasMatch = user.match_id !== null;

    return (
      <Animated.View
        key={user.id}
        style={[
          styles.userCard,
          isDark && styles.userCardDark,
          { width: itemWidth },
          isAnimating && {
            opacity: animation.fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => handleUserPress(user)}
          activeOpacity={0.9}
          disabled={isAnimating}
        >
          {/* Photo */}
          <View style={[styles.photoContainer, isDark && styles.photoContainerDark]}>
            {photoUrl ? (
              <Animated.Image
                source={{ uri: photoUrl }}
                style={[
                  styles.userImage,
                  isDisliked && { opacity: 0.3 }
                ]}
                blurRadius={isAnimating ? 10 : isDisliked ? 10 : 0}
              />
            ) : (
              <Animated.View style={[
                styles.placeholderImage,
                isDark && styles.placeholderImageDark,
                isDisliked && { opacity: 0.3 }
              ]}>
                <Text style={[styles.placeholderText, isDark && styles.placeholderTextDark]}>{user.name[0]}</Text>
              </Animated.View>
            )}
            {/* Disliked overlay */}
            {(isDisliked || isAnimating) && (
              <View style={styles.dislikedOverlay}>
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={[styles.userInfo, isDark && styles.userInfoDark]}>
            {/* Name with online status */}
            <View style={styles.nameRow}>
              <OnlineStatusDot status={onlineStatus} size={8} style={styles.onlineIndicator} />
              <Text style={[styles.userName, isDark && styles.userNameDark]} numberOfLines={1}>
                {firstName}
              </Text>
            </View>

            {/* Age, Gender, Location */}
            <Text style={[styles.userDetails, isDark && styles.userDetailsDark]} numberOfLines={1}>
              {user.age || '?'} · {['female', 'f', 'woman'].includes(user.gender?.toLowerCase()) ? 'F' : 'M'} · {user.location_city || 'Bangkok'}
            </Text>

            {/* Last Active Status */}
            <Text style={[styles.rightNowText, isDark && styles.rightNowTextDark]}>{lastActiveText}</Text>

            {/* Horizontal divider */}
            <View style={[styles.horizontalDivider, isDark && styles.horizontalDividerDark]} />

            {/* Like/Unlike buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDislike(user.id);
                }}
                activeOpacity={0.7}
                disabled={isDisliked || isAnimating}
              >
                <Ionicons name="close" size={32} color={isDisliked || isAnimating ? "#4B5563" : (isDark ? "#3A3A3A" : "#E0E0E0")} />
              </TouchableOpacity>

              {/* Vertical divider */}
              <View style={[styles.verticalDivider, isDark && styles.verticalDividerDark]} />

              <TouchableOpacity
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (hasMatch || isLiked) {
                    handleMessagePress(user);
                  } else {
                    handleLike(user);
                  }
                }}
                activeOpacity={0.7}
                disabled={isDisliked || isAnimating}
              >
                {hasMatch || isLiked ? (
                  <Ionicons name="mail" size={32} color="#2773ff" />
                ) : (
                  <Ionicons name="heart-outline" size={32} color="#fa1170" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <DynamicHeader
          title={t('nearMe.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightIcons={[
            {
              name: 'funnel',
              onPress: handleFilterPress,
              size: 26,
              color: isDark ? '#9CA3AF' : '#6B7380',
            },
            {
              name: 'view-grid',
              iconSet: 'MaterialCommunityIcons',
              onPress: () => setGridColumns(2),
              size: 26,
              color: gridColumns === 2 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7380'),
              isActive: gridColumns === 2,
            },
            {
              name: 'apps',
              iconSet: 'MaterialCommunityIcons',
              onPress: () => setGridColumns(3),
              size: 26,
              color: gridColumns === 3 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7380'),
              isActive: gridColumns === 3,
            },
          ]}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa1170" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>{t('nearMe.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Dynamic Header with Grid Toggles */}
      <DynamicHeader
        title={t('nearMe.title')}
        showHamburger={true}
        navigation={navigation}
        onPremiumPress={() => setShowPremiumModal(true)}
        rightIcons={[
          {
            name: 'funnel',
            onPress: handleFilterPress,
            size: 26,
            color: isDark ? '#9CA3AF' : '#6B7380',
          },
          {
            name: 'view-grid',
            iconSet: 'MaterialCommunityIcons',
            onPress: () => setGridColumns(2),
            size: 26,
            color: gridColumns === 2 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7380'),
            isActive: gridColumns === 2,
          },
          {
            name: 'apps',
            iconSet: 'MaterialCommunityIcons',
            onPress: () => setGridColumns(3),
            size: 26,
            color: gridColumns === 3 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7380'),
            isActive: gridColumns === 3,
          },
        ]}
      />

      {/* Username Search */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <Ionicons name="search" size={20} color={isDark ? '#6B7280' : '#FFFFFF'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder={t('nearMe.searchPlaceholder')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          includeFontPadding={false}
          textAlignVertical="center"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle-outline" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Users Grid - Infinite Scroll */}
      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => renderUserCard(item)}
        keyExtractor={(item) => item.id}
        numColumns={gridColumns}
        key={gridColumns} // Force re-render when columns change
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={gridColumns > 1 ? styles.columnWrapper : null}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#fa1170']}
            tintColor="#fa1170"
            title={t('nearMe.pullToRefresh')}
            titleColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
              {searchQuery ? t('nearMe.noUsersFound') : t('nearMe.noUsers')}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#fa1170" />
            </View>
          ) : null
        }
        onEndReached={loadMoreUsers}
        onEndReachedThreshold={0.5}
      />

      {/* Filters Modal */}
      <FiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
      />

      {/* CustomAlert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />

      {/* Premium Modal */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingTextDark: {
    color: '#9CA3AF',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainerDark: {
    backgroundColor: '#dbdbdb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
    paddingVertical: 0,
  },
  searchInputDark: {
    color: '#1F2937',
  },

  // Grid
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },

  // User Card
  userCard: {
    backgroundColor: '#141414',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCardDark: {
    backgroundColor: '#e7e7e7',
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1, // Square ratio
    backgroundColor: '#F3F4F6',
    margin: 0,
    padding: 0,
  },
  photoContainerDark: {
    backgroundColor: '#374151',
  },
  userImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImageDark: {
    backgroundColor: '#4B5563',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  placeholderTextDark: {
    color: '#6B7280',
  },
  dislikedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User Info
  userInfo: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 8,
    backgroundColor: '#242424',
  },
  userInfoDark: {
    backgroundColor: '#e7e7e7',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 3,
  },
  onlineIndicator: {
    marginRight: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  userNameDark: {
    color: '#1F2937',
  },
  userDetails: {
    fontSize: 9,
    color: '#B0B0B0',
    marginBottom: 3,
    textAlign: 'center',
  },
  userDetailsDark: {
    color: '#9CA3AF',
  },
  rightNowText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  rightNowTextDark: {
    color: '#6B7280',
  },

  // Dividers
  horizontalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 0,
  },
  horizontalDividerDark: {
    backgroundColor: '#374151',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  verticalDividerDark: {
    backgroundColor: '#374151',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#242424',
  },
  actionButtonDark: {
    backgroundColor: '#e7e7e7',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyTextDark: {
    color: '#9CA3AF',
  },

  // Loading More
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Column wrapper for grid spacing
  columnWrapper: {
    gap: 2, // 2px gap between columns
    marginBottom: 2, // 2px gap between rows
  },
});
