import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { discoveryAPI, swipeAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import eventEmitter, { EVENTS } from '../utils/EventEmitter';
import SocketService from '../services/SocketService';
import MessageSentAlert from '../components/MessageSentAlert';
import FiltersModal, { getStoredFilters } from '../components/FiltersModal';
import CustomAlert from '../components/CustomAlert';
import InteractionBadge from '../components/InteractionBadge';
import PremiumModal from '../components/PremiumModal';
import DynamicHeader from '../components/DynamicHeader';
import { useInteraction } from '../context/InteractionContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.15; // Lower threshold for easier swiping
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Lower velocity threshold for quick swipes

const enrichProfilesWithCity = async (profiles) => {
  const enriched = await Promise.all(
    profiles.map(async (p) => {
      if (p.location_city || !p.location_lat || !p.location_lng) return p;
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: parseFloat(p.location_lat),
          longitude: parseFloat(p.location_lng),
        });
        const city = geocode[0]?.city || geocode[0]?.district || geocode[0]?.subregion || geocode[0]?.region || null;
        const country = geocode[0]?.country || null;
        return { ...p, location_city: city, location_country: country };
      } catch {
        return p;
      }
    })
  );
  return enriched;
};

export default function DiscoveryScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMessageSentAlert, setShowMessageSentAlert] = useState(false);
  const [messageSentUser, setMessageSentUser] = useState(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });

  // Use global interaction context
  const { interactionCount, markAsRead } = useInteraction();

  // Create styles early - must be before any conditional returns
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const position = useRef(new Animated.ValueXY()).current;

  // Radial refresh animation
  const radialAnim1 = useRef(new Animated.Value(0)).current;
  const radialAnim2 = useRef(new Animated.Value(0)).current;
  const radialAnim3 = useRef(new Animated.Value(0)).current;
  const radialFadeAnim = useRef(new Animated.Value(0)).current;

  // Track if this is the first mount (to avoid double load)
  const isFirstMount = useRef(true);

  const loadCurrentUserPhoto = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.photo_urls) {
          let photoUrls;
          if (typeof userData.photo_urls === 'string') {
            photoUrls = JSON.parse(userData.photo_urls);
          } else {
            photoUrls = userData.photo_urls;
          }
          if (photoUrls && photoUrls.length > 0) {
            const photoUrl = MEDIA_BASE_URL + photoUrls[0];
            setCurrentUserPhoto(photoUrl);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load current user photo:', error);
    }
  };

  // OPTIMIZATION: Prefetch more profiles when running low
  const prefetchMoreProfiles = async () => {
    if (isPrefetching) {
      console.log('⏳ Already prefetching, skipping...');
      return;
    }

    try {
      setIsPrefetching(true);
      console.log('🔄 Prefetching more profiles...');

      const storedFilters = await getStoredFilters();
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
        searchCity: storedFilters.searchCity,
        searchCityLat: storedFilters.searchCityCoords?.latitude,
        searchCityLng: storedFilters.searchCityCoords?.longitude,
      };

      const { data } = await discoveryAPI.getQueue(apiFilters);
      console.log(`✅ Prefetched ${data.profiles.length} more profiles`);

      const enriched = await enrichProfilesWithCity(data.profiles);

      // Append new profiles to existing ones
      setProfiles(prevProfiles => {
        // Filter out duplicates based on profile ID
        const existingIds = new Set(prevProfiles.map(p => p.id));
        const newProfiles = enriched.filter(p => !existingIds.has(p.id));
        console.log(`   📦 Added ${newProfiles.length} new unique profiles`);
        return [...prevProfiles, ...newProfiles];
      });
    } catch (error) {
      console.error('❌ Prefetch failed:', error);
      // Silently fail - don't interrupt user experience
    } finally {
      setIsPrefetching(false);
    }
  };

  useEffect(() => {
    // ONLY load profiles on FIRST mount
    // Subsequent loads will be handled by useFocusEffect
    console.log('📱 Discovery: Initial mount, loading profiles...');
    loadProfiles();

    // Load current user's photo
    loadCurrentUserPhoto();

    // NOTE: Socket.io connection is handled globally in App.js via SocketService
    // No need for separate connection here
    // Interaction count is now handled by InteractionContext

    const handleFiltersChanged = () => {
      console.log('🔄 Filters changed, reloading Discovery profiles...');
      setCurrentIndex(0);
      setProfiles([]);
      setLoading(true);
      loadProfiles();
    };

    eventEmitter.on(EVENTS.FILTERS_CHANGED, handleFiltersChanged);

    return () => {
      eventEmitter.off(EVENTS.FILTERS_CHANGED, handleFiltersChanged);
    };
  }, []);

  // ====================================================
  // AUTO-REFRESH ON PAGE ENTRY - MANDATORY!
  // ====================================================
  // BUSINESS RULE: Discovery MUST refresh EVERY TIME the page opens
  // This ensures ONLINE users are ALWAYS shown first
  // NO THROTTLING - we need real-time online status!
  // ====================================================
  useFocusEffect(
    useCallback(() => {
      // Skip first mount (already handled by useEffect)
      if (isFirstMount.current) {
        isFirstMount.current = false;
        console.log('📱 Discovery: First mount, skipping duplicate load');
        return;
      }

      // ALWAYS refresh - NO throttling!
      console.log('📱 Discovery: MANDATORY REFRESH on page entry...');

      // Immediate refresh to show ONLINE users first
      (async () => {
        try {
          // Load stored filters
          const storedFilters = await getStoredFilters();

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
          };

          const { data } = await discoveryAPI.getQueue(apiFilters);
          if (data.profiles && data.profiles.length > 0) {
            const enriched = await enrichProfilesWithCity(data.profiles);
            setProfiles(enriched);
            setCurrentIndex(0);
            setCurrentPhotoIndex(0);
            console.log(`✅ Discovery: Refreshed with ${data.profiles.length} profiles`);
            console.log(`   🟢 Online users: ${data.profiles.filter(p => p.is_online).length}`);
            console.log(`   ⚫ Offline users: ${data.profiles.filter(p => !p.is_online).length}`);
          }
        } catch (error) {
          console.error('❌ Discovery: Refresh failed', error);
        }
      })();
    }, [])
  );

  // Socket.io connection is now handled globally in App.js via SocketService
  // No local socket connection needed here

  // Start continuous radial animation when no profiles
  // IMPORTANT: Must be at top level with other hooks
  useEffect(() => {
    const hasProfiles = profiles.length > 0 && currentIndex < profiles.length;

    if (!hasProfiles && !loading) {
      const animation = Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(radialAnim1, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(radialAnim1, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(radialAnim2, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(radialAnim2, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(radialAnim3, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(radialAnim3, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);

      animation.start();

      return () => {
        animation.stop();
      };
    }
  }, [profiles.length, currentIndex, loading, radialAnim1, radialAnim2, radialAnim3]);

  const loadProfiles = async () => {
    const startTime = Date.now();
    try {
      console.log('🔄 loadProfiles: Fetching from backend...');

      // Load stored filters
      const storedFilters = await getStoredFilters();

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
      };

      let { data } = await discoveryAPI.getQueue(apiFilters);
      const loadTime = Date.now() - startTime;
      console.log(`✅ loadProfiles: Received ${data.profiles.length} profiles in ${loadTime}ms`);

      // If no profiles with current filters, retry with defaults WITHOUT clearing saved filters
      if (data.profiles.length === 0) {
        console.log('⚠️ No profiles with current filters, resetting to defaults and retrying...');
        // NOTE: Do NOT remove saved filters here - that would reset NearMe and other screens too
        const defaultFilters = await getStoredFilters();
        const retryFilters = {
          gender: defaultFilters.gender,
          minAge: defaultFilters.minAge,
          maxAge: defaultFilters.maxAge,
          verifiedPhotosOnly: defaultFilters.verifiedPhotosOnly,
          activity: defaultFilters.activity,
          maxDistance: defaultFilters.maxDistance,
          memberType: defaultFilters.memberType,
          minHeight: defaultFilters.minHeight,
          maxHeight: defaultFilters.maxHeight,
          minWeight: defaultFilters.minWeight,
          maxWeight: defaultFilters.maxWeight,
          noChildren: defaultFilters.noChildren,
          wantsChildren: defaultFilters.wantsChildren,
          education: defaultFilters.education,
        };
        const retry = await discoveryAPI.getQueue(retryFilters);
        data = retry.data;
        console.log(`✅ loadProfiles retry: Received ${data.profiles.length} profiles`);
      }

      // Show first 5 profiles
      console.log('📋 First 5 profiles:');
      data.profiles.slice(0, 5).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} - ${p.is_online ? '🟢 ONLINE' : '⚫ OFFLINE'}`);
      });

      const enriched = await enrichProfilesWithCity(data.profiles);
      setProfiles(enriched);
    } catch (error) {
      console.error('❌ loadProfiles: Failed', error);
      // Don't show error alerts during refresh to avoid interrupting user flow
      if (!refreshing) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('discovery.errors.failedToLoad'),
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
      }
    } finally {
      setLoading(false);

      // Fade out the radial overlay smoothly with faster animation
      Animated.timing(radialFadeAnim, {
        toValue: 0,
        duration: 200, // Reduced from 300ms
        useNativeDriver: true,
      }).start(() => {
        setRefreshing(false);
      });
    }
  };

  const handleRefresh = async () => {
    // OPTIMIZATION: Don't wait for animations, load profiles immediately
    setRefreshing(true);
    setCurrentIndex(0);
    setCurrentPhotoIndex(0);

    // Start animations in parallel (non-blocking)
    Animated.timing(radialFadeAnim, {
      toValue: 1,
      duration: 200, // Reduced from 300ms
      useNativeDriver: true,
    }).start();

    // Faster radial animations
    Animated.parallel([
      Animated.sequence([
        Animated.timing(radialAnim1, {
          toValue: 1,
          duration: 600, // Reduced from 1000ms
          useNativeDriver: true,
        }),
        Animated.timing(radialAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(150), // Reduced from 200ms
        Animated.timing(radialAnim2, {
          toValue: 1,
          duration: 600, // Reduced from 1000ms
          useNativeDriver: true,
        }),
        Animated.timing(radialAnim2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(300), // Reduced from 400ms
        Animated.timing(radialAnim3, {
          toValue: 1,
          duration: 600, // Reduced from 1000ms
          useNativeDriver: true,
        }),
        Animated.timing(radialAnim3, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Load profiles immediately (don't wait for animations)
    await loadProfiles();
  };

  const getPhotoUrls = (photoUrls) => {
    if (!photoUrls) return [];
    try {
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = photoUrls;
      }
      return urls.filter(url => url).map(url => MEDIA_BASE_URL + url);
    } catch (e) {
      return [];
    }
  };

  // Online status is now handled by backend via Redis
  // No need for client-side calculation

  const formatDistance = (distance) => {
    if (!distance) return t('discovery.distance.fallback');
    if (distance < 1) {
      return t('discovery.distance.meters', { distance: Math.round(distance * 1000) });
    }
    return t('discovery.distance.kilometers', { distance: Math.round(distance) });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      return;
    }

    if (currentIndex >= profiles.length) {
      return;
    }

    const currentProfile = profiles[currentIndex];
    const messageContent = messageText.trim();

    try {
      setSendingMessage(true);

      // Step 1: Get or create match (this handles both new likes and existing matches)
      console.log('📤 Getting or creating match for:', currentProfile.name);
      const { data: matchData } = await swipeAPI.getOrCreateMatch(currentProfile.id);
      console.log('🎯 Match data:', matchData);

      // Step 2: Send message via WebSocket
      if (SocketService.socket && SocketService.socket.connected) {
        SocketService.socket.emit('send_message', {
          match_id: matchData.match_id,
          content: messageContent,
        });
        console.log('📨 Message sent via WebSocket');

        // Show custom alert
        setMessageSentUser(currentProfile);
        setShowMessageSentAlert(true);

        // Check if this is a new match
        if (matchData.is_new_match) {
          console.log('🎉 New match detected! Showing match animation...');

          // Navigate to match animation
          const userDataStr = await AsyncStorage.getItem('user');
          const currentUser = userDataStr ? JSON.parse(userDataStr) : {};

          navigation.navigate('MatchAnimation', {
            currentUser: {
              name: currentUser.name,
              photo_urls: currentUser.photo_urls,
            },
            matchedUser: {
              name: currentProfile.name,
              photo_urls: currentProfile.photo_urls,
            },
            matchId: matchData.match_id,
          });
        }
      } else {
        console.error('❌ Socket not connected');
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('discovery.errors.connectionLost'),
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
        setSendingMessage(false);
        return;
      }

      // Clear input and move to next profile
      setMessageText('');
      setCurrentIndex(prev => prev + 1);
      setCurrentPhotoIndex(0);
      position.setValue({ x: 0, y: 0 });
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: error.response?.data?.message || t('discovery.errors.failedToSendMessage'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSwipe = useCallback(async (direction) => {
    console.log('🚀 handleSwipe called with direction:', direction);

    // OPTIMISTIC UI: Immediately move to next card for instant feedback
    setIsSwiping(true);

    // Immediately reset position and photo index for next card
    setCurrentPhotoIndex(0);
    position.setValue({ x: 0, y: 0 });

    setProfiles(currentProfiles => {
      setCurrentIndex(currentIdx => {
        console.log('📍 Current state - currentIndex:', currentIdx, 'profiles.length:', currentProfiles.length);

        if (currentIdx >= currentProfiles.length) {
          console.log('⚠️ No more profiles, returning');
          setIsSwiping(false);
          return currentIdx;
        }

        const currentProfile = currentProfiles[currentIdx];
        console.log('👤 Swiping on profile:', currentProfile.name, 'ID:', currentProfile.id);

        // Reset swiping state immediately for instant next card display
        setTimeout(() => {
          setIsSwiping(false);
        }, 100); // Reduced from 300ms to 100ms

        // OPTIMIZATION: Prefetch more profiles when running low (< 3 profiles left)
        const remainingProfiles = currentProfiles.length - (currentIdx + 1);
        if (remainingProfiles < 3) {
          console.log(`🔮 Only ${remainingProfiles} profiles left, prefetching more...`);
          prefetchMoreProfiles();
        }

        // Execute swipe API call in background (non-blocking)
        (async () => {
          try {
            console.log('📡 Calling swipe API in background...');
            const { data } = await swipeAPI.swipe(currentProfile.id, direction);

            console.log('🎯 Swipe API Response:', data);
            console.log('🎯 Is Match?', data.is_match);
            console.log('🎯 Match ID:', data.match_id);

            // Show match animation if matched
            if (data.is_match) {
              // Get current user info from AsyncStorage
              const userDataStr = await AsyncStorage.getItem('user');
              const currentUser = userDataStr ? JSON.parse(userDataStr) : {};

              console.log('🎉 Match detected!');

              // Navigate to match animation screen
              navigation.navigate('MatchAnimation', {
                currentUser: {
                  name: currentUser.name,
                  photo_urls: currentUser.photo_urls,
                },
                matchedUser: {
                  name: currentProfile.name,
                  photo_urls: currentProfile.photo_urls,
                },
                matchId: data.match_id,
              });
            }
          } catch (error) {
            console.error('❌ Swipe API error:', error);
            // Don't show alert for swipe errors to avoid interrupting user flow
            // API will handle retry logic if needed
          }
        })();

        // Move to next card immediately
        return currentIdx + 1;
      });
      return currentProfiles;
    });
  }, [navigation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only activate pan responder if there's significant horizontal movement
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderGrant: () => {
        console.log('🤚 Pan responder granted!');
      },
      onPanResponderMove: (_, gesture) => {
        console.log('👋 Pan responder moving! dx:', gesture.dx);
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        console.log('👆 Pan responder released! dx:', gesture.dx, 'vx:', gesture.vx);

        const hasSwipedRight = gesture.dx > SWIPE_THRESHOLD;
        const hasSwipedLeft = gesture.dx < -SWIPE_THRESHOLD;
        const hasSwipedFastRight = gesture.vx > SWIPE_VELOCITY_THRESHOLD && gesture.dx > 50;
        const hasSwipedFastLeft = gesture.vx < -SWIPE_VELOCITY_THRESHOLD && gesture.dx < -50;

        console.log('📊 Swipe check:', {
          hasSwipedRight,
          hasSwipedLeft,
          hasSwipedFastRight,
          hasSwipedFastLeft,
          threshold: SWIPE_THRESHOLD,
        });

        // Swipe Right (Like)
        if (hasSwipedRight || hasSwipedFastRight) {
          console.log('➡️ SWIPE RIGHT DETECTED!');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Call handleSwipe immediately, don't wait for animation
          handleSwipe('like');
          Animated.spring(position, {
            toValue: { x: width + 100, y: gesture.dy },
            useNativeDriver: false,
            friction: 4,
            tension: 40,
          }).start();
        }
        // Swipe Left (Pass)
        else if (hasSwipedLeft || hasSwipedFastLeft) {
          console.log('⬅️ SWIPE LEFT DETECTED!');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Call handleSwipe immediately, don't wait for animation
          handleSwipe('pass');
          Animated.spring(position, {
            toValue: { x: -width - 100, y: gesture.dy },
            useNativeDriver: false,
            friction: 4,
            tension: 40,
          }).start();
        }
        // Return to center
        else {
          console.log('↩️ Swipe not enough, returning to center');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
            tension: 65,
          }).start();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const scale = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleFilterPress = () => {
    console.log('🎯 Filter button pressed, opening modal...');
    setShowFiltersModal(true);
  };

  const handleHeartPress = async () => {
    navigation.navigate('LikedMe');
    // Mark interactions as read when user opens the page
    await markAsRead();
  };

  const handleUserPress = (user) => {
    console.log('User pressed:', user.name);
    navigation.navigate('UserProfileView', { userId: user.id, user });
  };

  const handleNextPhoto = useCallback(() => {
    if (currentIndex >= profiles.length) return;
    const currentProfile = profiles[currentIndex];
    const photoUrls = getPhotoUrls(currentProfile.photo_urls);
    if (currentPhotoIndex < photoUrls.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  }, [currentIndex, currentPhotoIndex, profiles]);

  const handlePreviousPhoto = useCallback(() => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  }, [currentPhotoIndex]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DynamicHeader
          title={t('discovery.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightIcons={[
            {
              name: 'funnel',
              onPress: handleFilterPress,
              size: 26,
            },
            {
              name: 'bullseye',
              iconSet: 'MaterialCommunityIcons',
              onPress: handleRefresh,
              size: 26,
            },
            {
              name: 'heart',
              onPress: handleHeartPress,
              size: 28,
              color: '#fa1170',
              badge: interactionCount,
              animated: false,
            },
          ]}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('discovery.loading')}</Text>
        </View>

        {/* Filters Modal - Must be included in loading state too */}
        <FiltersModal
          visible={showFiltersModal}
          onClose={() => {
            console.log('🔒 Closing filters modal (loading state)...');
            setShowFiltersModal(false);
            eventEmitter.emit(EVENTS.FILTERS_CHANGED);
          }}
        />
      </SafeAreaView>
    );
  }

  // Check if there are no profiles or we've reached the end
  const hasProfiles = profiles.length > 0 && currentIndex < profiles.length;

  console.log('🔍 Discovery State:', {
    'profiles.length': profiles.length,
    'currentIndex': currentIndex,
    'hasProfiles': hasProfiles
  });

  if (!hasProfiles) {
    console.log('❌ No profiles to show - rendering empty state with radial animation');

    const radial1Scale = radialAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 2.5],
    });
    const radial1Opacity = radialAnim1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.4, 0],
    });

    const radial2Scale = radialAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 2.5],
    });
    const radial2Opacity = radialAnim2.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.4, 0],
    });

    const radial3Scale = radialAnim3.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 2.5],
    });
    const radial3Opacity = radialAnim3.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.4, 0],
    });

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DynamicHeader
          title={t('discovery.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightIcons={[
            {
              name: 'funnel',
              onPress: handleFilterPress,
              size: 26,
            },
            {
              name: 'bullseye',
              iconSet: 'MaterialCommunityIcons',
              onPress: handleRefresh,
              size: 26,
            },
            {
              name: 'heart',
              onPress: handleHeartPress,
              size: 28,
              color: '#fa1170',
              badge: interactionCount,
              animated: false,
            },
          ]}
        />

        {/* Radial Animation - Looking for new users */}
        <View style={styles.radialContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial1Scale }],
                opacity: radial1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial2Scale }],
                opacity: radial2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial3Scale }],
                opacity: radial3Opacity,
              },
            ]}
          />
          <Ionicons name="search" size={48} color={colors.textTertiary} style={styles.radialIcon} />
        </View>

        {/* Filters Modal - Must be included in empty state too */}
        <FiltersModal
          visible={showFiltersModal}
          onClose={() => {
            console.log('🔒 Closing filters modal (empty state)...');
            setShowFiltersModal(false);
            eventEmitter.emit(EVENTS.FILTERS_CHANGED);
          }}
        />
      </SafeAreaView>
    );
  }

  const currentProfile = profiles[currentIndex];
  const photoUrls = getPhotoUrls(currentProfile.photo_urls);
  const currentPhotoUrl = photoUrls[currentPhotoIndex] || null;
  const distance = formatDistance(currentProfile.distance);
  const firstName = currentProfile.name.split(' ')[0];

  // Debug: Log profile data
  console.log('Current Profile DEBUG:', JSON.stringify({
    name: currentProfile.name,
    age: currentProfile.age,
    gender: currentProfile.gender,
    gender_type: typeof currentProfile.gender,
    all_keys: Object.keys(currentProfile),
    photo_urls_raw: currentProfile.photo_urls,
    photo_urls_computed: photoUrls,
    currentPhotoUrl,
    MEDIA_BASE_URL,
  }, null, 2));

  // Get online status with color and text
  const getOnlineStatusInfo = () => {
    // Use backend's is_online field (from Redis - real-time)
    if (currentProfile.is_online === true) {
      return {
        text: t('discovery.online'),
        color: '#10B981', // Green
        show: true
      };
    }

    if (!currentProfile?.last_active_at) {
      return {
        text: t('discovery.offline'),
        color: '#EF4444', // Red
        show: true
      };
    }

    const lastActive = new Date(currentProfile.last_active_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    // Recently active - under 5 minutes (green)
    if (diffMinutes < 5) {
      return {
        text: t('discovery.online'),
        color: '#10B981', // Green
        show: true
      };
    }

    // Active within last hour (orange)
    if (diffMinutes < 60) {
      return {
        text: t('discovery.minutesAgo', { count: diffMinutes }),
        color: '#F59E0B', // Orange
        show: true
      };
    }

    // Active within last 24 hours (orange)
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return {
        text: t('discovery.hoursAgo', { count: diffHours }),
        color: '#F59E0B', // Orange
        show: true
      };
    }

    // Offline - more than 24 hours (red)
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return {
        text: t('discovery.daysAgo', { count: diffDays }),
        color: '#EF4444', // Red
        show: true
      };
    }

    // Very old - just show offline
    return {
      text: t('discovery.offline'),
      color: '#EF4444', // Red
      show: true
    };
  };

  const onlineStatusInfo = getOnlineStatusInfo();

  // Calculate radial animations
  const radial1Scale = radialAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });
  const radial1Opacity = radialAnim1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  const radial2Scale = radialAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });
  const radial2Opacity = radialAnim2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  const radial3Scale = radialAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });
  const radial3Opacity = radialAnim3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  // Re-check hasProfiles in JSX scope to ensure it's accessible
  // Hide elements if swiping or no profiles left
  const showProfileElements = profiles.length > 0 && currentIndex < profiles.length && !isSwiping;

  console.log('🎯 Render State:', {
    'profiles.length': profiles.length,
    'currentIndex': currentIndex,
    'isSwiping': isSwiping,
    'showProfileElements': showProfileElements,
    'hasProfiles (early check)': hasProfiles
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Dynamic Header */}
        <DynamicHeader
          title={t('discovery.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightIcons={[
            {
              name: 'funnel',
              onPress: handleFilterPress,
              size: 26,
            },
            {
              name: 'bullseye',
              iconSet: 'MaterialCommunityIcons',
              onPress: handleRefresh,
              size: 26,
            },
            {
              name: 'heart',
              onPress: handleHeartPress,
              size: 28,
              color: '#fa1170',
              badge: interactionCount,
              animated: false,
            },
          ]}
        />

        {/* Message Sent Alert */}
        {showMessageSentAlert && messageSentUser && (
          <MessageSentAlert
            user={messageSentUser}
            onDismiss={() => {
              setShowMessageSentAlert(false);
              setMessageSentUser(null);
            }}
          />
        )}

      {/* Radial Refresh Animation Overlay */}
      {refreshing && (
        <Animated.View style={[styles.radialContainer, { opacity: radialFadeAnim }]} pointerEvents="none">
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial1Scale }],
                opacity: radial1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial2Scale }],
                opacity: radial2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radialCircle,
              {
                transform: [{ scale: radial3Scale }],
                opacity: radial3Opacity,
              },
            ]}
          />
          <Image
            source={{ uri: currentPhotoUrl || photoUrls[0] }}
            style={styles.radialCenterImage}
          />
        </Animated.View>
      )}

      {/* Profile Card - Only show if there are profiles to display */}
      {showProfileElements && (
        <View style={styles.cardContainer}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                  { scale },
                ],
              },
            ]}
          >
            {/* Photo Container with Navigation */}
            <View style={styles.photoContainer}>
            {currentPhotoUrl ? (
              <Image
                source={{ uri: currentPhotoUrl }}
                style={styles.cardImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            ) : (
              <View style={[styles.cardImage, styles.placeholderContainer]}>
                <Text style={styles.placeholderText}>
                  {currentProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Gradient overlay for better text visibility */}
            <View style={styles.photoOverlay} pointerEvents="box-none">
              {/* Online Tag - Top Left */}
              {onlineStatusInfo.show && (
                <View style={[styles.onlineTag, { backgroundColor: onlineStatusInfo.color }]}>
                  <Text style={styles.onlineTagText}>{onlineStatusInfo.text}</Text>
                </View>
              )}

              {/* Distance - Top Right */}
              {distance && (
                <View style={styles.distanceTag}>
                  <Text style={styles.distanceTagText}>{distance}</Text>
                </View>
              )}

              {/* User Info at Bottom */}
              <TouchableOpacity
                style={styles.photoInfoContainer}
                onPress={() => handleUserPress(currentProfile)}
                activeOpacity={0.8}
              >
                <Text style={styles.photoName}>{currentProfile.name || 'Unknown'}</Text>
                <Text style={styles.photoDetails}>
                  {currentProfile.age || t('discovery.unknownAge')}
                  {t('discovery.separator')}
                  {currentProfile.gender || t('discovery.unknownGender')}
                  {(currentProfile.location_city || currentProfile.location) && (
                    <>
                      {t('discovery.separator')}
                      {currentProfile.location_city || currentProfile.location}
                    </>
                  )}
                  {currentProfile.location_country && (
                    <>
                      {t('discovery.separator')}
                      {currentProfile.location_country === 'Thailand' ? t('discovery.thailand') :
                       currentProfile.location_country.length > 2 ? currentProfile.location_country.substring(0, 2).toUpperCase() :
                       currentProfile.location_country.toUpperCase()}
                    </>
                  )}
                </Text>

                {/* Photo Indicators - Below user info */}
                {photoUrls.length > 1 && (
                  <View style={styles.photoIndicators}>
                    {photoUrls.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicator,
                          index === currentPhotoIndex && styles.indicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Swipe Labels */}
            <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.likeLabelText}>{t('discovery.like')}</Text>
            </Animated.View>

            <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeLabelText}>{t('discovery.nope')}</Text>
            </Animated.View>

            {/* Photo Navigation Buttons */}
            {photoUrls.length > 1 && (
              <>
                <Pressable
                  style={styles.photoNavLeft}
                  onPress={handlePreviousPhoto}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                />
                <Pressable
                  style={styles.photoNavRight}
                  onPress={handleNextPhoto}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                />
              </>
            )}
          </View>
        </Animated.View>
      </View>
      )}

      {/* Action Buttons - Only show if there are profiles to display */}
      {showProfileElements && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // OPTIMIZATION: Call handleSwipe immediately (same as swipe gesture)
              handleSwipe('pass');
              // Animate in parallel for visual feedback
              Animated.spring(position, {
                toValue: { x: -width - 100, y: 0 },
                useNativeDriver: false,
                friction: 4,
                tension: 40,
              }).start();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // OPTIMIZATION: Call handleSwipe immediately (same as swipe gesture)
              handleSwipe('like');
              // Animate in parallel for visual feedback
              Animated.spring(position, {
                toValue: { x: width + 100, y: 0 },
                useNativeDriver: false,
                friction: 4,
                tension: 40,
              }).start();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={32} color="#f80f6e" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.starButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAlertConfig({
                visible: true,
                title: t('discovery.favorite'),
                message: t('discovery.addedToFavorites', { name: currentProfile.name }),
                onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
                onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={32} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input Section - Only show if there are profiles to display */}
      {showProfileElements && (
        <View style={styles.messageSection}>
          {currentUserPhoto ? (
            <Image
              source={{ uri: currentUserPhoto }}
              style={styles.messageAvatar}
            />
          ) : (
            <View style={styles.messageAvatar} />
          )}
          <View style={styles.messageInputContainer}>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: colors.card,
                  color: isDarkMode ? '#FFFFFF' : colors.text,
                  borderColor: colors.border,
                  borderWidth: 1
                }
              ]}
              placeholder={t('discovery.sendMessagePlaceholder', { firstName })}
              placeholderTextColor={colors.textTertiary}
              value={messageText}
              onChangeText={setMessageText}
              editable={!sendingMessage}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sendingMessage || !messageText.trim()}
          >
            <Text style={styles.sendButtonText}>
              {sendingMessage ? t('discovery.sending') : t('discovery.send')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </SafeAreaView>

      {/* Filters Modal - Outside SafeAreaView for proper rendering */}
      {console.log('🔍 Discovery: showFiltersModal =', showFiltersModal)}
      <FiltersModal
        visible={showFiltersModal}
        onClose={() => {
          console.log('🔒 Closing filters modal...');
          setShowFiltersModal(false);
        }}
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
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  reloadButton: {
    backgroundColor: '#f80f6e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  radialContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  radialCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#f80f6e',
  },
  radialCenterImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#f80f6e',
  },
  radialCenterContent: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    minWidth: 200,
    minHeight: 200,
  },
  radialIcon: {
    position: 'absolute',
  },
  radialText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  photoContainer: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#f80f6e',
  },
  photoIndicators: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  indicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  onlineTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    // backgroundColor is dynamic, set via inline style
  },
  onlineTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  distanceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  distanceTagText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  photoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  photoName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  photoDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoDetails: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  likeLabel: {
    position: 'absolute',
    top: 100,
    right: 30,
    transform: [{ rotate: '20deg' }],
    borderWidth: 5,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  likeLabelText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 2,
  },
  nopeLabel: {
    position: 'absolute',
    top: 100,
    left: 30,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 5,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nopeLabelText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 32,
    backgroundColor: 'transparent',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    // No border for pass button
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#f80f6e',
    shadowOpacity: 0.3,
  },
  starButton: {
    // No border for star button
  },
  photoNavLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 120, // Leave space for photoInfoContainer (approx height)
    width: '40%',
    zIndex: 10,
  },
  photoNavRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 120, // Leave space for photoInfoContainer (approx height)
    width: '60%',
    zIndex: 10,
  },
  messageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  messageAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  messageInputContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  messageInput: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#f80f6e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
