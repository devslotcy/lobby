# 🔔 Notification Test Guide

Bu rehber, notification sistemini Expo Go üzerinde test etmeniz için hazırlanmıştır.

## ✅ Ne Değişti?

### 1. Hata Düzeltildi
- **Önceki Durum**: `expo-notifications` hatası görünüyordu
- **Yeni Durum**: Hata kaldırıldı, notification handler `configure()` sırasında ayarlanıyor

### 2. Test Araçları Eklendi
- **NotificationTestHelper**: Tüm bildirimleri test etmek için helper
- **NotificationTestScreen**: Görsel test ekranı

## 🚀 Hızlı Başlangıç

### Adım 1: Test Ekranını Navigation'a Ekleyin

App.js veya navigation dosyanıza ekleyin:

```javascript
import NotificationTestScreen from './src/screens/NotificationTestScreen';

// Stack Navigator'ınıza ekleyin:
<Stack.Screen
  name="NotificationTest"
  component={NotificationTestScreen}
  options={{ title: 'Test Notifications' }}
/>
```

### Adım 2: Test Ekranını Açın

Navigation'da bir buton veya link ile test ekranına gidin:

```javascript
navigation.navigate('NotificationTest');
```

### Adım 3: Test Edin!

1. **"Initialize Service"** butonuna basın
2. İstediğiniz test butonuna basın
3. **HOME tuşuna basın** (uygulamayı arka plana alın)
4. Bildirimi görün! 🎉

## 📱 Expo Go'da Çalışan Özellikler

✅ **ÇALIŞIR** (Expo Go'da test edilebilir):
- Local notifications (yerel bildirimler)
- Bildirim sesleri
- Bildirim badge'leri
- Bildirim tıklama eventi
- Android notification channels
- Tüm bildirim tipleri (message, match, like, vb.)

❌ **ÇALIŞMAZ** (Development build gerektirir):
- Remote push notifications (uzak bildirimler)
- Push token kaydetme
- Backend'den gelen bildirimler

## 🧪 Manuel Test

Kendi kodunuzdan test etmek için:

```javascript
import NotificationService from './src/services/NotificationService';

// 1. Service'i başlatın (App.js'te bir kez)
await NotificationService.configure(
  (notification) => {
    console.log('Bildirim alındı:', notification);
  },
  (notification, response) => {
    console.log('Bildirime tıklandı:', notification);
    // Kullanıcıyı ilgili ekrana yönlendirin
  }
);

// 2. Test bildirimi gönderin
await NotificationService.showMessageNotification({
  senderName: 'Ahmet',
  messageContent: 'Merhaba! Nasılsın?',
  matchId: '123',
  senderPhoto: 'https://example.com/photo.jpg'
});

// 3. Uygulamayı arka plana alın
// 4. Bildirimi görün!
```

## 🎯 Bildirim Tipleri

### 1. Message Notification
```javascript
await NotificationService.showMessageNotification({
  senderName: 'Ahmet',
  messageContent: 'Selam!',
  matchId: '123',
  senderPhoto: 'url'
});
```

### 2. Match Notification
```javascript
await NotificationService.showMatchNotification({
  userName: 'Ayşe',
  matchId: '456',
  userPhoto: 'url'
});
```

### 3. Like Notification
```javascript
await NotificationService.showLikeNotification({
  userName: 'Mehmet',
  userId: '789',
  userPhoto: 'url'
});
```

### 4. Profile Visit
```javascript
await NotificationService.showProfileVisitNotification({
  userName: 'Zeynep',
  userId: '101',
  userPhoto: 'url'
});
```

### 5. Wave
```javascript
await NotificationService.showWaveNotification({
  userName: 'Can',
  userId: '102',
  userPhoto: 'url'
});
```

### 6. Shake Match
```javascript
await NotificationService.showShakeMatchNotification({
  userName: 'Selin',
  userId: '103',
  userPhoto: 'url'
});
```

## 📛 Badge Management

```javascript
// Badge sayısını ayarla
await NotificationService.setBadgeNumber(5);

// Badge'i artır
await NotificationService.incrementBadge();

// Badge'i temizle
await NotificationService.clearBadge();

// Mevcut badge sayısını al
const count = await NotificationService.getBadgeNumber();
```

## 🔍 Console Logları

Test sırasında console'da şu logları göreceksiniz:

```
🔔 Configuring NotificationService...
✅ Notification permissions granted
✅ Android notification channels created
⚠️ Could not get Expo Push Token (normal in Expo Go)
✅ NotificationService configured successfully
💌 Showing message notification from Ahmet
📬 Notification received: [notification object]
👆 Notification tapped: [response object]
```

## ⚠️ Önemli Notlar

1. **Bildirimler sadece uygulamada ARKA PLANDAYKEN görünür**
   - Foreground'dayken (uygulama açıkken) notification listener tetiklenir ama bildirim gösterilmez
   - Test için mutlaka HOME tuşuna basıp uygulamayı arka plana alın

2. **Expo Go Limitasyonları**
   - Remote push notifications çalışmaz
   - Push token alamazsınız
   - Bu NORMAL ve BEKLENEN bir durumdur
   - Local notifications tamamen çalışır

3. **Production için**
   - Development build oluşturun: `npx expo install expo-dev-client`
   - Build alın: `npx expo run:android` veya `npx expo run:ios`
   - Remote push notifications çalışır hale gelir

## 🐛 Sorun Giderme

### Bildirimler Görünmüyor
- ✅ Service'i initialize ettiniz mi? (`NotificationService.configure()`)
- ✅ İzinleri verdiniz mi?
- ✅ Uygulamayı arka plana aldınız mı?
- ✅ Android'de notification channels oluşturuldu mu?

### "Could not get Expo Push Token" Hatası
- ℹ️ Bu NORMAL bir durumdur Expo Go'da
- ℹ️ Local notifications yine de çalışır
- ℹ️ Development build alırsanız çözülür

### Android'de Ses Gelmiyor
- ✅ Notification channels doğru yapılandırıldı mı?
- ✅ Telefon sessize alınmamış mı?
- ✅ DND (Do Not Disturb) kapalı mı?

## 🎬 Video Test Senaryosu

1. Uygulamayı açın
2. NotificationTest ekranına gidin
3. "Initialize Service" butonuna basın
4. "Test Message Notification" butonuna basın
5. Alert'i kapatın
6. HOME tuşuna basın (uygulamayı minimize edin)
7. 1-2 saniye bekleyin
8. Bildirim gelecek! 🎉
9. Bildirime dokunun
10. Uygulama açılacak ve console'da "Notification tapped" log'unu göreceksiniz

## 📚 Daha Fazla Bilgi

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [NotificationService.js](./src/services/NotificationService.js) - Kaynak kod

## ✨ Başarılar!

Artık notification sisteminiz tamamen test edilebilir durumda. Herhangi bir sorun yaşarsanız console loglarını kontrol edin.
