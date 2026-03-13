# Dating App Mobile - React Native

Dating app'in mobil uygulaması. Expo ile geliştirilmiştir.

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

## 📱 Telefonunda Test Et

1. App Store/Play Store'dan **Expo Go** uygulamasını indir
2. Telefon ve bilgisayarın **aynı WiFi**'ye bağlı olduğundan emin ol
3. `npm start` komutuyla QR kodu göster
4. Expo Go ile QR kodu tara

## ⚙️ Backend Bağlantısı

Backend sunucunun çalıştığından emin ol:

```bash
# Backend dizininde
cd ../date
npm run dev
```

Backend'in IP adresi otomatik olarak ayarlanmıştır: `http://192.168.1.41:3000`

**Farklı bir WiFi ağındaysan:**
`src/config/api.js` dosyasını düzenle ve kendi IP adresini yaz.

## 🎨 Ekranlar

1. **Welcome** - Hoş geldin ekranı
2. **Login** - Giriş yap
3. **Signup** - Kayıt ol
4. **Discovery** - Swipe kartları (Tinder benzeri)
5. **Matches** - Eşleşmeler
6. **Chat** - Real-time mesajlaşma
7. **Profile** - Profil görüntüleme
8. **Edit Profile** - Profil düzenleme

## 📦 Özellikler

- ✅ JWT Authentication
- ✅ Swipe animasyonları (sağa like, sola pass)
- ✅ Real-time mesajlaşma (Socket.io)
- ✅ Match pop-up'ları
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Profile editing
- ✅ Location-based discovery

## 🧪 Test Hesapları

```
Email: john@test.com
Password: password123
Premium: Yes

Email: emily@test.com
Password: password123
Premium: No
```

## 🛠️ Teknolojiler

- React Native
- Expo
- React Navigation
- Socket.io-client
- Axios
- AsyncStorage

## 📝 Notlar

- Backend localhost yerine IP adresi kullanmalı (Expo Go için)
- Telefon ve bilgisayar aynı WiFi'de olmalı
- iOS için simulator kullanabilirsin (localhost çalışır)
- Android için emulator kullanabilirsin (10.0.2.2:3000)
