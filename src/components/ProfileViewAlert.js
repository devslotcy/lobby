import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MEDIA_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function ProfileViewAlert({ visitor, onDismiss, onPress }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      dismissAlert();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const dismissAlert = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const handlePress = () => {
    dismissAlert();
    if (onPress) onPress(visitor);
  };

  const getPhotoUrl = () => {
    if (!visitor?.photo_urls) return null;

    try {
      let urls;
      if (typeof visitor.photo_urls === 'string') {
        urls = JSON.parse(visitor.photo_urls);
      } else {
        urls = visitor.photo_urls;
      }

      if (urls && urls.length > 0) {
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const photoUrl = getPhotoUrl();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.alertBox}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.content}>
          {/* Profile Photo with Online Badge */}
          <View style={styles.photoWrapper}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {visitor?.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {/* Online Badge */}
            <View style={styles.onlineBadge} />
          </View>

          {/* Message */}
          <View style={styles.textContainer}>
            <Text style={styles.message} numberOfLines={1}>
              <Text style={styles.visitorName}>{visitor?.name || 'Someone'}</Text>
              {' '}viewed your profile
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  alertBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  photoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  textContainer: {
    marginLeft: 12,
    paddingRight: 8,
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  visitorName: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
