import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

/**
 * Check if Apple Sign-In is available (iOS 13+ only)
 */
export const isAppleAuthAvailable = async () => {
  if (Platform.OS !== 'ios') return false;
  return await AppleAuthentication.isAvailableAsync();
};

/**
 * Sign in with Apple
 * Returns credential with identityToken, user, fullName, email
 */
export const signInWithApple = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  return {
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    user: credential.user, // stable Apple user ID
    email: credential.email, // only returned on first sign-in
    fullName: credential.fullName, // only returned on first sign-in
  };
};
