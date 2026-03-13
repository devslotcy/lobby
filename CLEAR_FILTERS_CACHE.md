# 🧹 Clear Filters Cache

## Problem
Eski `gender: 'all'` değeri AsyncStorage'da kalmış durumda.

## Solution
Filters version system eklendi. Version değiştiğinde otomatik temizlenir.

## Current Version
```javascript
CURRENT_FILTERS_VERSION = '2'
```

## Automatic Clear
Uygulama açıldığında otomatik olarak:
1. Version kontrolü yapılır
2. Eğer eski version varsa → Cache temizlenir
3. Yeni default values kullanılır

## Manual Clear (React Native Debugger)

### Method 1: Clear Specific Key
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear only filters
AsyncStorage.removeItem('@dating_app_filters');

// Clear version (to force re-clear)
AsyncStorage.removeItem('@dating_app_filters_version');
```

### Method 2: Clear All
```javascript
AsyncStorage.clear();
```

### Method 3: Check Current Value
```javascript
AsyncStorage.getItem('@dating_app_filters').then(data => {
  console.log('Current filters:', JSON.parse(data));
});
```

## Testing Steps

### Step 1: Clear Cache
1. Open React Native Debugger (Ctrl+M → Debug)
2. Open Console
3. Run:
```javascript
AsyncStorage.removeItem('@dating_app_filters');
AsyncStorage.removeItem('@dating_app_filters_version');
```

### Step 2: Reload App
1. Kill app completely (swipe up)
2. Restart app
3. Go to Near Me screen
4. Check if only correct gender shows:
   - Male user → Should see only Women ✅
   - Female user → Should see only Men ✅

### Step 3: Verify Filters Modal
1. Click Filters icon
2. Check Gender value:
   - Male user → Should show "Women" ✅
   - Female user → Should show "Men" ✅

## Quick Fix Command

```javascript
// Run this in React Native Debugger Console
(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('@dating_app_filters');
  await AsyncStorage.removeItem('@dating_app_filters_version');
  console.log('✅ Filters cache cleared!');
  console.log('🔄 Please reload the app now.');
})();
```

## Verification

After clearing cache, verify:

```javascript
// Check what's stored
AsyncStorage.getItem('@dating_app_filters').then(data => {
  console.log('Stored filters:', JSON.parse(data));
});

// Check version
AsyncStorage.getItem('@dating_app_filters_version').then(v => {
  console.log('Version:', v); // Should be '2'
});
```

## Version History

- **v1**: Initial version (had bug with 'all')
- **v2**: Fixed default gender based on user profile ✅

## How Version System Works

```javascript
// On app load:
const savedVersion = await AsyncStorage.getItem(FILTERS_VERSION_KEY);
if (savedVersion !== CURRENT_FILTERS_VERSION) {
  // Clear old cache
  await AsyncStorage.removeItem(FILTERS_STORAGE_KEY);
  // Set new version
  await AsyncStorage.setItem(FILTERS_VERSION_KEY, CURRENT_FILTERS_VERSION);
}
```

## Alternative: Uninstall App

If nothing works:
1. Delete app from phone/simulator
2. Reinstall
3. Fresh start with no cache ✅

## Expected Results

### Before Clear:
```json
{
  "gender": "all",  // ❌ Wrong!
  "minAge": 18,
  "maxAge": 66
}
```

### After Clear (Male User):
```json
{
  "gender": "women",  // ✅ Correct!
  "minAge": 18,
  "maxAge": 66
}
```

### After Clear (Female User):
```json
{
  "gender": "men",  // ✅ Correct!
  "minAge": 18,
  "maxAge": 66
}
```

## Troubleshooting

### If still showing 'all':
1. Make sure you completely killed the app
2. Make sure you ran the clear command
3. Make sure version is '2'
4. Check console for "🧹 Clearing old filters cache" message

### Check logs:
```
🧹 Clearing old filters cache, version mismatch
```
This means cache was cleared automatically ✅

## Summary

✅ Version system added
✅ Automatic cache clear on version mismatch
✅ Default gender based on user profile
✅ Manual clear commands provided

After clearing cache once, the app will automatically maintain correct defaults! 🎉
