# 🔔 Bildirim Sistemi Kurulum Rehberi

Bu proje **hem local hem de push notification** desteğine sahiptir.

## 📱 Şu An (Development - Expo Go)

✅ **Local notifications** aktif ve çalışıyor
- Expo Go'da test edilebilir
- Tüm bildirim tipleri destekleniyor
- 9 dil desteği (İngilizce, Türkçe, İspanyolca, Portekizce, Fransızca, Endonezce, Tayca, Arapça, Rusça)

## 🚀 Production'a Geçiş (3 Adım)

### Adım 1: EAS Project ID Ekle

```bash
# EAS CLI kur (henüz yoksa)
npm install -g eas-cli

# EAS'e giriş yap
eas login

# Project ID al
eas init
```

`app.config.js` dosyasında project ID'yi ekle:

```javascript
extra: {
  eas: {
    projectId: "your-actual-project-id-here" // Buraya gerçek ID'yi yaz
  }
}
```

### Adım 2: Build Al

```bash
# iOS için
eas build --platform ios

# Android için
eas build --platform android

# Her ikisi için
eas build --platform all
```

### Adım 3: Backend Entegrasyonu

`AuthContext.js` dosyasında login sonrası token kaydet:

```javascript
import NotificationService from '../services/NotificationService';
import api from '../services/api';

// Login başarılı olduktan sonra
const token = NotificationService.getPushToken();
if (token) {
  await api.post('/users/push-token', {
    push_token: token,
    platform: Platform.OS
  });
}

// Logout olurken
await api.delete('/users/push-token', {
  data: { push_token: token }
});
```

## 📋 Kullanım Örnekleri

### Yeni Mesaj Bildirimi

```javascript
import NotificationService from '../services/NotificationService';

// Socket'ten mesaj geldiğinde
socket.on('new_message', (data) => {
  NotificationService.showMessageNotification({
    senderName: data.sender.name,
    messageContent: data.message,
    matchId: data.match_id,
    senderPhoto: data.sender.photo
  });
});
```

### Eşleşme Bildirimi

```javascript
// Yeni eşleşme olduğunda
NotificationService.showMatchNotification({
  userName: matchedUser.name,
  matchId: match.id,
  userPhoto: matchedUser.photo
});
```

### Beğeni Bildirimi

```javascript
// Biri profili beğendiğinde
NotificationService.showLikeNotification({
  userName: user.name,
  userId: user.id,
  userPhoto: user.photo
});
```

### Profil Ziyareti Bildirimi

```javascript
// Biri profili ziyaret ettiğinde
NotificationService.showProfileVisitNotification({
  userName: visitor.name,
  userId: visitor.id,
  userPhoto: visitor.photo
});
```

### Favori Ekleme Bildirimi

```javascript
// Biri favorilere eklediğinde
NotificationService.showFavoriteNotification({
  userName: user.name,
  userId: user.id,
  userPhoto: user.photo
});
```

### El Sallama Bildirimi

```javascript
// Biri el salladığında
NotificationService.showWaveNotification({
  userName: user.name,
  userId: user.id,
  userPhoto: user.photo
});
```

### Shake Eşleşme Bildirimi

```javascript
// Shake ile eşleşme olduğunda
NotificationService.showShakeMatchNotification({
  userName: user.name,
  userId: user.id,
  userPhoto: user.photo
});
```

## 🌍 Çoklu Dil Desteği

Tüm bildirimler otomatik olarak kullanıcının seçtiği dile göre gösterilir:

```javascript
// Türkçe kullanıcı için:
"💕 Eşleşme! Ahmet ile karşılıklı beğendiniz!"

// İngilizce kullanıcı için:
"💕 It's a Match! You and Ahmet liked each other!"

// İspanyolca kullanıcı için:
"💕 ¡Es un Match! ¡Tú y Ahmet se gustaron mutuamente!"
```

## 🎯 Bildirim Tipleri

| Tip | Açıklama | Kanal (Android) |
|-----|----------|-----------------|
| `new_message` | Yeni mesaj geldi | messages |
| `new_match` | Karşılıklı beğeni | matches |
| `like_received` | Profil beğenildi | matches |
| `profile_visit` | Profil ziyaret edildi | interactions |
| `favorite_added` | Favorilere eklendi | interactions |
| `wave_received` | El sallama | interactions |
| `shake_match` | Shake eşleşmesi | matches |

