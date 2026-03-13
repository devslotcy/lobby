import { useState, useContext, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useGoogleSignIn } from '../services/googleAuth';
import { signInWithApple, isAppleAuthAvailable } from '../services/appleAuth';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import CustomAlert from '../components/CustomAlert';

export default function LoginScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, loginWithGoogle, loginWithApple } = useContext(AuthContext);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Refs for inputs
  const identifierInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Create dynamic styles based on theme
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);

  // Check Apple availability on mount
  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  // Google Sign-In Hook
  const { signIn: googleSignIn, request } = useGoogleSignIn();

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      // Sign in with Google using Expo AuthSession
      const result = await googleSignIn();

      if (result?.idToken) {
        // Send idToken and additional data (gender, birthday) to backend
        const additionalData = {};
        if (result.gender) additionalData.gender = result.gender;
        if (result.birthday) additionalData.birthday = result.birthday;

        console.log('📝 Sending to backend:', { idToken: '***', ...additionalData });

        await loginWithGoogle(result.idToken, additionalData);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      Alert.alert(
        t('auth.login.error'),
        error.message || t('auth.login.loginFailed')
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({ identifier: '', password: '' });

    // Validation
    if (!identifier) {
      setErrors(prev => ({ ...prev, identifier: t('auth.login.emailRequired') }));
      identifierInputRef.current?.focus();
      return;
    }

    if (!password) {
      setErrors(prev => ({ ...prev, password: t('auth.login.passwordRequired') }));
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: t('auth.login.error'),
        message: error.response?.data?.message || t('auth.login.loginFailed'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = handleGoogleLogin; // Use the new native Google Sign-In

  // Handle Apple Sign-In
  const handleAppleLogin = async () => {
    try {
      setAppleLoading(true);
      const result = await signInWithApple();
      if (result?.identityToken) {
        const additionalData = {};
        if (result.fullName?.givenName || result.fullName?.familyName) {
          additionalData.name = [result.fullName.givenName, result.fullName.familyName]
            .filter(Boolean)
            .join(' ');
        }
        if (result.email) additionalData.email = result.email;
        if (result.user) additionalData.appleUserId = result.user;
        await loginWithApple(result.identityToken, additionalData);
      }
    } catch (error) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('auth.login.error'), error.message || t('auth.login.loginFailed'));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.login.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

        <View style={styles.form}>
          <View>
            <TextInput
              ref={identifierInputRef}
              style={[styles.input, errors.identifier && styles.inputError]}
              placeholder={t('auth.login.emailOrUsername')}
              placeholderTextColor={colors.textTertiary}
              value={identifier}
              onChangeText={(value) => {
                setIdentifier(value);
                if (errors.identifier) setErrors(prev => ({ ...prev, identifier: '' }));
              }}
              autoCapitalize="none"
            />
            {errors.identifier ? <Text style={styles.errorText}>{errors.identifier}</Text> : null}
          </View>

          <View>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, styles.inputWithIcon, errors.password && styles.inputError]}
                placeholder={t('auth.login.password')}
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(prev => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f80f6e', '#ff4d8f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={36}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />
          )}

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>
              {t('auth.login.noAccount')} <Text style={styles.linkBold}>{t('auth.login.signUp')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      </KeyboardAvoidingView>

      {/* CustomAlert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode, colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#f80f6e',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  form: {
    gap: 15,
  },
  googleButton: {
    backgroundColor: colors.card,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.input,
    padding: 18,
    borderRadius: 36,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    color: colors.textPrimary,
  },
  inputWithIcon: {
    paddingRight: 54,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    padding: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    marginBottom: 5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 20,
  },
  button: {
    borderRadius: 36,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#f80f6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  gradientButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appleButton: {
    width: '100%',
    height: 56,
    marginTop: 4,
  },
  forgotPasswordText: {
    textAlign: 'center',
    color: '#f80f6e',
    fontSize: 14,
    marginTop: 12,
  },
  linkText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 15,
  },
  linkBold: {
    color: '#f80f6e',
    fontWeight: '600',
  },
});
