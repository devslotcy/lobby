# ShakeScreen Integration Guide

## Adım 1: Import Eklemeleri

Dosyanın başına şu import'ları ekleyin:

```javascript
import { useSubscription } from '../context/SubscriptionContext';
import ShakeLimitBanner from '../components/ShakeLimitBanner';
import PremiumModal from '../components/PremiumModal';
```

## Adım 2: Subscription Hook Ekleyin

`export default function ShakeScreen` içinde, `useContext` satırlarından sonra ekleyin:

```javascript
// Subscription context
const {
  isPremium,
  remainingShakes,
  maxShakes,
  isUnlimited,
  canShake,
  decrementShakeCount,
  refreshShakeLimit,
} = useSubscription();

// Premium modal state
const [showPremiumModal, setShowPremiumModal] = useState(false);
```

## Adım 3: Shake Limit Yenileme UseEffect

Socket setup useEffect'lerinden sonra ekleyin:

```javascript
// Refresh shake limit when screen focuses
useEffect(() => {
  if (isFocused && user) {
    refreshShakeLimit();
  }
}, [isFocused, user, refreshShakeLimit]);
```

## Adım 4: handleShake Fonksiyonunu Güncelleyin

Mevcut `handleShake` fonksiyonunun başına ekleyin (guard clause'lardan sonra):

```javascript
const handleShake = () => {
  console.log('🔵 [ShakeScreen] handleShake called with subscription check');

  // Existing guard clauses
  if (isShaking || matchFound || isProcessingMatchRef.current) {
    console.log('⚠️ [ShakeScreen] Shake ignored: already processing');
    return;
  }

  // **NEW**: Check shake limit for free users
  if (!canShake()) {
    console.log('❌ [ShakeScreen] Shake limit reached');
    showToast('Daily shake limit reached. Upgrade to Premium for unlimited shakes!', 3000, '⚠️');
    setShowPremiumModal(true);
    return;
  }

  // Check socket connection
  if (!SocketService.isConnected()) {
    console.error('❌ [ShakeScreen] Cannot shake: Socket not connected!');
    showToast('Connection lost. Reconnecting...', 2000, '⚠️');
    return;
  }

  console.log('📱 [ShakeScreen] Shake detected! Sending to server...');

  setIsShaking(true);
  isProcessingMatchRef.current = true;

  // **NEW**: Optimistically decrement shake count
  decrementShakeCount();

  playShakeSound();
  startSearchAnimation();

  // ... (rest of your existing code)
};
```

## Adım 5: Socket Error Handler Güncellemesi

`setupSocketListeners` fonksiyonunda, shake_error handler'ı bulun ve güncelleyin:

```javascript
const setupSocketListeners = () => {
  // ... existing code ...

  // **UPDATED**: Handle shake_error with limit info
  SocketService.on('shake_error', (data) => {
    console.log('❌ [ShakeScreen] Shake error:', data);

    setIsShaking(false);
    isProcessingMatchRef.current = false;
    radialPulse.stopAnimation();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Handle shake limit error
    if (data.error === 'shake_limit_reached') {
      showToast(data.message || 'Daily shake limit reached!', 3000, '⚠️');
      setShowPremiumModal(true);

      // Refresh shake limit from server
      refreshShakeLimit();
    } else {
      showToast(data.message || 'Shake failed. Please try again.', 2000, '😞');
    }
  });

  // ... rest of your listeners ...
};
```

## Adım 6: Render Kısmını Güncelleyin

Return statement'ınızın içinde, en üste (diğer UI elementlerinden önce) ekleyin:

```javascript
return (
  <View style={styles.container}>
    {/* **NEW**: Shake Limit Banner */}
    {!isUnlimited && !matchFound && (
      <ShakeLimitBanner
        remainingShakes={remainingShakes}
        maxShakes={maxShakes}
        onUpgrade={() => setShowPremiumModal(true)}
      />
    )}

    {/* Your existing UI elements */}
    {/* ... */}

    {/* **NEW**: Premium Modal - add at the end, before closing </View> */}
    <PremiumModal
      visible={showPremiumModal}
      onClose={() => setShowPremiumModal(false)}
      highlightFeature="unlimited_shakes"
    />
  </View>
);
```

## Test Etme

### Test 1: Free User Shake Limit
1. Yeni hesap oluştur
2. 5 kez shake yap
3. 6. shake'de premium modal görmeli
4. Banner'da kalan shake sayısı görünmeli

### Test 2: Premium User
1. Premium account ile giriş yap
2. Banner gösterilmemeli
3. Sınırsız shake yapabilmeli

### Test 3: Daily Reset
1. Bir gün bekle veya veritabanında `daily_shake_limits` tablosundaki date'i değiştir
2. Shake limiti sıfırlanmalı (5'e dönmeli)

## Hata Ayıklama

### Console Logs
```javascript
console.log('Subscription status:', {
  isPremium,
  remainingShakes,
  canShake: canShake(),
});
```

### Backend Log Kontrolü
```bash
# Terminal'de backend loglarını takip edin
tail -f logs/app.log
```

### Database Kontrolü
```sql
-- Kullanıcının subscription durumu
SELECT * FROM user_subscription_status WHERE user_id = 'USER_UUID';

-- Bugünkü shake sayısı
SELECT * FROM daily_shake_limits WHERE user_id = 'USER_UUID' AND date = CURRENT_DATE;
```

## Tamamlandı! 🎉

Artık ShakeScreen'iniz premium subscription sistemiyle entegre!
