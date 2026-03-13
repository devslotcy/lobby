import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const TermsScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('legal.terms.title')}</Text>
        <Text style={styles.updateDate}>{t('legal.terms.lastUpdated')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.acceptance.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.acceptance.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.eligibility.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.eligibility.intro')}
          </Text>
          {(t('legal.terms.sections.eligibility.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.userAccount.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.userAccount.intro')}
          </Text>
          {(t('legal.terms.sections.userAccount.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.prohibited.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.prohibited.intro')}
          </Text>
          {(t('legal.terms.sections.prohibited.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.content.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.content.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.premium.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.premium.intro')}
          </Text>
          {(t('legal.terms.sections.premium.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.termination.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.termination.intro')}
          </Text>
          {(t('legal.terms.sections.termination.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.disclaimers.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.disclaimers.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.liability.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.liability.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.changes.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.changes.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.terms.sections.contact.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.terms.sections.contact.content')}
          </Text>
          <Text style={styles.contactText}>support@getlobby.app</Text>
          <Text style={styles.contactText}>getlobby.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('legal.terms.finalNote')}
          </Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  updateDate: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 24,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
    fontWeight: '400',
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 12,
    fontWeight: '400',
  },
  contactText: {
    fontSize: 15,
    color: '#f90e6e',
    lineHeight: 24,
    marginBottom: 4,
    fontWeight: '500',
  },
  footer: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerText: {
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '400',
    fontStyle: 'italic',
  },
});

export default TermsScreen;
