import React, { useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
// Disabled for Expo Go compatibility - native module not available
let GoogleSignin = null;
let statusCodes = null;
try {
  const module = require('@react-native-google-signin/google-signin');
  GoogleSignin = module.GoogleSignin;
  statusCodes = module.statusCodes;
} catch (e) {
  console.log('⚠️ GoogleSignin not available (Expo Go mode)');
}
import { GOOGLE_OAUTH } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const LogoSvg = () => (
  <Svg width="212" height="78" viewBox="0 0 481 156" fill="none">
    <Path d="M49.2278 16.6208C52.426 34.9443 47.8952 70.675 45.2301 86.25C46.5627 86.25 50.6327 82.5852 65.6629 82.5852C85.6516 82.5852 97.6448 88.9985 100.754 104.115C103.863 119.233 90.9819 129.31 58.5558 129.31C26.1298 129.31 10.5831 122.439 3.9202 104.115C-2.74268 85.7919 -0.0775232 42.2736 5.69697 18.4531C11.4715 -5.36736 45.2301 -6.28354 49.2278 16.6208Z" fill="#FC0F6E"/>
    <Path d="M147.838 42.7317C172.616 42.7317 192.702 62.2155 192.702 86.25C192.702 110.284 172.616 129.768 147.838 129.768C123.061 129.768 102.975 110.284 102.975 86.25C102.975 62.2156 123.061 42.7318 147.838 42.7317ZM148.283 73.8816C139.942 73.8816 133.18 81.06 133.18 89.9148C133.18 98.7695 139.942 105.948 148.283 105.948C156.624 105.948 163.385 98.7695 163.385 89.9148C163.385 81.06 156.624 73.8816 148.283 73.8816Z" fill="#FC0F6E"/>
    <Path d="M204.652 20.2852C209.094 6.54295 218.899 -1.23743 230.415 1.04639C245.073 3.95346 239.743 23.492 237.078 33.57C234.946 41.6323 234.413 45.7859 234.413 46.8547C245.073 42.732 270.303 39.1588 282.385 57.8484C297.488 81.2108 288.604 112.361 267.283 124.271C245.962 136.182 212.203 127.02 201.987 99.0764C191.771 71.1331 200.21 34.0278 204.652 20.2852ZM245.561 69.3012C236.975 69.3012 230.014 76.4796 230.014 85.3344C230.015 94.1891 236.975 101.367 245.561 101.367C254.147 101.366 261.107 94.1889 261.107 85.3344C261.107 76.4797 254.147 69.3015 245.561 69.3012Z" fill="#FC0F6E"/>
    <Path d="M303.262 20.2861C307.704 6.5435 317.509 -1.23758 329.025 1.04624C343.683 3.95333 338.353 23.4929 335.688 33.5708C333.556 41.6322 333.023 45.7854 333.023 46.8546C343.684 42.7319 368.914 39.1594 380.996 57.8492C396.098 81.2115 387.214 112.361 365.893 124.271C344.572 136.182 310.814 127.02 300.597 99.0763C290.381 71.133 298.82 34.0287 303.262 20.2861ZM344.171 69.3011C335.585 69.3011 328.625 76.4795 328.625 85.3343C328.625 94.1891 335.585 101.368 344.171 101.368C352.757 101.367 359.717 94.1889 359.717 85.3343C359.717 76.4796 352.757 69.3014 344.171 69.3011Z" fill="#FC0F6E"/>
    <Path d="M461.438 43.6479C451.844 43.6479 447.668 51.7408 447.224 55.5582C446.336 63.193 446.78 72.5991 446.78 78.4625C446.78 85.7919 444.115 94.4956 435.231 94.4956C428.124 94.4956 426.643 87.1662 426.347 83.5015C426.347 77.8518 425.903 64.2619 425.903 56.9325C425.903 47.7707 418.796 42.7318 409.912 43.6479C403.282 44.3317 392.588 49.6031 392.144 71.1332C391.7 92.6633 394.809 106.405 405.026 115.109C413.199 122.073 428.568 123.508 435.231 123.355C435.675 123.813 436.297 125.005 435.231 126.104C433.898 127.478 427.68 129.31 416.575 128.852C405.47 128.394 399.695 133.433 398.807 137.555C397.919 141.678 400.584 154.963 416.575 155.879C432.566 156.796 449.001 152.673 464.103 137.555C479.206 122.439 482.315 79.8368 480.094 66.5523C477.873 53.2678 473.431 43.6479 461.438 43.6479Z" fill="#FC0F6E"/>
  </Svg>
);

const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="-3 0 262 262" preserveAspectRatio="xMidYMid">
    <Path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
    <Path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
    <Path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
    <Path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
  </Svg>
);

