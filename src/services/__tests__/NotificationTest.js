/**
 * NotificationService Test Helper
 *
 * Bu dosyayı kullanarak bildirimleri test edebilirsiniz.
 *
 * KULLANIM:
 * 1. App.js veya ana ekranınıza import edin
 * 2. Test butonlarını ekleyin
 * 3. Bildirimleri test edin
 */

import NotificationService from '../NotificationService';

export const NotificationTestHelper = {
  /**
   * Test için notification service'i başlat
   */
  async initialize() {
    console.log('🧪 Initializing NotificationService for testing...');
    const result = await NotificationService.configure(
      (notification) => {
        console.log('📬 Test - Notification received:', notification);
      },
      (notification, response) => {
        console.log('👆 Test - Notification tapped:', notification, response);
      }
    );
    console.log('✅ NotificationService initialized:', result);
    return result;
  },

  /**
   * Tüm bildirim tiplerini test et
   */
  async testAllNotifications() {
    console.log('🧪 Testing all notification types...');

    // 1. Message notification
    await this.testMessageNotification();

    // 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Match notification
    await this.testMatchNotification();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Like notification
    await this.testLikeNotification();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Profile visit notification
    await this.testProfileVisitNotification();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Wave notification
    await this.testWaveNotification();

    console.log('✅ All notifications tested!');
  },

  /**
   * Mesaj bildirimi test et
   */
  async testMessageNotification() {
    console.log('💌 Testing message notification...');
    await NotificationService.showMessageNotification({
      senderName: 'Test User',
      messageContent: 'Hey! How are you? 👋',
      matchId: 'test-match-123',
      senderPhoto: 'https://randomuser.me/api/portraits/women/1.jpg'
    });
  },

  /**
   * Match bildirimi test et
   */
  async testMatchNotification() {
    console.log('🎉 Testing match notification...');
    await NotificationService.showMatchNotification({
      userName: 'Sarah Connor',
      matchId: 'test-match-456',
      userPhoto: 'https://randomuser.me/api/portraits/women/2.jpg'
    });
  },

  /**
   * Like bildirimi test et
   */
  async testLikeNotification() {
    console.log('💖 Testing like notification...');
    await NotificationService.showLikeNotification({
      userName: 'John Doe',
      userId: 'test-user-789',
      userPhoto: 'https://randomuser.me/api/portraits/men/1.jpg'
    });
  },

  /**
   * Profile visit bildirimi test et
   */
  async testProfileVisitNotification() {
    console.log('👀 Testing profile visit notification...');
    await NotificationService.showProfileVisitNotification({
      userName: 'Emma Watson',
      userId: 'test-user-101',
      userPhoto: 'https://randomuser.me/api/portraits/women/3.jpg'
    });
  },

  /**
   * Favorite bildirimi test et
   */
  async testFavoriteNotification() {
    console.log('⭐ Testing favorite notification...');
    await NotificationService.showFavoriteNotification({
      userName: 'Chris Evans',
      userId: 'test-user-102',
      userPhoto: 'https://randomuser.me/api/portraits/men/2.jpg'
    });
  },

  /**
   * Wave bildirimi test et
   */
  async testWaveNotification() {
    console.log('👋 Testing wave notification...');
    await NotificationService.showWaveNotification({
      userName: 'Jennifer Lawrence',
      userId: 'test-user-103',
      userPhoto: 'https://randomuser.me/api/portraits/women/4.jpg'
    });
  },

  /**
   * Shake match bildirimi test et
   */
  async testShakeMatchNotification() {
    console.log('🤝 Testing shake match notification...');
    await NotificationService.showShakeMatchNotification({
      userName: 'Tom Holland',
      userId: 'test-user-104',
      userPhoto: 'https://randomuser.me/api/portraits/men/3.jpg'
    });
  },

  /**
   * Badge test et
   */
  async testBadge() {
    console.log('📛 Testing badge...');

    // Badge'i 5'e ayarla
    await NotificationService.setBadgeNumber(5);
    console.log('Set badge to 5');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Badge'i artır
    await NotificationService.incrementBadge();
    console.log('Incremented badge (should be 6)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Badge'i temizle
    await NotificationService.clearBadge();
    console.log('Cleared badge');
  },

  /**
   * Tüm bildirimleri iptal et
   */
  async cancelAll() {
    console.log('🗑️ Canceling all notifications...');
    await NotificationService.cancelAllNotifications();
    await NotificationService.dismissAllNotifications();
  }
};

export default NotificationTestHelper;
