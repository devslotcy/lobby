import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DynamicHeader from '../components/DynamicHeader';

const FeedbackScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/feedback`,
        { message: feedback },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSubmitted(true);
      setFeedback('');

      // Auto navigate back after 2 seconds
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert(t('feedback.failedToSubmit'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>{t('feedback.thankYou')}</Text>
          <Text style={styles.successMessage}>
            {t('feedback.submitted')}
          </Text>
          <Text style={styles.successSubtext}>
            {t('feedback.appreciate')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DynamicHeader
        title={t('sidebar.feedback')}
        navigation={navigation}
        leftIcon={{ name: 'chevron-back', onPress: () => navigation.goBack() }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbox-ellipses" size={64} color="#f90e6e" />
            </View>

            <Text style={styles.title}>{t('feedback.title')}</Text>
            <Text style={styles.subtitle}>
              {t('feedback.subtitle')}
            </Text>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={t('feedback.placeholder')}
                placeholderTextColor={colors.textPlaceholder}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                value={feedback}
                onChangeText={setFeedback}
                maxLength={1000}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                      y: 150,
                      animated: true,
                    });
                  }, 100);
                }}
              />
              <Text style={styles.charCount}>{t('feedback.characterCount', { length: feedback.length })}</Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.submitButton, (!feedback.trim() || loading) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!feedback.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{t('feedback.messageUs')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>{t('feedback.close')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 160,
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#f90e6e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: isDarkMode ? colors.card : '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FeedbackScreen;
