import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';
import { MEDIA_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

export default function MatchAnimationScreen({ route, navigation }) {
  const { currentUser, matchedUser, matchId } = route.params;
  const { t } = useLanguage();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Particle animations
  const [particles] = useState(
    Array.from({ length: 20 }, () => ({
      x: Math.random() * width, // Static value for left position
      y: useRef(new Animated.Value(height)).current,
      scale: useRef(new Animated.Value(0)).current,
      rotate: useRef(new Animated.Value(0)).current,
    }))
  );

  useEffect(() => {
    StatusBar.setHidden(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start animations
    Animated.sequence([
      // Particles explosion
      Animated.stagger(
        30,
        particles.map((particle) =>
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: Math.random() * height * 0.5,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotate, {
              toValue: Math.random() * 360,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        )
      ),
    ]).start();

    // Main animation sequence
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 15,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(heartAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ),
    ]).start();

    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleSendMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace('Chat', {
      match: {
        match_id: matchId,
        user: {
          name: matchedUser.name,
          photo_urls: matchedUser.photo_urls,
        },
      },
    });
  };

  const getPhotoUrl = (photoUrls) => {
    if (!photoUrls) return null;
    try {
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = Array.isArray(photoUrls) ? photoUrls : [];
      }
      const firstUrl = urls.filter((url) => url)[0];
      return firstUrl ? MEDIA_BASE_URL + firstUrl : null;
    } catch (e) {
      return null;
    }
  };

  const currentUserPhoto = getPhotoUrl(currentUser.photo_urls);
  const matchedUserPhoto = getPhotoUrl(matchedUser.photo_urls);

  const heartScale = heartAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" translucent />
      {/* Animated gradient background */}
      <LinearGradient
        colors={['#f80f6e', '#fa1170', '#8A2387']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
          {/* Rotating gradient overlay */}
          <Animated.View
            style={[
              styles.rotatingGradient,
              {
                transform: [{ rotate }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
              style={styles.gradientCircle}
            />
          </Animated.View>
        </Animated.View>
      </LinearGradient>

      {/* Particles */}
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.x,
              transform: [
                { translateY: particle.y },
                { scale: particle.scale },
                { rotate: particle.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={20} color="rgba(255,255,255,0.8)" />
        </Animated.View>
      ))}

      <SafeAreaView style={styles.content} edges={['top']}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Match Text */}
          <Text style={styles.matchTitle}>{t('matchModal.title')}</Text>
          <Text style={styles.matchSubtitle}>
            {t('matchModal.youAndLiked', { name: matchedUser.name })}
          </Text>

          {/* User Photos */}
          <View style={styles.photosContainer}>
            {/* Current User Photo */}
            <View style={styles.photoWrapper}>
              {currentUserPhoto ? (
                <Image source={{ uri: currentUserPhoto }} style={styles.userPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.placeholderText}>
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Heart Icon */}
            <Animated.View
              style={[
                styles.heartIcon,
                {
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={60} color="#FFFFFF" />
            </Animated.View>

            {/* Matched User Photo */}
            <View style={styles.photoWrapper}>
              {matchedUserPhoto ? (
                <Image source={{ uri: matchedUserPhoto }} style={styles.userPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.placeholderText}>
                    {matchedUser.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.sendMessageButton} onPress={handleSendMessage}>
            <Ionicons name="chatbubble" size={24} color="#f80f6e" />
            <Text style={styles.sendMessageText}>{t('matchModal.sendMessage')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepSwipingButton} onPress={handleClose}>
            <Text style={styles.keepSwipingText}>{t('matchModal.keepSwiping')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f80f6e',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  rotatingGradient: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    left: -width / 2,
    top: -width / 2,
  },
  gradientCircle: {
    flex: 1,
    borderRadius: width,
  },
  particle: {
    position: 'absolute',
    zIndex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  matchSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 60,
    opacity: 0.9,
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  photoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  userPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#FFFFFF',
  },
  photoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 50,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heartIcon: {
    marginHorizontal: -20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionsContainer: {
    gap: 16,
  },
  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  sendMessageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f80f6e',
  },
  keepSwipingButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  keepSwipingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
