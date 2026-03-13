/**
 * ShakeScreen with Premium Subscription Integration
 *
 * INSTRUCTIONS:
 * 1. Backup your existing ShakeScreen.js
 * 2. Replace with this file (rename to ShakeScreen.js)
 * 3. Import SubscriptionProvider in App.js and wrap your app
 *
 * Key Changes:
 * - Added shake limit checking (5 shakes/day for free users)
 * - Shows shake limit banner at top
 * - Shows premium modal when limit reached
 * - Decrements shake count on each shake
 * - Refreshes shake limit when screen focuses
 * - Full Turkish language support with t() function
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfettiCannon from '../components/ConfettiCannon';
import { API_BASE_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import NotificationService from '../services/NotificationService';
import SocketService from '../services/SocketService';
import ShakeLimitBanner from '../components/ShakeLimitBanner';
import PremiumModal from '../components/PremiumModal';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function ShakeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { t } = useLanguage();

  // **NEW**: Subscription context
  const {
    isPremium,
    remainingShakes,
    maxShakes,
    isUnlimited,
    canShake,
    decrementShakeCount,
    refreshShakeLimit,
  } = useSubscription();

  const isFocused = useIsFocused();
  const [isShaking, setIsShaking] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [greenScreenComplete, setGreenScreenComplete] = useState(false);

  // **NEW**: Premium modal state
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Refs
  const shakeSound = useRef(null);
  const matchSound = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastMatchIdRef = useRef(null);
  const isProcessingMatchRef = useRef(false);
  const lastShakeTimeRef = useRef(0);
  const socketListenersSetupRef = useRef(false);
  const cleanupInProgressRef = useRef(false);

  // Animations
  const socketIconScale = useRef(new Animated.Value(0.3)).current;
  const greenScreenOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const handShakeRotate = useRef(new Animated.Value(0)).current;
  const radialPulse = useRef(new Animated.Value(1)).current;
  const matchTitleScale = useRef(new Animated.Value(0)).current;
  const matchTitleRotate = useRef(new Animated.Value(0)).current;
  const photo1Scale = useRef(new Animated.Value(0)).current;
  const photo2Scale = useRef(new Animated.Value(0)).current;
  const heartBurst = useRef(new Animated.Value(0)).current;
  const buttonsSlideUp = useRef(new Animated.Value(100)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const shakeIconVibrate = useRef(new Animated.Value(0)).current;

  // **NEW**: Refresh shake limit when screen focuses
  useEffect(() => {
    if (isFocused && user) {
      refreshShakeLimit();
    }
  }, [isFocused, user, refreshShakeLimit]);

  // Load sounds
  useEffect(() => {
    Promise.all([loadShakeSound(), loadMatchSound()]).catch(err =>
      console.log('⚠️ Failed to load sounds:', err)
    );

    return () => {
      const cleanup = async () => {
        try {
          if (shakeSound.current) {
            await shakeSound.current.stopAsync().catch(() => {});
            await shakeSound.current.unloadAsync().catch(() => {});
            shakeSound.current = null;
          }
          if (matchSound.current) {
            await matchSound.current.stopAsync().catch(() => {});
            await matchSound.current.unloadAsync().catch(() => {});
            matchSound.current = null;
          }
        } catch (err) {
          console.log('⚠️ Sound cleanup error:', err);
        }
      };
      cleanup();
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!user?.id) {
      console.log('⚠️ [ShakeScreen] Waiting for user context before setting up socket listeners');
      return;
    }

    if (socketListenersSetupRef.current) {
      console.log('⚠️ [ShakeScreen] Socket listeners already setup, skipping');
      return;
    }

    setupSocketListeners();
    socketListenersSetupRef.current = true;

    return () => {
      if (!cleanupInProgressRef.current) {
        cleanupInProgressRef.current = true;
        cleanupSocketListeners();
        socketListenersSetupRef.current = false;
        cleanupInProgressRef.current = false;
      }
    };
  }, [user?.id]);

  // Accelerometer setup
  useEffect(() => {
    if (isFocused) {
      startAccelerometer();
    } else {
      radialPulse.stopAnimation();
      matchTitleScale.stopAnimation();
      matchTitleRotate.stopAnimation();
      photo1Scale.stopAnimation();
      photo2Scale.stopAnimation();
      heartBurst.stopAnimation();
      buttonsSlideUp.stopAnimation();
      buttonsOpacity.stopAnimation();
      handShakeRotate.stopAnimation();
      socketIconScale.stopAnimation();
      greenScreenOpacity.stopAnimation();
      contentOpacity.stopAnimation();

      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      isProcessingMatchRef.current = false;
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [isFocused]);

  // Socket animation
  useEffect(() => {
    if (isFocused && SocketService.isConnected() && !isShaking && !matchFound) {
      socketIconScale.setValue(0.3);
      greenScreenOpacity.setValue(0);
      contentOpacity.setValue(0);
      setGreenScreenComplete(false);

      Animated.sequence([
        Animated.timing(socketIconScale, {
          toValue: 20,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setGreenScreenComplete(true);
        Animated.timing(greenScreenOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        });
      });
    }
  }, [isFocused, socketConnected, isShaking, matchFound]);

  const loadShakeSound = async () => {
    try {
      console.log('🔊 Loading shake sound...');

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/shake.wav'),
        {
          shouldPlay: false,
          volume: 1.0,
          isLooping: false,
        }
      );

      await sound.setVolumeAsync(1.0);
      await sound.setStatusAsync({ shouldPlay: false });

      shakeSound.current = sound;
      console.log('✅ Shake sound loaded successfully');
    } catch (error) {
      console.log('❌ Error loading shake sound:', error);
    }
  };

  const loadMatchSound = async () => {
    try {
      console.log('🔊 Loading match sound...');

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/match.wav'),
        {
          shouldPlay: false,
          volume: 1.0,
          isLooping: false,
        }
      );

      await sound.setVolumeAsync(1.0);
      await sound.setStatusAsync({ shouldPlay: false });

      matchSound.current = sound;
      console.log('✅ Match sound loaded successfully');
    } catch (error) {
      console.log('❌ Error loading match sound:', error);
    }
  };

  const playShakeSound = async () => {
    try {
      if (!shakeSound.current) {
        console.log('⚠️ Shake sound not loaded yet');
        return;
      }

      console.log('🔊 Playing shake sound...');

      const status = await shakeSound.current.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await shakeSound.current.stopAsync();
        }

        await shakeSound.current.setPositionAsync(0);
        await shakeSound.current.playAsync();

        console.log('✅ Shake sound playing!');
      } else {
        console.log('❌ Sound not loaded properly');
      }
    } catch (error) {
      console.log('❌ Error playing shake sound:', error);
    }
  };

  const playMatchSound = async () => {
    try {
      if (!matchSound.current) {
        console.log('⚠️ Match sound not loaded yet');
        return;
      }

      console.log('🔊 Playing match sound...');

      const status = await matchSound.current.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await matchSound.current.stopAsync();
        }

        await matchSound.current.setPositionAsync(0);
        await matchSound.current.playAsync();

        console.log('✅ Match sound playing!');
      } else {
        console.log('❌ Match sound not loaded properly');
      }
    } catch (error) {
      console.log('❌ Error playing match sound:', error);
    }
  };

  const setupSocketListeners = () => {
    console.log('🔌 [ShakeScreen] Setting up socket listeners');

    if (SocketService.isConnected()) {
      setSocketConnected(true);
    }

    SocketService.on('connect', () => {
      console.log('🟢 [ShakeScreen] Socket connected');
      setSocketConnected(true);
    }, 'shake');

    SocketService.on('disconnect', (reason) => {
      console.log('🔴 [ShakeScreen] Socket disconnected:', reason);
      setSocketConnected(false);
    }, 'shake');

    SocketService.on('shake_searching', (data) => {
      console.log('🔍 [ShakeScreen] Server acknowledged shake, searching...', data);
    }, 'shake');

    SocketService.on('shake_waiting', (data) => {
      console.log('⏳ [ShakeScreen] Waiting for match...', data);
    }, 'shake');

    SocketService.on('shake_error', (data) => {
      console.error('❌ [ShakeScreen] Shake error from server:', data);
      const errorMsg = typeof data?.error === 'string' ? data.error : JSON.stringify(data);
      if (errorMsg && errorMsg.toLowerCase().includes('in progress')) {
        console.log('⏳ [ShakeScreen] Shake already in progress, continuing to wait...');
      } else {
        resetShaking();
      }
    }, 'shake');

    SocketService.on('shake_match', (data) => {
      console.log('🎉 [ShakeScreen] Shake match received:', JSON.stringify(data, null, 2));

      if (isProcessingMatchRef.current) {
        console.log('⚠️ [ShakeScreen] Match processing already in progress, ignoring');
        return;
      }

      if (!user?.id) {
        console.error('❌ [ShakeScreen] ERROR: No user context available!');
        return;
      }

      if (!data.matched_user?.id) {
        console.error('❌ [ShakeScreen] ERROR: No matched_user in data!');
        return;
      }

      if (data.matched_user.id === user.id) {
        console.log('⚠️ [ShakeScreen] Ignoring event - matched_user is self');
        return;
      }

      if (lastMatchIdRef.current === data.match_id) {
        console.log('⚠️ [ShakeScreen] Duplicate match event ignored');
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        return;
      }

      isProcessingMatchRef.current = true;
      lastMatchIdRef.current = data.match_id;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      radialPulse.stopAnimation();

      playMatchSound().catch(err => console.log('⚠️ Match sound failed:', err));

      try {
        NotificationService.showMatchNotification(
          data.matched_user.name,
          data.match_id
        );
      } catch (err) {
        console.log('⚠️ Notification failed:', err);
      }

      setMatchedUser(data.matched_user);
      setMatchData(data);
      setIsShaking(false);
      setMatchFound(true);

      // Match animation sequence
      Animated.sequence([
        Animated.parallel([
          Animated.spring(matchTitleScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(matchTitleRotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.stagger(200, [
          Animated.spring(photo1Scale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(photo2Scale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartBurst, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(shakeIconVibrate, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(shakeIconVibrate, {
                toValue: -1,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(shakeIconVibrate, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
              }),
            ]),
            { iterations: 7 }
          ),
        ]),
        Animated.parallel([
          Animated.spring(buttonsSlideUp, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(buttonsOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        isProcessingMatchRef.current = false;
      });
    }, 'shake');
  };

  const cleanupSocketListeners = () => {
    console.log('🧹 [ShakeScreen] Cleaning up socket listeners');
    SocketService.off('connect', 'shake');
    SocketService.off('disconnect', 'shake');
    SocketService.off('shake_searching', 'shake');
    SocketService.off('shake_waiting', 'shake');
    SocketService.off('shake_error', 'shake');
    SocketService.off('shake_match', 'shake');
  };

  const startAccelerometer = () => {
    console.log('🎯 [ShakeScreen] Starting accelerometer');
    Accelerometer.setUpdateInterval(150);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (matchFound || isShaking) {
        return;
      }

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (acceleration > 3.0 && !isShaking && !matchFound && now - lastShakeTimeRef.current > 1500) {
        console.log('🔥 [ShakeScreen] Shake threshold exceeded!');
        lastShakeTimeRef.current = now;
        handleShake();
      }
    });
    setSubscription(sub);
  };

  // **MODIFIED**: handleShake with shake limit check
  const handleShake = async () => {
    console.log('🔵 [ShakeScreen] handleShake called with subscription check');

    // Guard clauses
    if (isShaking || matchFound || isProcessingMatchRef.current) {
      console.log('⚠️ [ShakeScreen] Shake ignored: already processing');
      return;
    }

    // **NEW**: Check shake limit for free users
    if (!canShake()) {
      console.log('❌ [ShakeScreen] Shake limit reached');
      showToast(t('shake.errors.dailyLimitReached'), 3000, '⚠️');
      setShowPremiumModal(true);
      return;
    }

    // Check socket connection
    if (!SocketService.isConnected()) {
      console.error('❌ [ShakeScreen] Cannot shake: Socket not connected!');
      showToast(t('shake.errors.connectionLost'), 2000, '⚠️');
      return;
    }

    console.log('📱 [ShakeScreen] Shake detected! Sending to server...');

    setIsShaking(true);
    isProcessingMatchRef.current = true;

    // **NEW**: Optimistically decrement shake count
    decrementShakeCount();

    playShakeSound().catch(err => console.log('⚠️ Sound playback failed:', err));

    // Emit shake event
    try {
      SocketService.emit('shake_event');
      console.log('✅ [ShakeScreen] shake_event emitted successfully');
    } catch (error) {
      console.error('❌ [ShakeScreen] Failed to emit shake event:', error);
      resetShaking();
      showToast(t('shake.errors.failedToShake'), 2000, '❌');
      return;
    }

    startSearchingAnimation();
  };

  const startSearchingAnimation = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(radialPulse, {
          toValue: 2.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(radialPulse, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    searchTimeoutRef.current = setTimeout(() => {
      console.log('⏰ [ShakeScreen] 10 seconds passed, no match found');

      pulseAnimation.stop();
      showToast(t('shake.errors.noUserFound'), 3000, '☹️');

      lastMatchIdRef.current = null;
      isProcessingMatchRef.current = false;

      resetShaking();
    }, 10000);
  };

  const resetShaking = () => {
    setIsShaking(false);
    isProcessingMatchRef.current = false;
    radialPulse.setValue(1);
    handShakeRotate.setValue(0);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  const handleStartChat = () => {
    console.log('💬 [ShakeScreen] Starting chat with match');

    if (!matchData || !matchData.match_id || !matchedUser) {
      console.error('❌ [ShakeScreen] Missing match data or user data');
      showToast(t('shake.errors.errorLoadingMatch'), 2000, '❌');
      resetScreen();
      return;
    }

    try {
      radialPulse.stopAnimation();
      matchTitleScale.stopAnimation();
      matchTitleRotate.stopAnimation();
      photo1Scale.stopAnimation();
      photo2Scale.stopAnimation();
      heartBurst.stopAnimation();
      buttonsSlideUp.stopAnimation();
      buttonsOpacity.stopAnimation();

      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }

      navigation.navigate('Chat', {
        match: {
          match_id: matchData.match_id,
          user: matchedUser,
        },
      });

      setTimeout(() => {
        resetScreen();
      }, 50);
    } catch (err) {
      console.error('❌ [ShakeScreen] Navigation error:', err);
      showToast(t('shake.errors.failedToOpenChat'), 2000, '❌');
      resetScreen();
    }
  };

  const resetScreen = () => {
    console.log('🔄 [ShakeScreen] Resetting screen');

    try {
      matchTitleScale.stopAnimation();
      matchTitleRotate.stopAnimation();
      photo1Scale.stopAnimation();
      photo2Scale.stopAnimation();
      heartBurst.stopAnimation();
      buttonsSlideUp.stopAnimation();
      buttonsOpacity.stopAnimation();
      radialPulse.stopAnimation();
      greenScreenOpacity.stopAnimation();
      contentOpacity.stopAnimation();

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      setMatchFound(false);
      setMatchedUser(null);
      setMatchData(null);
      lastMatchIdRef.current = null;
      isProcessingMatchRef.current = false;

      matchTitleScale.setValue(0);
      matchTitleRotate.setValue(0);
      photo1Scale.setValue(0);
      photo2Scale.setValue(0);
      heartBurst.setValue(0);
      buttonsSlideUp.setValue(100);
      buttonsOpacity.setValue(0);

      greenScreenOpacity.setValue(0);
      contentOpacity.setValue(1);

      resetShaking();

      if (!subscription) {
        console.log('✅ [ShakeScreen] Accelerometer restarted');
        startAccelerometer();
      }
    } catch (err) {
      console.error('❌ [ShakeScreen] Error during reset:', err);
      setMatchFound(false);
      setMatchedUser(null);
      setMatchData(null);
      setIsShaking(false);
      isProcessingMatchRef.current = false;
    }
  };

  const getPhotoUrl = React.useCallback((photoUrls) => {
    if (!photoUrls) return null;
    try {
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = photoUrls;
      }
      if (Array.isArray(urls) && urls.length > 0) {
        return API_BASE_URL.replace('/api', '') + urls[0];
      }
    } catch (e) {
      console.log('⚠️ Photo URL parse error:', e);
      return null;
    }
    return null;
  }, []);

  const handShakeRotation = handShakeRotate.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['-15deg', '15deg', '-15deg', '15deg', '0deg'],
  });

  React.useEffect(() => {
    let shakeAnimation = null;

    if (greenScreenComplete && !isShaking) {
      shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(handShakeRotate, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(handShakeRotate, {
            toValue: 2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(handShakeRotate, {
            toValue: 3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(handShakeRotate, {
            toValue: 4,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
        ])
      );
      shakeAnimation.start();
    }

    return () => {
      if (shakeAnimation) {
        shakeAnimation.stop();
      }
    };
  }, [greenScreenComplete, isShaking, handShakeRotate]);

  // Idle state - waiting for shake or connecting
  if (!isShaking && !matchFound) {
    return (
      <View style={styles.fullScreenContainer}>
        {/* Green dot that expands */}
        {!greenScreenComplete && (
          <Animated.View
            style={[
              styles.socketIconContainer,
              {
                transform: [{ scale: socketIconScale }],
              },
            ]}
          >
            <View style={styles.socketIcon}>
              <Text style={styles.socketIconText}>🟢</Text>
            </View>
          </Animated.View>
        )}

        {/* Full green screen background */}
        {greenScreenComplete && (
          <Animated.View
            style={[
              styles.greenScreenBackground,
              { opacity: greenScreenOpacity },
            ]}
          />
        )}

        {/* **NEW**: Shake Limit Banner - Shows remaining shakes */}
        {greenScreenComplete && !isUnlimited && (
          <ShakeLimitBanner
            remainingShakes={remainingShakes}
            maxShakes={maxShakes}
            onUpgrade={() => setShowPremiumModal(true)}
          />
        )}

        {/* Content (shake hand icon + text) appears after green screen */}
        {greenScreenComplete && (
          <Animated.View
            style={[
              styles.contentContainer,
              { opacity: contentOpacity },
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: handShakeRotation }] }}>
              <Image
                source={require('../../assets/shake-hand.png')}
                style={styles.shakeHandImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={styles.shakeText}>{t('shake.title')}</Text>
            <Text style={styles.shakeSubtext}>
              {t('shake.subtitle')}
            </Text>
          </Animated.View>
        )}

        {/* **NEW**: Premium Modal */}
        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
        />
      </View>
    );
  }

  // Searching state - White shake icon with radial animation
  if (isShaking && !matchFound) {
    return (
      <View style={styles.searchingContainer}>
        {/* Green background stays */}
        <View style={styles.greenScreenBackground} />

        {/* Radial pulse circles */}
        <Animated.View
          style={[
            styles.radialCircle,
            {
              transform: [{ scale: radialPulse }],
              opacity: radialPulse.interpolate({
                inputRange: [1, 2.5],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />

        {/* White shake icon */}
        <View style={styles.shakeIconContainer}>
          <Text style={styles.shakeIcon}>📳</Text>
        </View>
      </View>
    );
  }

  // Match found state
  if (matchFound && matchedUser && isFocused) {
    const userPhotoUrl = user?.photo_urls ? getPhotoUrl(user.photo_urls) : null;
    const matchPhotoUrl = getPhotoUrl(matchedUser.photo_urls);

    const heartScale = heartBurst.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1.3, 1],
    });

    return (
      <View style={styles.matchContainer}>
        {/* Light purple/lavender background */}
        <View style={styles.matchBackground} />

        {/* Confetti Cannon */}
        {isFocused && (
          <ConfettiCannon
            count={150}
            origin={{ x: width / 2, y: -20 }}
            autoStart={true}
            fadeOut={true}
            fallSpeed={2500}
            explosionSpeed={350}
            colors={['#f80f6f', '#ff3d8f', '#FFFFFF', '#E0F7FF', '#87CEEB', '#4A90E2']}
          />
        )}

        {/* Photos Section */}
        <View style={styles.photosSection}>
          {/* Left Photo (Current User) */}
          <Animated.View
            style={[
              styles.photoWrapper,
              styles.photoLeft,
              { transform: [{ scale: photo1Scale }, { rotate: '-24deg' }] },
            ]}
          >
            {userPhotoUrl ? (
              <Image
                source={{ uri: userPhotoUrl }}
                style={styles.matchPhotoNew}
              />
            ) : (
              <View style={[styles.matchPhotoNew, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Right Photo (Matched User) */}
          <Animated.View
            style={[
              styles.photoWrapper,
              styles.photoRight,
              { transform: [{ scale: photo2Scale }, { rotate: '24deg' }] },
            ]}
          >
            {matchPhotoUrl ? (
              <Image
                source={{ uri: matchPhotoUrl }}
                style={styles.matchPhotoNew}
              />
            ) : (
              <View style={[styles.matchPhotoNew, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>
                  {matchedUser?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Shake Badge */}
          <Animated.View
            style={[
              styles.heartBadge,
              { transform: [{ scale: heartScale }] },
            ]}
          >
            <Animated.View
              style={[
                styles.heartCircle,
                {
                  transform: [{
                    rotate: shakeIconVibrate.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-15deg', '0deg', '15deg']
                    })
                  }]
                }
              ]}
            >
              <View style={{ transform: [{ rotate: '-30deg' }] }}>
                <MaterialCommunityIcons name="vibrate" size={38} color="#FFFFFF" />
              </View>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleSection,
            { transform: [{ scale: matchTitleScale }] },
          ]}
        >
          <Text style={styles.congratsText}>{t('shake.newConnection')}</Text>
          <Text style={styles.matchText}>{t('shake.makeAFriend')}</Text>
        </Animated.View>

        {/* Match Info */}
        <View style={styles.matchInfo}>
          <Text style={styles.matchNames}>
            {matchedUser.name}{t('shake.andYou')}
          </Text>
          {matchedUser.distance > 0 && (
            <Text style={styles.distanceText}>
              📍 {matchedUser.distance}{t('shake.kmAway')}
            </Text>
          )}
          {matchedUser.bio && (
            <Text style={styles.bioText} numberOfLines={2}>
              {matchedUser.bio}
            </Text>
          )}
        </View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              transform: [{ translateY: buttonsSlideUp }],
              opacity: buttonsOpacity,
            },
          ]}
        >
          <TouchableOpacity style={styles.sayHelloButton} onPress={handleStartChat}>
            <Text style={styles.waveEmoji}>👋</Text>
            <Text style={styles.sayHelloText}>{t('shake.sayHello')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepShakingButton} onPress={resetScreen}>
            <Text style={styles.keepShakingText}>{t('shake.keepShaking')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  socketIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  socketIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7db343',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socketIconText: {
    fontSize: 50,
  },

  greenScreenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#7db343',
  },

  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  shakeHandImage: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  shakeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  shakeSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7db343',
  },
  radialCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  shakeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shakeIcon: {
    fontSize: 50,
  },

  matchContainer: {
    flex: 1,
    backgroundColor: '#FFF0F6',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  matchBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF0F6',
  },

  photosSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 20,
    zIndex: 10,
  },
  photoWrapper: {
    shadowColor: '#f80f6f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  photoLeft: {
    marginRight: 10,
    zIndex: 1,
  },
  photoRight: {
    marginLeft: 10,
    zIndex: 2,
  },
  matchPhotoNew: {
    width: 130,
    height: 170,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  photoPlaceholder: {
    backgroundColor: '#f80f6f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  heartBadge: {
    position: 'absolute',
    bottom: 20,
    zIndex: 10,
  },
  heartCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#f80f6f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f80f6f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 10,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F1F3D',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  matchText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F1F3D',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  matchInfo: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 30,
  },
  matchNames: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
    position: 'absolute',
    bottom: 60,
  },
  sayHelloButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f80f6f',
    paddingVertical: 18,
    borderRadius: 30,
    width: '100%',
    shadowColor: '#f80f6f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  waveEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  sayHelloText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  keepShakingButton: {
    paddingVertical: 20,
    marginTop: 10,
  },
  keepShakingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f80f6f',
  },
});
