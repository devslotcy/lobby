import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MEDIA_BASE_URL } from '../config/api';
import OnlineStatusDot from './OnlineStatusDot';

const { width } = Dimensions.get('window');

export default function InAppNotification({ visible, notification, onPress, onDismiss, onlineUsers = new Set() }) {
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const autoHideTimer = useRef(null);

  useEffect(() => {
    if (visible && notification) {
      setIsVisible(true);
      // Slide down animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();

      // Auto-hide after 5 seconds
      autoHideTimer.current = setTimeout(() => {
        hideNotification();
      }, 5000);
    } else {
      hideNotification();
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [visible, notification]);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
    hideNotification();
  };

  if (!isVisible || !notification) {
    return null;
  }

  const getPhotoUrl = () => {
    if (!notification.photo_urls) return null;

    try {
      let urls;
      if (typeof notification.photo_urls === 'string') {
        urls = JSON.parse(notification.photo_urls);
      } else {
        urls = Array.isArray(notification.photo_urls) ? notification.photo_urls : [];
      }

      const firstUrl = urls.filter(url => url)[0];
      return firstUrl ? MEDIA_BASE_URL + firstUrl : null;
    } catch (e) {
      return null;
    }
  };

  const photoUrl = getPhotoUrl();
  const isOnline = notification.sender_id && onlineUsers.has(notification.sender_id);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.notification,
          (notification.type === 'like_sent' || notification.type === 'favorite_added' || notification.type === 'favorite_removed' || notification.type === 'user_blocked' || notification.type === 'user_unblocked' || notification.type === 'user_hidden' || notification.type === 'user_unhidden') && styles.notificationCompact
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* User Photo - Only show for message/like notifications, not for action notifications */}
        {notification.type !== 'like_sent' && notification.type !== 'favorite_added' && notification.type !== 'favorite_removed' && notification.type !== 'user_blocked' && notification.type !== 'user_unblocked' && notification.type !== 'user_hidden' && notification.type !== 'user_unhidden' && (
          <View style={styles.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {notification.sender_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {/* Online Indicator */}
            {isOnline && (
              <OnlineStatusDot status="online" size={12} withBorder={true} style={styles.onlineIndicatorContainer} />
            )}
          </View>
        )}

        {/* Icon for action notifications (like_sent, favorite_added, etc) */}
        {(notification.type === 'like_sent' || notification.type === 'favorite_added' || notification.type === 'favorite_removed' || notification.type === 'user_blocked' || notification.type === 'user_unblocked' || notification.type === 'user_hidden' || notification.type === 'user_unhidden') && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={
                notification.type === 'like_sent' ? 'heart' :
                notification.type === 'user_blocked' ? 'ban' :
                notification.type === 'user_unblocked' ? 'checkmark-circle' :
                notification.type === 'user_hidden' ? 'eye-off' :
                notification.type === 'user_unhidden' ? 'eye' :
                'star'
              }
              size={24}
              color={
                notification.type === 'like_sent' ? '#fa1170' :
                notification.type === 'user_blocked' ? '#EF4444' :
                notification.type === 'user_unblocked' ? '#10B981' :
                notification.type === 'user_hidden' ? '#6B7280' :
                notification.type === 'user_unhidden' ? '#10B981' :
                '#FFB800'
              }
            />
          </View>
        )}

        {/* Notification Content */}
        <View style={styles.content}>
          {notification.type === 'like_sent' ? (
            <Text style={styles.message} numberOfLines={1}>
              You liked {notification.name || 'someone'}
            </Text>
          ) : notification.type === 'favorite_added' ? (
            <Text style={styles.message} numberOfLines={1}>
              {notification.name || 'User'} your Favorites
            </Text>
          ) : notification.type === 'favorite_removed' ? (
            <Text style={styles.message} numberOfLines={1}>
              {notification.name || 'User'} Removed
            </Text>
          ) : notification.type === 'user_blocked' ? (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message || 'User has been blocked'}
            </Text>
          ) : notification.type === 'user_unblocked' ? (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message || 'User has been unblocked'}
            </Text>
          ) : notification.type === 'user_hidden' ? (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message || 'User hidden'}
            </Text>
          ) : notification.type === 'user_unhidden' ? (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message || 'User unhidden'}
            </Text>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={1}>
                {notification.name || notification.sender_name || 'Someone'}
              </Text>
              <Text style={styles.message} numberOfLines={1}>
                {notification.type === 'like' ? 'Liked you! 💖' : 'Sent you a message!'}
              </Text>
            </>
          )}
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation();
            hideNotification();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    alignItems: 'center',
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 36,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationCompact: {
    maxWidth: '80%',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fa1170',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    right: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 28,
  },
});
