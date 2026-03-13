import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Disabled for Expo Go compatibility - native module not available
let GoogleSignin = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.log('⚠️ GoogleSignin not available (Expo Go mode)');
}
import * as Location from 'expo-location';
import { authAPI, userAPI, setTokenCache, clearTokenCache } from '../services/api';
import { clearCachedUserGender } from '../components/FiltersModal';
import SocketService from '../services/SocketService';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const registerPushTokenSafely = async () => {
  try {
    const NotificationService = require('../services/NotificationService').default;
    if (!NotificationService.getPushToken()) {
      await NotificationService.configure();
    }
    if (NotificationService.getPushToken()) {
      await NotificationService.registerPushToken();
    }
  } catch (err) {
    console.log('⚠️ Failed to register push token:', err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setTokenCache(token);
        const { data } = await userAPI.getProfile();
        setUser(data.user);
        // Save user data to AsyncStorage for match screen
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        // Profil tamamlama kontrolü — user ID bazlı key kullan
        const onboardingKey = `onboarding_complete_${data.user?.id}`;
        const onboardingComplete = await AsyncStorage.getItem(onboardingKey);
        const needsCompletion = onboardingComplete === 'true' ? false : Boolean(data.user?.needs_profile_completion);
        setIsProfileIncomplete(needsCompletion);
        SocketService.connect();
        registerPushTokenSafely();
      }
    } catch (error) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const { data } = await authAPI.login(identifier, password);
    await AsyncStorage.setItem('token', data.token);
    setTokenCache(data.token);
    if (data.refresh_token) {
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
    }
    // Save user data to AsyncStorage for match screen
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setIsProfileIncomplete(Boolean(data.user?.needs_profile_completion));
    SocketService.connect();

    registerPushTokenSafely();

    return data;
  };

  const signup = async (userData) => {
    const { data } = await authAPI.signup(userData);
    await AsyncStorage.setItem('token', data.token);
    setTokenCache(data.token);
    if (data.refresh_token) {
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
    }
    // Save user data to AsyncStorage for match screen
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    SocketService.connect();

    registerPushTokenSafely();

    return data;
  };

  const loginWithGoogle = async (idToken, additionalData = {}) => {
    const { data } = await authAPI.loginWithGoogle(idToken, additionalData);
    await AsyncStorage.setItem('token', data.token);
    setTokenCache(data.token);
    if (data.refresh_token) {
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
    }
    // Save user data to AsyncStorage for match screen
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    SocketService.connect();

    registerPushTokenSafely();

    // Check if profile is complete - if not, set flag for onboarding
    if (data.needsProfileCompletion) {
      const onboardingKey = `onboarding_complete_${data.user?.id}`;
      const onboardingComplete = await AsyncStorage.getItem(onboardingKey);
      if (onboardingComplete !== 'true') {
        console.log('⚠️ Profile incomplete, will show onboarding');
        setIsProfileIncomplete(true);
        return data;
      }
    }

    // LEGACY: Check if user needs location - if not set, request it
    if (!data.user.location_lat || !data.user.location_lng || !data.user.location_city) {
      console.log('📍 User has no location, requesting GPS permission...');

      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          console.log('✅ Location permission granted');

          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          console.log('📍 Got location:', location.coords);

          // Get city name from coordinates using reverse geocoding
          const geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          const locationData = {
            location_lat: location.coords.latitude,
            location_lng: location.coords.longitude,
            location_city: geocode[0]?.city || geocode[0]?.district || geocode[0]?.subregion || geocode[0]?.region || null,
            location_country: geocode[0]?.country || null,
          };

          console.log('📍 Location data:', locationData);

          // Update user profile with location
          await userAPI.updateProfile(locationData);

          // Refresh user data
          const { data: updatedData } = await userAPI.getProfile();
          await AsyncStorage.setItem('user', JSON.stringify(updatedData.user));
          setUser(updatedData.user);

          console.log('✅ Location updated successfully');
        } else {
          console.log('⚠️ Location permission denied');
        }
      } catch (error) {
        console.error('❌ Failed to get location:', error);
        // Don't block login if location fails
      }
    }

    // Don't force profile completion - let users explore first
    setIsProfileIncomplete(false);

    return data;
  };

  const loginWithApple = async (identityToken, additionalData = {}) => {
    const { data } = await authAPI.loginWithApple(identityToken, additionalData);
    await AsyncStorage.setItem('token', data.token);
    setTokenCache(data.token);
    if (data.refresh_token) {
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
    }
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    SocketService.connect();
    registerPushTokenSafely();

    if (data.needsProfileCompletion) {
      const onboardingKey = `onboarding_complete_${data.user?.id}`;
      const onboardingComplete = await AsyncStorage.getItem(onboardingKey);
      if (onboardingComplete !== 'true') {
        setIsProfileIncomplete(true);
        return data;
      }
    }

    setIsProfileIncomplete(false);
    return data;
  };

  const loginWithToken = async (token, refreshToken) => {
    await AsyncStorage.setItem('token', token);
    setTokenCache(token);
    if (refreshToken) {
      await AsyncStorage.setItem('refresh_token', refreshToken);
    }

    // Fetch user profile
    try {
      const { data } = await userAPI.getProfile();
      console.log('👤 User profile:', data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refresh_token');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Unregister push token before logout
      const NotificationService = require('../services/NotificationService').default;
      if (NotificationService.getPushToken()) {
        await NotificationService.unregisterPushToken().catch(err => {
          console.log('⚠️ Failed to unregister push token:', err);
        });
      }

      await authAPI.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      // Revoke Google access so account picker always shows on next sign-in
      if (GoogleSignin) {
        try {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          console.log('✅ Google access revoked');
        } catch (error) {
          console.log('Google sign out error:', error);
        }
      }

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');
      // Clear user-specific caches so next login starts fresh
      await AsyncStorage.removeItem('@dating_app_filters');
      clearTokenCache();
      clearCachedUserGender();
      SocketService.disconnect();
      setUser(null);
    }
  };

  /**
   * 🔥 Refresh user profile from server
   * Use this after profile updates to ensure fresh data
   */
  const refreshUser = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  /**
   * 🔥 Update user state immediately without server call
   * Use this after successful API updates when you already have fresh data
   */
  const updateUserState = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      login,
      signup,
      logout,
      loginWithGoogle,
      loginWithApple,
      loginWithToken,
      isProfileIncomplete,
      setIsProfileIncomplete,
      refreshUser,
      updateUserState
    }}>
      {children}
    </AuthContext.Provider>
  );
};
