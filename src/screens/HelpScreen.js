import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DynamicHeader from '../components/DynamicHeader';

const HelpScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [expandedSection, setExpandedSection] = useState(null);

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const faqData = [
    {
      id: 1,
      question: t('help.faqs.matching.question'),
      answer: t('help.faqs.matching.answer'),
      icon: 'heart'
    },
    {
      id: 2,
      question: t('help.faqs.editProfile.question'),
      answer: t('help.faqs.editProfile.answer'),
      icon: 'person'
    },
    {
      id: 3,
      question: t('help.faqs.shakeToMatch.question'),
      answer: t('help.faqs.shakeToMatch.answer'),
      icon: 'phone-portrait'
    },
    {
      id: 4,
      question: t('help.faqs.unmatch.question'),
      answer: t('help.faqs.unmatch.answer'),
      icon: 'close-circle'
    },
    {
      id: 5,
      question: t('help.faqs.location.question'),
      answer: t('help.faqs.location.answer'),
      icon: 'location'
    },
    {
      id: 6,
      question: t('help.faqs.report.question'),
      answer: t('help.faqs.report.answer'),
      icon: 'flag'
    },
    {
      id: 7,
      question: t('help.faqs.matchesNotLoading.question'),
      answer: t('help.faqs.matchesNotLoading.answer'),
      icon: 'refresh'
    },
    {
      id: 8,
      question: t('help.faqs.deleteAccount.question'),
      answer: t('help.faqs.deleteAccount.answer'),
      icon: 'trash'
    },
  ];

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DynamicHeader
        title={t('sidebar.help')}
        navigation={navigation}
        leftIcon={{ name: 'chevron-back', onPress: () => navigation.goBack() }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.topSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={64} color="#f90e6e" />
          </View>
          <Text style={styles.title}>{t('help.title')}</Text>
          <Text style={styles.subtitle}>
            {t('help.subtitle')}
          </Text>
        </View>

        {/* FAQ Sections */}
        <View style={styles.faqContainer}>
          {faqData.map((item) => (
            <View key={item.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleSection(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.questionLeft}>
                  <View style={styles.questionIconContainer}>
                    <Ionicons name={item.icon} size={20} color="#f90e6e" />
                  </View>
                  <Text style={styles.questionText}>{item.question}</Text>
                </View>
                <Ionicons
                  name={expandedSection === item.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {expandedSection === item.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>{t('help.stillNeedHelp')}</Text>
          <Text style={styles.contactText}>
            {t('help.sendFeedback')}
          </Text>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbox-ellipses" size={20} color="#FFFFFF" />
            <Text style={styles.feedbackButtonText}>{t('help.sendFeedbackButton')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
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
    paddingHorizontal: 8,
  },
  faqContainer: {
    paddingHorizontal: 16,
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  questionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 64,
  },
  answerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f90e6e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default HelpScreen;
