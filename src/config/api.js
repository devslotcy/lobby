import Constants from 'expo-constants';

// ====================================================
// AUTO IP DETECTION
// ====================================================
// Automatically detects your local IP address using Expo
// No more manual IP changes when your network changes!
// ====================================================

// ====================================================
// PRODUCTION vs DEVELOPMENT API URLs
// ====================================================
// Auto-detect: production builds have __DEV__ = false
const IS_PRODUCTION = !__DEV__;

const getApiUrl = () => {
  // Production build veya Expo Go test: her zaman production URL kullan
  return {
    api: 'https://api.getlobby.app/api',
    socket: 'https://api.getlobby.app'
  };
};

const { api, socket } = getApiUrl();

export const API_BASE_URL = api;
export const SOCKET_URL = socket;

// Base URL for media files (photos, uploads) — no /api suffix
export const MEDIA_BASE_URL = 'https://api.getlobby.app';

// Google Places API Key
// Get your API key from: https://console.cloud.google.com/google/maps-apis
// Make sure to enable "Places API" and "Geocoding API"
export const GOOGLE_PLACES_API_KEY = 'AIzaSyDeLGTjFqHSLgtKN00c9LoYlKDBTAPOFOU';

// Google OAuth Configuration
// Project: 771170272718 (lobby-19180 Firebase Project)
// IMPORTANT: This MUST match the project in google-services.json
export const GOOGLE_OAUTH = {
  // Web Client ID (Type 3 from google-services.json)
  // This is used for @react-native-google-signin
  webClientId: '771170272718-vn12200du7e2rpti11s321g5m9192abt.apps.googleusercontent.com',
  // iOS Client ID (from google-services.json other_platform_oauth_client)
  iosClientId: '771170272718-kclrkjqs2ts8c54pbl4sq2k85bupqem9.apps.googleusercontent.com',
  // Android Client ID (Type 1 from google-services.json)
  androidClientId: '771170272718-u6c9mo2vi0p2qhh648249qa0s51ld5ls.apps.googleusercontent.com',
};

// Debug: Only log in development
if (__DEV__) {
  console.log('📡 API Configuration:', { API_BASE_URL, SOCKET_URL });
}
