import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomAlert from '../components/CustomAlert';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { ToastContext } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useContext(ToastContext);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const handleSendResetLink = async () => {
    if (!email) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('auth.forgotPassword.enterEmail'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('auth.forgotPassword.validEmail'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });

      // Show success toast with checkmark icon
      showToast(t('auth.forgotPassword.resetLinkSent'), 3000, '✓');

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: error.response?.data?.message || t('auth.forgotPassword.failedToSend'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
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

          <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPassword.subtitle')}
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.forgotPassword.emailAddress')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendResetLink}
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
                  <Text style={styles.buttonText}>{t('auth.forgotPassword.sendResetLink')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>
                {t('auth.forgotPassword.rememberPassword')} <Text style={styles.linkBold}>{t('auth.login.signIn')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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

const createStyles = (colors, isDarkMode) => StyleSheet.create({
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
    lineHeight: 24,
  },
  form: {
    gap: 15,
  },
  input: {
    backgroundColor: colors.input,
    padding: 18,
    borderRadius: 36,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    borderRadius: 36,
    overflow: 'hidden',
    marginTop: 10,
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
    color: colors.textSecondary,
    marginTop: 15,
  },
  linkBold: {
    color: '#f80f6e',
    fontWeight: '600',
  },
});
