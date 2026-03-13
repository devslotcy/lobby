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
import { LinearGradient } from 'expo-linear-gradient';
import { MEDIA_BASE_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import NotificationService from '../services/NotificationService';
import SocketService from '../services/SocketService';
import PremiumModal from '../components/PremiumModal';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function ShakeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { t } = useLanguage();
  const {
    subscription: subscriptionStatus,
    isPremium,
    remainingShakes,
    refreshShakeLimit: refreshSubscription
  } = useSubscription();
  const isFocused = useIsFocused();
  const [isShaking, setIsShaking] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [greenScreenComplete, setGreenScreenComplete] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Refs
  const shakeSound = useRef(null);
  const matchSound = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastMatchIdRef = useRef(null);
  const isProcessingMatchRef = useRef(false); // Prevent race conditions
  const lastShakeTimeRef = useRef(0); // For throttling
  const socketListenersSetupRef = useRef(false); // Track listener setup
  const cleanupInProgressRef = useRef(false); // Prevent cleanup race conditions

  // Animations
  const socketIconScale = useRef(new Animated.Value(0.3)).current; // Start small
  const greenScreenOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Logo intro animation
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const lobbyOpacity = useRef(new Animated.Value(0)).current;
  const lobbyTranslateY = useRef(new Animated.Value(20)).current;

  // Animated gradient background
  const gradientAnim = useRef(new Animated.Value(0)).current;

  // Radial glow (idle ekranı için)
  const glowPulse1 = useRef(new Animated.Value(0.3)).current;
  const glowPulse2 = useRef(new Animated.Value(0.3)).current;

  // Floating particles (yıldız/parçacık efekti)
  const particles = useRef(
    Array.from({ length: 6 }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      x: Math.random(),   // 0-1 arası rastgele yatay konum (sabit ref)
      size: 3 + Math.random() * 4, // 3-7px arası boyut
      delay: Math.random() * 3000, // rastgele başlangıç gecikmesi
    }))
  ).current;

  // Hand shake animation (left-right shake)
  const handShakeRotate = useRef(new Animated.Value(0)).current;

  // Search animation - radial pulse
  const radialPulse = useRef(new Animated.Value(1)).current;

  // Match animations - SEXY VERSION
  const matchTitleScale = useRef(new Animated.Value(0)).current;
  const matchTitleRotate = useRef(new Animated.Value(0)).current;
  const photo1Scale = useRef(new Animated.Value(0)).current;
  const photo2Scale = useRef(new Animated.Value(0)).current;
  const heartBurst = useRef(new Animated.Value(0)).current;
  const buttonsSlideUp = useRef(new Animated.Value(100)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const shakeIconVibrate = useRef(new Animated.Value(0)).current;

  // Load shake and match sounds on mount
  useEffect(() => {
    // OPTIMIZATION: Load sounds in parallel
    Promise.all([loadShakeSound(), loadMatchSound()]).catch(err =>
      console.log('⚠️ Failed to load sounds:', err)
    );

    return () => {
      // OPTIMIZATION: Cleanup sounds safely
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

  // Setup socket listeners once on mount - WITH USER DEPENDENCY
  useEffect(() => {
    // Only setup listeners when user is available
    if (!user?.id) {
      console.log('⚠️ [ShakeScreen] Waiting for user context before setting up socket listeners');
      return;
    }

    // OPTIMIZATION: Prevent duplicate listener setup
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
  }, [user?.id]); // Re-setup if user changes

  // Only activate accelerometer when screen is focused
  useEffect(() => {
    if (isFocused) {
      startAccelerometer();
    } else {
      // Stop ALL animations when screen loses focus
      radialPulse.stopAnimation();
      matchTitleScale.stopAnimation();
      matchTitleRotate.stopAnimation();
      photo1Scale.stopAnimation();
      photo2Scale.stopAnimation();
      heartBurst.stopAnimation();
      buttonsSlideUp.stopAnimation();
      buttonsOpacity.stopAnimation();
      handShakeRotate.stopAnimation();
      greenScreenOpacity.stopAnimation();
      contentOpacity.stopAnimation();

      // Stop accelerometer when screen is not focused
      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      // If user was in the middle of a shake search, cancel it on the server
      // and fully reset state so returning to screen starts fresh
      if (isShaking) {
        console.log('🛑 [ShakeScreen] Left screen during shake search - cancelling');
        SocketService.emit('shake_cancel');
        setIsShaking(false);
        radialPulse.setValue(1);
        lastMatchIdRef.current = null;
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

  // Socket icon expand animation when screen is focused AND socket connected
  useEffect(() => {
    if (isFocused && SocketService.isConnected() && !isShaking && !matchFound) {
      // Reset animations first
      greenScreenOpacity.setValue(0);
      contentOpacity.setValue(0);
      logoScale.setValue(1);
      logoOpacity.setValue(1);
      logoTranslateY.setValue(0);
      lobbyOpacity.setValue(0);
      lobbyTranslateY.setValue(20);
      setGreenScreenComplete(false);

      // Step 1: Logo yavaşça solar (fade out)
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        // Step 2: Gradient ekran açılır
        setGreenScreenComplete(true);
        Animated.timing(greenScreenOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // Step 3: LOBBY + el ikonu + içerik gelir
          Animated.parallel([
            Animated.timing(lobbyOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(lobbyTranslateY, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    }
  }, [isFocused, socketConnected, isShaking, matchFound]);

  const loadShakeSound = async () => {
    try {
      console.log('🔊 Loading shake sound...');

      // OPTIMIZATION: Only set audio mode once
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

      // OPTIMIZATION: Pre-load sound into memory
      await sound.setVolumeAsync(1.0);
      await sound.setStatusAsync({ shouldPlay: false });

      shakeSound.current = sound;
      console.log('✅ Shake sound loaded successfully');
    } catch (error) {
      console.log('❌ Error loading shake sound:', error);
      // Non-fatal - app continues without sound
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

      // OPTIMIZATION: Pre-load sound into memory
      await sound.setVolumeAsync(1.0);
      await sound.setStatusAsync({ shouldPlay: false });

      matchSound.current = sound;
      console.log('✅ Match sound loaded successfully');
    } catch (error) {
      console.log('❌ Error loading match sound:', error);
      // Non-fatal - app continues without sound
    }
  };

  const playShakeSound = async () => {
    try {
      if (!shakeSound.current) {
        console.log('⚠️ Shake sound not loaded yet');
        return;
      }

      console.log('🔊 Playing shake sound...');

      // Check if sound is already playing
      const status = await shakeSound.current.getStatusAsync();

      if (status.isLoaded) {
        // Stop if playing
        if (status.isPlaying) {
          await shakeSound.current.stopAsync();
        }

        // Reset position and play
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

    // Update socket connected state
    if (SocketService.isConnected()) {
      setSocketConnected(true);
    }

    // Listen for connection status changes
    SocketService.on('connect', () => {
      console.log('🟢 [ShakeScreen] Socket connected');
      setSocketConnected(true);
    }, 'shake');

    SocketService.on('disconnect', (reason) => {
      console.log('🔴 [ShakeScreen] Socket disconnected:', reason);
      setSocketConnected(false);
    }, 'shake');

    // Shake-specific events
    SocketService.on('shake_searching', (data) => {
      console.log('🔍 [ShakeScreen] Server acknowledged shake, searching...', data);
    }, 'shake');

    SocketService.on('shake_waiting', (data) => {
      console.log('⏳ [ShakeScreen] Waiting for match...', data);
    }, 'shake');

    SocketService.on('shake_error', (data) => {
      console.error('❌ [ShakeScreen] Shake error from server:', data);
      // Don't reset if it's "shake in progress" - just wait
      const errorMsg = typeof data?.error === 'string' ? data.error : JSON.stringify(data);
      if (errorMsg && errorMsg.toLowerCase().includes('in progress')) {
        console.log('⏳ [ShakeScreen] Shake already in progress, continuing to wait...');
        // Keep the searching animation going
      } else if (data?.error === 'shake_limit_reached') {
        // Shake limit reached - only show modal for non-premium users
        resetShaking();
        refreshSubscription();

        if (!isPremium) {
          setShowPremiumModal(true);
          showToast(t('shake.errors.dailyLimitReached'), 3000, '🚫');
        }
      } else {
        // For other errors, reset
        resetShaking();
      }
    }, 'shake');

    SocketService.on('shake_match', (data) => {
      console.log('🎉 [ShakeScreen] Shake match received:', JSON.stringify(data, null, 2));

      // OPTIMIZATION: Use processing flag to prevent race conditions
      if (isProcessingMatchRef.current) {
        console.log('⚠️ [ShakeScreen] Match processing already in progress, ignoring');
        return;
      }

      // CRITICAL: Validate we have user data first
      if (!user?.id) {
        console.error('❌ [ShakeScreen] ERROR: No user context available!');
        console.error('   Cannot validate match - waiting for user data');
        return;
      }

      // CRITICAL: Validate matched_user FIRST before any processing
      if (!data.matched_user?.id) {
        console.error('❌ [ShakeScreen] ERROR: No matched_user in data!');
        console.error('   Data received:', JSON.stringify(data, null, 2));
        return;
      }

      // CRITICAL FIX: Backend sends TWO events for each match (one per user)
      // We must ONLY process the event where matched_user is NOT current user
      if (data.matched_user.id === user.id) {
        console.log('⚠️ [ShakeScreen] Ignoring event - matched_user is self (backend broadcast issue)');
        console.log('   Waiting for correct event with actual match...');
        // Don't update lastMatchIdRef - allow the correct event to be processed
        return;
      }

      // PREVENT DUPLICATE PROCESSING - Use match_id to prevent duplicates
      if (lastMatchIdRef.current === data.match_id) {
        console.log('⚠️ [ShakeScreen] Duplicate match event ignored (same match_id)');

        // CRITICAL: Still clear timeout even for duplicates
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        return;
      }

      // OPTIMIZATION: Set processing flag
      isProcessingMatchRef.current = true;

      // Store this match_id to prevent duplicates
      lastMatchIdRef.current = data.match_id;

      console.log('📸 [ShakeScreen] Current user from context:', {
        id: user?.id,
        name: user?.name,
        gender: user?.gender,
        photo_urls: user?.photo_urls
      });
      console.log('📸 [ShakeScreen] Matched user from socket:', {
        id: data.matched_user?.id,
        name: data.matched_user?.name,
        gender: data.matched_user?.gender,
        photo_urls: data.matched_user?.photo_urls
      });

      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Stop animations
      radialPulse.stopAnimation();

      // OPTIMIZATION: Play sound without blocking
      playMatchSound().catch(err => console.log('⚠️ Match sound failed:', err));

      // NOTE: Push notification is sent by backend automatically
      // No need for local notification here

      // Backend sends 'matched_user', not 'user'
      setMatchedUser(data.matched_user);
      setMatchData(data);
      setIsShaking(false);
      setMatchFound(true);

      // 🎉 SEXY MATCH ANIMATION SEQUENCE 🎉
      Animated.sequence([
        // 1. Title explosion
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
        // 2. Photos zoom in with delay
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
        // 3. Heart burst + Shake icon vibration
        Animated.parallel([
          Animated.timing(heartBurst, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          // Shake icon vibration for 2 seconds
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
            { iterations: 7 } // 7 iterations * 300ms = ~2.1 seconds
          ),
        ]),
        // 4. Buttons slide up
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
        // OPTIMIZATION: Reset processing flag after animations complete
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
    console.log('🎯 [ShakeScreen] Starting accelerometer - v2.0');
    // OPTIMIZATION: Set reasonable update interval (was 100ms, now 150ms for battery)
    Accelerometer.setUpdateInterval(150);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // Don't listen to shake when match is found or already shaking
      if (matchFound || isShaking) {
        return;
      }

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // OPTIMIZATION: More reasonable throttle - 1.5 seconds instead of 2
      // Higher threshold (3.0) to avoid accidental triggers
      if (acceleration > 3.0 && !isShaking && !matchFound && now - lastShakeTimeRef.current > 1500) {
        console.log('🔥 [ShakeScreen] Shake threshold exceeded!', {
          acceleration,
          timeSinceLastShake: now - lastShakeTimeRef.current
        });
        lastShakeTimeRef.current = now;
        handleShake();
      }
    });
    setSubscription(sub);
  };

  const handleShake = async () => {
    console.log('🔵 [ShakeScreen] handleShake called - v2.0');

    // OPTIMIZATION: Guard clauses for fast exit
    if (isShaking || matchFound || isProcessingMatchRef.current) {
      console.log('⚠️ [ShakeScreen] Shake ignored: already processing', {
        isShaking,
        matchFound,
        isProcessing: isProcessingMatchRef.current
      });
      return;
    }

    // Check shake limit FIRST (skip for premium users)
    if (!isPremium && remainingShakes !== null && remainingShakes <= 0) {
      console.log('⚠️ [ShakeScreen] Shake limit reached!');
      showToast(t('shake.errors.dailyLimitReached'), 3000, '🚫');
      setShowPremiumModal(true);
      return;
    }

    // Check if socket is connected
    if (!SocketService.isConnected()) {
      console.error('❌ [ShakeScreen] Cannot shake: Socket not connected!');
      showToast('Connection lost. Reconnecting...', 2000, '⚠️');
      return;
    }

    console.log('📱 [ShakeScreen] Shake detected! Socket connected');
    console.log('📱 [ShakeScreen] Current user ID from context:', user?.id);
    console.log('📱 [ShakeScreen] Remaining shakes:', remainingShakes);

    setIsShaking(true);
    lastShakeTimeRef.current = Date.now();

    // Play shake sound effect (non-blocking)
    playShakeSound().catch(err => console.log('⚠️ Sound playback failed:', err));

    // Emit shake event
    try {
      SocketService.emit('shake_event');
      console.log('✅ [ShakeScreen] shake_event emitted successfully');

      // Refresh subscription status after shake to update remaining count
      setTimeout(() => {
        refreshSubscription();
      }, 1000);
    } catch (error) {
      console.error('❌ [ShakeScreen] Failed to emit shake event:', error);
      resetShaking();
      showToast(t('shake.errors.failedToShake'), 2000, '❌');
      return;
    }

    // Start searching animation immediately
    startSearchingAnimation();
  };

  const startSearchingAnimation = () => {
    // Clear any existing timeout first
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // OPTIMIZATION: Store animation ref to stop it later
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

    // Auto-reset after 10 seconds if no match (just stop, don't retry)
    searchTimeoutRef.current = setTimeout(() => {
      console.log('⏰ [ShakeScreen] 10 seconds passed, no match found');

      // Stop the pulse animation
      pulseAnimation.stop();

      // Show "No user found" toast notification
      showToast(t('shake.errors.noUserFound'), 3000, '☹️');

      // CRITICAL: Reset match ID tracker to allow same user to be matched again
      lastMatchIdRef.current = null;
      isProcessingMatchRef.current = false;

      resetShaking();
    }, 10000);
  };

  const resetShaking = () => {
    setIsShaking(false);
    isProcessingMatchRef.current = false; // Reset processing flag
    radialPulse.setValue(1);
    handShakeRotate.setValue(0);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  const handleStartChat = () => {
    console.log('💬 [ShakeScreen] Starting chat with match:', {
      match_id: matchData?.match_id,
      user: matchedUser,
    });

    // OPTIMIZATION: Validate data before proceeding
    if (!matchData || !matchData.match_id || !matchedUser) {
      console.error('❌ [ShakeScreen] Missing match data or user data');
      showToast(t('shake.errors.errorLoadingMatch'), 2000, '❌');
      resetScreen();
      return;
    }

    try {
      // OPTIMIZATION: Stop all animations and cleanup before navigation
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

      // Navigate immediately without delay for better UX
      navigation.navigate('Chat', {
        match: {
          match_id: matchData.match_id,
          user: matchedUser,
        },
      });

      // Reset screen state after navigation starts
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
    console.log('🔄 [ShakeScreen] Resetting screen - Keep Shaking clicked');

    // OPTIMIZATION: Batch state updates
    try {
      // OPTIMIZATION: Stop all running animations first
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

      // Clear timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      setMatchFound(false);
      setMatchedUser(null);
      setMatchData(null);
      lastMatchIdRef.current = null; // Reset match ID tracker
      isProcessingMatchRef.current = false; // Reset processing flag

      // Reset all match animations
      matchTitleScale.setValue(0);
      matchTitleRotate.setValue(0);
      photo1Scale.setValue(0);
      photo2Scale.setValue(0);
      heartBurst.setValue(0);
      buttonsSlideUp.setValue(100);
      buttonsOpacity.setValue(0);

      // CRITICAL: Reset green screen animations to hide it
      greenScreenOpacity.setValue(1);
      contentOpacity.setValue(1);
      logoOpacity.setValue(0);
      lobbyOpacity.setValue(1);

      resetShaking();

      // CRITICAL: Immediately restart accelerometer for instant shake detection
      // Don't stop the existing subscription - just ensure it's active
      if (!subscription) {
        console.log('✅ [ShakeScreen] Accelerometer restarted, ready to shake again');
        startAccelerometer();
      } else {
        console.log('✅ [ShakeScreen] Accelerometer already active, ready to shake again');
      }
    } catch (err) {
      console.error('❌ [ShakeScreen] Error during reset:', err);
      // Force reset state even if animations fail
      setMatchFound(false);
      setMatchedUser(null);
      setMatchData(null);
      setIsShaking(false);
      isProcessingMatchRef.current = false;
    }
  };

  // OPTIMIZATION: Memoize photo URL parsing
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
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      console.log('⚠️ Photo URL parse error:', e);
      return null;
    }
    return null;
  }, []);

  // Shake animation for the hand icon (left-right rotation)
  const handShakeRotation = handShakeRotate.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['-15deg', '15deg', '-15deg', '15deg', '0deg'],
  });

  // Start continuous shake animation on mount when screen is ready
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
          Animated.delay(2000), // Wait 2 seconds before repeating
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

  // Animated background gradient loop (intro bittikten sonra başlar)
  React.useEffect(() => {
    if (!greenScreenComplete) return;

    const gradientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    );
    gradientLoop.start();

    return () => gradientLoop.stop();
  }, [greenScreenComplete, gradientAnim]);

  // Floating particles animasyonu
  React.useEffect(() => {
    if (!greenScreenComplete) return;

    const { height } = Dimensions.get('window');

    const animations = particles.map((p) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.timing(p.y, {
              toValue: -height,
              duration: 6000 + Math.random() * 4000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(p.opacity, {
                toValue: 0.7,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(p.opacity, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(p.y, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return loop;
    });

    return () => animations.forEach((a) => a.stop());
  }, [greenScreenComplete, particles]);

  // Radial glow animasyonu (idle ekranı)
  React.useEffect(() => {
    if (!greenScreenComplete) return;

    // İlk halka - daha yavaş
    const glow1 = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse1, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse1, {
          toValue: 0.3,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // İkinci halka - offset ile başlar
    const glow2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(glowPulse2, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse2, {
          toValue: 0.3,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    glow1.start();
    glow2.start();

    return () => {
      glow1.stop();
      glow2.stop();
    };
  }, [greenScreenComplete, glowPulse1, glowPulse2]);

  // Idle state - waiting for shake or connecting
  if (!isShaking && !matchFound) {
    return (
      <View style={styles.fullScreenContainer}>
        {/* SHAKE zoom-through intro */}
        {!greenScreenComplete && (
          <Animated.Image
            source={require('../../assets/shake-lobby-logo.png')}
            style={[
              styles.logoImage,
              { opacity: logoOpacity },
            ]}
            resizeMode="contain"
          />
        )}

        {/* Full gradient screen background - animated */}
        <Animated.View
          style={[
            styles.greenScreenBackground,
            { opacity: greenScreenOpacity },
          ]}
        >
          {/* Katman 1: koyu mor → pembe */}
          <LinearGradient
            colors={['#1a0533', '#6b0050', '#c2185b']}
            style={StyleSheet.absoluteFill}
          />
          {/* Katman 2: farklı açı/renk, opacity ile geçiş yapar */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: gradientAnim }]}>
            <LinearGradient
              colors={['#3d0066', '#c2185b', '#ff4081']}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {/* Radial glow halkalar */}
        {greenScreenComplete && (
          <>
            <Animated.View style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: 'rgba(248, 15, 111, 0.12)',
              transform: [{ scale: glowPulse1.interpolate({ inputRange: [0.3, 1], outputRange: [0.5, 2.2] }) }],
              opacity: glowPulse1.interpolate({ inputRange: [0.3, 0.7, 1], outputRange: [0, 0.6, 0] }),
            }} />
            <Animated.View style={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: 'rgba(200, 30, 180, 0.15)',
              transform: [{ scale: glowPulse2.interpolate({ inputRange: [0.3, 1], outputRange: [0.5, 2.2] }) }],
              opacity: glowPulse2.interpolate({ inputRange: [0.3, 0.7, 1], outputRange: [0, 0.5, 0] }),
            }} />
          </>
        )}

        {/* Floating particles */}
        {greenScreenComplete && particles.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${p.x * 90 + 5}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: i % 2 === 0 ? '#ff4081' : '#ffffff',
              opacity: p.opacity,
              transform: [{ translateY: p.y }],
              shadowColor: i % 2 === 0 ? '#ff4081' : '#ffffff',
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }}
          />
        ))}

        {/* Content (el ikonu + yazılar) */}
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

        {/* Premium Modal */}
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
        {/* Gradient background */}
        <LinearGradient
          colors={['#1a0533', '#6b0050', '#c2185b']}
          style={styles.greenScreenBackground}
        />
        <Animated.View style={[styles.greenScreenBackground, { opacity: gradientAnim }]}>
          <LinearGradient
            colors={['#3d0066', '#c2185b', '#ff4081']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Floating particles */}
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${p.x * 90 + 5}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: i % 2 === 0 ? '#ff4081' : '#ffffff',
              opacity: p.opacity,
              transform: [{ translateY: p.y }],
              shadowColor: i % 2 === 0 ? '#ff4081' : '#ffffff',
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }}
          />
        ))}

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

        {/* World icon */}
        <View style={styles.shakeIconContainer}>
          <MaterialCommunityIcons name="earth" size={52} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  // Match found state - MODERN CONFETTI VERSION 🎉
  if (matchFound && matchedUser && isFocused) {
    // DEBUG: Log photo URLs
    console.log('🖼️ [ShakeScreen] Rendering match photos:');
    console.log('   Current User ID:', user?.id, 'Name:', user?.name);
    console.log('   Current User photo_urls:', JSON.stringify(user?.photo_urls));
    console.log('   Matched User ID:', matchedUser?.id, 'Name:', matchedUser?.name);
    console.log('   Matched User photo_urls:', JSON.stringify(matchedUser?.photo_urls));

    const userPhotoUrl = user?.photo_urls ? getPhotoUrl(user.photo_urls) : null;
    const matchPhotoUrl = getPhotoUrl(matchedUser.photo_urls);

    console.log('   👤 User Photo URL:', userPhotoUrl);
    console.log('   💑 Match Photo URL:', matchPhotoUrl);

    const heartScale = heartBurst.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1.3, 1],
    });

    return (
      <View style={styles.matchContainer}>
        {/* Light purple/lavender background */}
        <View style={styles.matchBackground} />

        {/* Confetti Cannon - only when focused */}
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

        {/* Photos Section - Top */}
        <View style={styles.photosSection}>
          {/* Left Photo (Current User) - Rotated left */}
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
                onError={() => console.error('❌ Failed to load current user photo:', userPhotoUrl)}
              />
            ) : (
              <View style={[styles.matchPhotoNew, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Right Photo (Matched User) - Rotated right */}
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
                onError={() => console.error('❌ Failed to load matched user photo:', matchPhotoUrl)}
              />
            ) : (
              <View style={[styles.matchPhotoNew, styles.photoPlaceholder]}>
                <Text style={styles.placeholderText}>
                  {matchedUser?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Shake Badge - Center overlap */}
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

        {/* Say Hello Button */}
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
  // Full screen container for all states
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1a0533',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Logo intro
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShake: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  logoImage: {
    width: 280,
    height: 150,
  },
  lobbyText: {
    fontSize: 22,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 16,
    marginBottom: 40,
  },

  // Green screen background
  greenScreenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#7db343',
  },

  // Content container
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Idle state - shake hand image
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

  // Searching state - White shake icon with radial
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a0533',
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

  // Match state - MODERN CONFETTI VERSION 🎉
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

  // Photos Section
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

  // Heart Badge (Shake Icon)
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

  // Title Section
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

  // Match Info
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

  // Buttons
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