## 🔧 Faydalı Metodlar

### Badge Yönetimi

```javascript
// Badge sayısını ayarla
await NotificationService.setBadgeNumber(5);

// Badge sayısını artır
await NotificationService.incrementBadge();

// Badge'i temizle
await NotificationService.clearBadge();

// Mevcut badge sayısını al
const count = await NotificationService.getBadgeNumber();
```

### Bildirim Temizleme

```javascript
// Tüm zamanlanmış bildirimleri iptal et
await NotificationService.cancelAllNotifications();

// Tüm gösterilen bildirimleri kapat
await NotificationService.dismissAllNotifications();
```

### Servis Bilgileri

```javascript
// Servis yapılandırıldı mı?
const isConfigured = NotificationService.isConfigured();

// Push token al
const token = NotificationService.getPushToken();

// Sadece local notification mu kullanılıyor?
const isLocal = NotificationService.isLocalOnly();
```

## 🧪 Test Etme

### Expo Go'da Test

```bash
npm start
# Ardından Expo Go uygulamasında aç
```

Test için NotificationService metodlarını çağırabilirsiniz:

```javascript
// Test butonu ekle
<TouchableOpacity onPress={() => {
  NotificationService.showMatchNotification({
    userName: 'Test User',
    matchId: '123',
    userPhoto: 'https://example.com/photo.jpg'
  });
}}>
  <Text>Test Match Notification</Text>
</TouchableOpacity>
```

### Production Build'de Test

1. Build al (yukarıdaki Adım 2)
2. Cihaza yükle
3. Uygulamayı arka plana al
4. Backend'den push notification gönder

## 📱 Backend Push Notification Gönderme

Backend'inizde Expo Push Notification API kullanarak bildirim gönderin:

```javascript
// Node.js örneği
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const sendPushNotification = async (pushToken, title, body, data) => {
  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    badge: 1,
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log('Push notification sent:', ticket);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Kullanım
await sendPushNotification(
  userPushToken,
  '💕 Eşleşme!',
  'Ahmet ile karşılıklı beğendiniz!',
  { type: 'new_match', match_id: '123' }
);
```

## 🔐 İzinler

### iOS

`ios.infoPlist.UIBackgroundModes` zaten yapılandırılmış ✅

### Android

Gerekli tüm izinler `android.permissions` içinde ✅

## ⚙️ Konfigürasyon Dosyaları

- ✅ `app.config.js` - EAS yapılandırması
- ✅ `src/services/NotificationService.js` - Ana servis
- ✅ `src/i18n/locales/*.js` - 9 dil desteği
- ✅ Android notification channels otomatik oluşturuluyor

## 🎨 Özelleştirme

### Android Notification Icon

`assets/notification-icon.png` dosyasını değiştir (96x96 px, beyaz-transparan)

### Notification Ses

`assets/notification-sound.wav` dosyasını değiştir

### Bildirim Rengi

`app.config.js` içinde `notification.color` değiştir (varsayılan: #E94057)

## 🐛 Sorun Giderme

### "Must use physical device for push notifications"

✅ Normal - Expo Go'da push notifications çalışmaz, sadece local notifications çalışır
✅ Production build alarak gerçek cihazda test edin

### "Project ID not found"

❌ `app.config.js` dosyasında `extra.eas.projectId` ekleyin

### Bildirimler gelmiyor

1. ✅ İzinler verilmiş mi kontrol edin
2. ✅ App arka planda mı? (Local notifications ön plandayken gösterilmez)
3. ✅ Push token backend'e kaydedilmiş mi?
4. ✅ Backend doğru token'a gönderiyor mu?

## 📚 Ek Kaynaklar

- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)

## ✨ Özet

- 🟢 **Şu an:** Local notifications Expo Go'da çalışıyor
- 🔵 **Production:** Sadece 3 adımda push notifications aktif olacak
- 🌍 **9 dil desteği** otomatik
- 🎯 **7 bildirim tipi** hazır
- 📱 **Backend entegrasyonu** için kod hazır (sadece yorum satırlarını kaldır)

Herhangi bir sorun olursa bana ulaşın! 🚀
