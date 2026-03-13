import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { t, getLanguage } from '../i18n';

// ============================================================================
// NOTIFICATION CONFIGURATION
// ============================================================================
// This service supports BOTH local and push notifications
//
// IMPORTANT: Expo Go SDK 53+ Changes
// - Local notifications: ✅ Work perfectly in Expo Go (for testing)
// - Push notifications: ❌ Removed from Expo Go in SDK 53
//
// For TESTING in Expo Go:
// - Local notifications will work and are sufficient for testing
// - You'll see a warning about push tokens - this is EXPECTED and OK
//
// For PRODUCTION (Development Build or Standalone App):
// - Both local and remote push notifications will work
// - Push tokens can be obtained and registered with your backend
//
// More info: https://docs.expo.dev/develop/development-builds/introduction/
// ============================================================================

// Configure notification behavior
// Handler is set during configure() to avoid Expo Go SDK 53+ errors on module load

// Notification Types
export const NOTIFICATION_TYPES = {
  // Messages
  NEW_MESSAGE: 'new_message',

  // Matches & Likes
  NEW_MATCH: 'new_match',
  LIKE_RECEIVED: 'like_received',

  // Profile Interactions
  PROFILE_VISIT: 'profile_visit',
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',

  // General
  WAVE_RECEIVED: 'wave_received',
  SHAKE_MATCH: 'shake_match',
};

