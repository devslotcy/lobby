import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MEDIA_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

export default function MatchModal({ visible, currentUser, matchedUser, onClose, onSendMessage }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Scale and fade in animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const getPhotoUrl = (user) => {
    if (!user?.photo_urls) return null;

    try {
      let urls;
      if (typeof user.photo_urls === 'string') {
        urls = JSON.parse(user.photo_urls);
      } else {
        urls = user.photo_urls;
      }

      if (urls && urls.length > 0) {
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const currentUserPhoto = getPhotoUrl(currentUser);
  const matchedUserPhoto = getPhotoUrl(matchedUser);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: opacityAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.closeArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Match Title */}
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSubtitle}>
            You and {matchedUser?.name || 'this user'} liked each other
          </Text>

          {/* Profile Photos */}
          <View style={styles.photosContainer}>
            {/* Current User Photo */}
            <View style={styles.photoWrapper}>
              {currentUserPhoto ? (
                <Image source={{ uri: currentUserPhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {currentUser?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>

            {/* Heart Icon */}
            <View style={styles.heartContainer}>
              <Ionicons name="heart" size={60} color="#fa1170" />
            </View>

            {/* Matched User Photo */}
            <View style={styles.photoWrapper}>
              {matchedUserPhoto ? (
                <Image source={{ uri: matchedUserPhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {matchedUser?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.sendMessageButton}
              onPress={() => {
                onClose();
                if (onSendMessage) onSendMessage(matchedUser);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepSwipingButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fa1170',
    marginBottom: 8,
    textAlign: 'center',
  },
  matchSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  heartContainer: {
    marginHorizontal: -20,
    zIndex: 10,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  sendMessageButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendMessageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  keepSwipingButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  keepSwipingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
