import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GOOGLE_OAUTH } from '../config/api';
import CustomAlert from '../components/CustomAlert';
import { authAPI } from '../services/api';

export default function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    date_of_birth: '1995-01-01',
    gender: 'man',
    interested_in: 'woman',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const { signup, loginWithGoogle } = useContext(AuthContext);
  const { t } = useLanguage();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [showPassword, setShowPassword] = useState(false);
  const usernameTimeout = useRef(null);

  // Configure Google Sign-In
  // TODO: Enable in production build (requires native modules)
  // useMemo(() => {
  //   GoogleSignin.configure({
  //     webClientId: GOOGLE_OAUTH.webClientId,
  //     offlineAccess: false,
  //   });
  // }, []);

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Username availability check with debounce
  useEffect(() => {
    if (!formData.username) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    // Clear previous timeout
    if (usernameTimeout.current) {
      clearTimeout(usernameTimeout.current);
    }

    // Basic validation first
    if (formData.username.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: t('auth.signup.usernameMinLength')
      });
      return;
    }

    if (formData.username.length > 30) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: t('auth.signup.usernameMaxLength')
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: t('auth.signup.usernameOnlyLettersNumbersUnderscores')
      });
      return;
    }

    // Set checking state
    setUsernameStatus({ checking: true, available: null, message: t('auth.signup.checkingUsername') });

    // Debounce API call
    usernameTimeout.current = setTimeout(async () => {
      try {
        const { data } = await authAPI.checkUsername(formData.username);
        if (data.available) {
          setUsernameStatus({
            checking: false,
            available: true,
            message: t('auth.signup.usernameAvailableCheck')
          });
        } else {
          setUsernameStatus({
            checking: false,
            available: false,
            message: t('auth.signup.usernameTaken')
          });
        }
      } catch (error) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: t('auth.signup.usernameErrorChecking')
        });
      }
    }, 500); // 500ms debounce

    return () => {
      if (usernameTimeout.current) {
        clearTimeout(usernameTimeout.current);
      }
    };
  }, [formData.username]);

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.username || !formData.name) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('auth.signup.fillAllFields'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
      return;
    }

    if (!usernameStatus.available) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('auth.signup.chooseAvailableUsername'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
      return;
    }

    setLoading(true);
    try {
      await signup(formData);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: error.response?.data?.message || t('auth.signup.signupFailed'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // TODO: Enable in production build (requires native modules)
    setAlertConfig({
      visible: true,
      title: 'Coming Soon',
      message: 'Google Sign-In will be available in the production build. Please use email signup for now.',
      onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
      onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
    });

    /* Production code - enable after building:
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }
      await loginWithGoogle(idToken);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      let errorMessage = t('auth.signup.signupFailed');
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Google Sign-In cancelled';
      } else if (error.code === 'IN_PROGRESS') {
        errorMessage = 'Google Sign-In already in progress';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services not available';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: errorMessage,
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setGoogleLoading(false);
    }
    */
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#f80f6e" />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.signup.createAccount')}</Text>
        <Text style={styles.subtitle}>{t('auth.signup.signUpToGetStarted')}</Text>

        <View style={styles.form}>
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#DB4437" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.googleButtonText}>{t('auth.signup.signUpWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.signup.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('auth.signup.namePlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.signup.emailPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View>
            <TextInput
              style={[
                styles.input,
                usernameStatus.available === true && styles.inputSuccess,
                usernameStatus.available === false && styles.inputError,
              ]}
              placeholder={t('auth.signup.usernamePlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={formData.username}
              onChangeText={(v) => updateField('username', v.toLowerCase())}
              autoCapitalize="none"
            />
            {formData.username ? (
              <View style={styles.usernameStatus}>
                {usernameStatus.checking ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : null}
                <Text
                  style={[
                    styles.usernameStatusText,
                    usernameStatus.available === true && styles.usernameStatusSuccess,
                    usernameStatus.available === false && styles.usernameStatusError,
                  ]}
                >
                  {usernameStatus.message}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder={t('auth.signup.passwordPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
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
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('auth.signup.dateOfBirthPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={formData.date_of_birth}
            onChangeText={(v) => updateField('date_of_birth', v)}
          />

          <View style={styles.section}>
            <Text style={styles.label}>{t('auth.signup.iAm')}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.gender === 'man' && styles.radioButtonActive,
                ]}
                onPress={() => updateField('gender', 'man')}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.gender === 'man' && styles.radioTextActive,
                  ]}
                >
                  {t('auth.signup.man')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.gender === 'woman' && styles.radioButtonActive,
                ]}
                onPress={() => updateField('gender', 'woman')}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.gender === 'woman' && styles.radioTextActive,
                  ]}
                >
                  {t('auth.signup.woman')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('auth.signup.interestedIn')}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.interested_in === 'man' && styles.radioButtonActive,
                ]}
                onPress={() => updateField('interested_in', 'man')}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.interested_in === 'man' && styles.radioTextActive,
                  ]}
                >
                  {t('auth.signup.men')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.interested_in === 'woman' && styles.radioButtonActive,
                ]}
                onPress={() => updateField('interested_in', 'woman')}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.interested_in === 'woman' && styles.radioTextActive,
                  ]}
                >
                  {t('auth.signup.women')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
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
                <Text style={styles.buttonText}>{t('auth.signup.createAccountButton')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              {t('auth.signup.alreadyHaveAccount')} <Text style={styles.linkBold}>{t('auth.signup.signIn')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#f80f6e',
    marginLeft: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    gap: 15,
    marginBottom: 30,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    color: '#333',
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
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 54,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    padding: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 18,
    borderRadius: 36,
    fontSize: 16,
  },
  inputSuccess: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  inputError: {
    borderWidth: 2,
    borderColor: '#f44336',
  },
  usernameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 5,
    gap: 5,
  },
  usernameStatusText: {
    fontSize: 13,
    color: '#999',
  },
  usernameStatusSuccess: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  usernameStatusError: {
    color: '#f44336',
  },
  section: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radioButton: {
    flex: 1,
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#f80f6e',
    backgroundColor: '#FFF0F6',
  },
  radioText: {
    fontSize: 16,
    color: '#666',
  },
  radioTextActive: {
    color: '#f80f6e',
    fontWeight: '600',
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
  linkText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 15,
  },
  linkBold: {
    color: '#f80f6e',
    fontWeight: '600',
  },
});