class NotificationService {
  constructor() {
    this.configured = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.expoPushToken = null;
    this.useLocalOnly = true; // Toggle for development
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Configure notification listeners
   * Call this once when app starts
   */
  configure = async (onNotificationReceived, onNotificationTapped) => {
    if (this.configured) {
      console.log('⚠️ NotificationService already configured');
      return;
    }

    console.log('🔔 Configuring NotificationService...');

    try {
      // Set notification handler (safe to do during configure)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const permissionResult = await this.requestPermissions();

      if (permissionResult.status !== 'granted') {
        console.log('⚠️ Notification permissions not granted');
        this.configured = true;
        return { status: 'permission_denied' };
      }

      // Create Android channels
      if (Platform.OS === 'android') {
        await this.createAndroidChannels();
      }

      // Get Expo Push Token (for production push notifications)
      // This will fail in Expo Go, but that's OK - we'll use local notifications
      try {
        this.expoPushToken = await this.getExpoPushToken();
        this.useLocalOnly = false;
        console.log('📱 Expo Push Token obtained:', this.expoPushToken);
      } catch (error) {
        console.log('⚠️ Could not get Expo Push Token (normal in Expo Go):', error.message);
        this.useLocalOnly = true;
      }

      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📬 Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification tapped:', response);
        if (onNotificationTapped) {
          onNotificationTapped(response.notification, response);
        }
      });

      this.configured = true;
      console.log('✅ NotificationService configured successfully');

      return {
        status: 'granted',
        expoPushToken: this.expoPushToken,
        mode: this.useLocalOnly ? 'local' : 'push'
      };
    } catch (error) {
      console.error('❌ Error configuring NotificationService:', error);
      this.configured = true; // Mark as configured to prevent retries
      return { status: 'error', error: error.message };
    }
  };

  /**
   * Get Expo Push Token for production push notifications
   * NOTE: This will not work in Expo Go - only in production builds
   */
  getExpoPushToken = async () => {
    try {
      // Check if running on a physical device
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        throw new Error('Push tokens require physical device');
      }

      // Try to get Expo push token
      // This will work in standalone APK/IPA builds
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      console.log('✅ Got Expo Push Token:', token.data);
      return token.data;
    } catch (error) {
      // In Expo Go, this will fail - that's expected
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        console.log('⚠️ Push tokens not available in Expo Go - using local notifications only');
      } else {
        console.error('❌ Failed to get push token:', error.message);
      }
      throw new Error(`Failed to get push token: ${error.message}`);
    }
  };

  /**
   * Request notification permissions
   */
  requestPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions denied');
        return { status: 'denied' };
      }

      console.log('✅ Notification permissions granted');
      return { status: 'granted' };
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return { status: 'error', error: error.message };
    }
  };

  /**
   * Create Android notification channels
   */
  createAndroidChannels = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Messages Channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Notifications for new chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E94057',
        enableVibrate: true,
        showBadge: true,
      });

      // Matches Channel
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Matches & Likes',
        description: 'Notifications for new matches and likes',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF006E',
        enableVibrate: true,
        showBadge: true,
      });

      // Profile Interactions Channel
      await Notifications.setNotificationChannelAsync('interactions', {
        name: 'Profile Interactions',
        description: 'Notifications for profile visits, favorites, and waves',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#8A2BE2',
        enableVibrate: true,
        showBadge: true,
      });

      console.log('✅ Android notification channels created');
    } catch (error) {
      console.error('❌ Error creating Android channels:', error);
    }
  };

  // ==========================================================================
  // LOCAL NOTIFICATIONS (Works in Expo Go)
  // ==========================================================================

  /**
   * Show local notification for new message
   */
  showMessageNotification = async ({ senderName, messageContent, matchId, senderPhoto }) => {
    // Skip if app is active (user is already in the app)
    if (AppState.currentState === 'active') {
      console.log('📱 App is active, skipping notification');
      return;
    }

    console.log(`💌 Showing message notification from ${senderName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.newMessage.title', { name: senderName }),
          body: t('notifications.newMessage.body', { message: messageContent }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.NEW_MESSAGE,
            match_id: matchId,
            sender_name: senderName,
            sender_photo: senderPhoto,
          },
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Error showing message notification:', error);
    }
  };

  /**
   * Show local notification for new match
   */
  showMatchNotification = async ({ userName, matchId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`🎉 Showing match notification for ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.newMatch.title'),
          body: t('notifications.newMatch.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.NEW_MATCH,
            match_id: matchId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing match notification:', error);
    }
  };

  /**
   * Show local notification for like received
   */
  showLikeNotification = async ({ userName, userId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`💖 Showing like notification from ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.likeReceived.title'),
          body: t('notifications.likeReceived.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.LIKE_RECEIVED,
            user_id: userId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing like notification:', error);
    }
  };

  /**
   * Show local notification for profile visit
   */
  showProfileVisitNotification = async ({ userName, userId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`👀 Showing profile visit notification from ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.profileVisit.title'),
          body: t('notifications.profileVisit.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.PROFILE_VISIT,
            user_id: userId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing profile visit notification:', error);
    }
  };

  /**
   * Show local notification for favorite added
   */
  showFavoriteNotification = async ({ userName, userId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`⭐ Showing favorite notification from ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.favoriteAdded.title'),
          body: t('notifications.favoriteAdded.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.FAVORITE_ADDED,
            user_id: userId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing favorite notification:', error);
    }
  };

  /**
   * Show local notification for wave received
   */
  showWaveNotification = async ({ userName, userId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`👋 Showing wave notification from ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.waveReceived.title'),
          body: t('notifications.waveReceived.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.WAVE_RECEIVED,
            user_id: userId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing wave notification:', error);
    }
  };

  /**
   * Show local notification for shake match
   */
  showShakeMatchNotification = async ({ userName, userId, userPhoto }) => {
    if (AppState.currentState === 'active') return;
    console.log(`🤝 Showing shake match notification with ${userName}`);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.shakeMatch.title'),
          body: t('notifications.shakeMatch.body', { name: userName }),
          sound: 'default',
          badge: 1,
          data: {
            type: NOTIFICATION_TYPES.SHAKE_MATCH,
            user_id: userId,
            user_name: userName,
            user_photo: userPhoto,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Error showing shake match notification:', error);
    }
  };

  // ==========================================================================
  // BADGE MANAGEMENT
  // ==========================================================================

  /**
   * Set badge number
   */
  setBadgeNumber = async (number) => {
    try {
      await Notifications.setBadgeCountAsync(number);
      console.log(`📛 Badge count set to ${number}`);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  };

  /**
   * Get current badge number
   */
  getBadgeNumber = async () => {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
      return 0;
    }
  };

  /**
   * Increment badge number
   */
  incrementBadge = async () => {
    try {
      await Notifications.setBadgeCountAsync((await Notifications.getBadgeCountAsync()) + 1);
    } catch (error) {
      console.error('❌ Error incrementing badge:', error);
    }
  };

  /**
   * Clear badge
   */
  clearBadge = async () => {
    await this.setBadgeNumber(0);
  };

  // ==========================================================================
  // NOTIFICATION MANAGEMENT
  // ==========================================================================

  /**
   * Cancel all notifications
   */
  cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ All notifications canceled');
    } catch (error) {
      console.error('❌ Error canceling notifications:', error);
    }
  };

  /**
   * Dismiss all delivered notifications
   */
  dismissAllNotifications = async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('🗑️ All notifications dismissed');
    } catch (error) {
      console.error('❌ Error dismissing notifications:', error);
    }
  };

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleanup listeners
   */
  cleanup = () => {
    console.log('🧹 Cleaning up NotificationService');

    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    this.configured = false;
    this.expoPushToken = null;
  };

  // ==========================================================================
  // PRODUCTION PUSH NOTIFICATIONS (Backend Integration)
  // ==========================================================================

  /**
   * Register push token with backend
   * Call this after user logs in and you have a push token
   */
  registerPushToken = async () => {
    if (!this.expoPushToken) {
      console.log('⚠️ No push token available to register');
      return { success: false, reason: 'no_token' };
    }

    try {
      console.log('📤 Registering push token with backend:', this.expoPushToken);

      const { notificationAPI } = require('./api');
      const language = getLanguage();
      await notificationAPI.registerPushToken(this.expoPushToken, Platform.OS, language);

      console.log('✅ Push token registered with backend (language:', language, ')');
      return { success: true, token: this.expoPushToken };
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Unregister push token from backend
   * Call this when user logs out
   */
  unregisterPushToken = async () => {
    if (!this.expoPushToken) {
      console.log('⚠️ No push token to unregister');
      return { success: true };
    }

    try {
      console.log('📤 Unregistering push token from backend');

      const { notificationAPI } = require('./api');
      await notificationAPI.unregisterPushToken(this.expoPushToken);

      console.log('✅ Push token unregistered from backend');
      return { success: true };
    } catch (error) {
      console.error('❌ Error unregistering push token:', error);
      return { success: false, error: error.message };
    }
  };

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  /**
   * Check if service is configured
   */
  isConfigured = () => {
    return this.configured;
  };

  /**
   * Get Expo Push Token
   */
  getPushToken = () => {
    return this.expoPushToken;
  };

  /**
   * Check if using local notifications only
   */
  isLocalOnly = () => {
    return this.useLocalOnly;
  };
}

export default new NotificationService();