const DotPattern = ({ isDark }) => {
  const dots = [];
  const spacing = 30;
  const rows = 30;
  const cols = 15;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(
        <View
          key={`${i}-${j}`}
          style={{
            position: 'absolute',
            width: 1.5,
            height: 1.5,
            backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
            borderRadius: 1,
            top: i * spacing,
            left: j * spacing,
          }}
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

export default function WelcomeScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const { loginWithGoogle } = useContext(AuthContext);
  const [isLoading, setIsLoading] = React.useState(false);

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Configure Google Sign-In (only if module is available)
  useEffect(() => {
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: GOOGLE_OAUTH.webClientId,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert('Not Available', 'Google Sign-In is not available in Expo Go. Please use email login.');
      return;
    }
    try {
      setIsLoading(true);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Her seferinde hesap seçici göstermek için önce sign out yap
      try {
        await GoogleSignin.signOut();
      } catch (_) {}

      const result = await GoogleSignin.signIn();

      // v16 yapısı: { type: 'success', data: { idToken, ... } }
      // ya da     : { type: 'cancelled' }
      if (result.type !== 'success') {
        return;
      }

      const idToken = result?.data?.idToken;

      if (!idToken) {
        console.error('❌ Token yapısı:', JSON.stringify(result, null, 2));
        throw new Error('Google\'dan ID token alınamadı. Lütfen tekrar deneyin.');
      }

      // People API'den cinsiyet ve doğum tarihi al
      let gender, birthday;
      try {
        const tokens = await GoogleSignin.getTokens();
        const accessToken = tokens.accessToken;
        if (accessToken) {
          const peopleRes = await fetch(
            'https://people.googleapis.com/v1/people/me?personFields=genders,birthdays',
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const peopleData = await peopleRes.json();
          console.log('📝 People API (Welcome):', peopleData);
          gender = peopleData.genders?.[0]?.value;
          const bd = peopleData.birthdays?.[0]?.date;
          if (bd?.year && bd?.month && bd?.day) {
            birthday = `${bd.year}-${String(bd.month).padStart(2,'0')}-${String(bd.day).padStart(2,'0')}`;
          }
        }
      } catch (e) {
        console.error('People API error:', e);
      }

      const additionalData = {};
      if (gender) additionalData.gender = gender;
      if (birthday) additionalData.birthday = birthday;

      await loginWithGoogle(idToken, additionalData);
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      console.error('❌ error.code:', error.code);
      console.error('❌ error.message:', error.message);

      const code = error.code;

      if (
        code === 'SIGN_IN_CANCELLED' ||
        (statusCodes && code === statusCodes.SIGN_IN_CANCELLED)
      ) {
        // Kullanıcı iptal etti - sessizce çık
      } else if (
        code === 'IN_PROGRESS' ||
        (statusCodes && code === statusCodes.IN_PROGRESS)
      ) {
        // Zaten devam ediyor - sessizce çık
      } else if (
        code === 'PLAY_SERVICES_NOT_AVAILABLE' ||
        (statusCodes && code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
      ) {
        Alert.alert(t('common.error'), 'Google Play Services kullanılamıyor. Lütfen güncelleyin.');
      } else if (code === 'DEVELOPER_ERROR' || error.message?.includes('DEVELOPER_ERROR')) {
        // SHA-1 / paket adı / webClientId uyumsuzluğu
        Alert.alert(
          t('common.error'),
          'Google Sign-In yapılandırma hatası. Lütfen daha sonra tekrar deneyin.',
        );
        console.error('❌ DEVELOPER_ERROR: SHA-1 sertifika hash\'i Firebase Console\'dakiyle eşleşmiyor olabilir.');
      } else {
        Alert.alert(t('common.error'), error.message || t('auth.welcome.failedGoogleSignIn'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <DotPattern isDark={isDarkMode} />
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <LogoSvg />
          </View>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonContainer}>
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              isLoading && styles.googleButtonDisabled
            ]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.googleButtonText}>{t('auth.welcome.signInWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f80f6e', '#ff4d8f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>{t('auth.welcome.createAccount')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{t('auth.welcome.signIn')}</Text>
          </TouchableOpacity>

          {/* Terms Text */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {language === 'tr' ? 'Devam ederek, ' :
               language === 'en' ? 'By continuing, you agree to our ' :
               language === 'th' ? 'โดยการดำเนินการต่อ คุณยอมรับ' :
               language === 'es' ? 'Al continuar, aceptas nuestros ' :
               language === 'fr' ? 'En continuant, vous acceptez nos ' :
               language === 'id' ? 'Dengan melanjutkan, Anda menyetujui ' :
               language === 'pt' ? 'Ao continuar, você concorda com nossos ' :
               language === 'ru' ? 'Продолжая, вы соглашаетесь с нашими ' :
               language === 'ar' ? 'بالمتابعة، أنت توافق على ' : 'By continuing, you agree to our '}
              <Text
                style={styles.termsLink}
                onPress={() => navigation.navigate('Terms')}
              >
                {t('auth.welcome.termsOfService')}
              </Text>
              {language === 'tr' ? ' ve\n' :
               language === 'en' ? '\nand ' :
               language === 'th' ? '\nและ' :
               language === 'es' ? '\ny ' :
               language === 'fr' ? '\net ' :
               language === 'id' ? '\ndan ' :
               language === 'pt' ? '\ne ' :
               language === 'ru' ? '\nи ' :
               language === 'ar' ? '\nو' : '\nand '}
              <Text
                style={styles.termsLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                {t('auth.welcome.privacyPolicy')}
              </Text>
              {language === 'tr' ? "'nı kabul etmiş olursunuz" :
               language === 'th' ? 'ของเรา' :
               language === 'id' ? ' kami' : ''}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 142,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  googleButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 36,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 36,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f80f6e',
  },
  secondaryButtonText: {
    color: '#f80f6e',
    fontSize: 17,
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
    gap: 2,
    marginTop: 20,
    paddingBottom: 0,
  },
  termsText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
  },
  termsLink: {
    color: '#f80f6e',
    fontWeight: '400',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
});
