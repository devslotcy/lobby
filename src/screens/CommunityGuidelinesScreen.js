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

const CommunityGuidelinesScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const GuidelineItem = ({ icon, iconColor, title, description }) => (
    <View style={styles.guidelineCard}>
      <View style={[styles.guidelineIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.guidelineContent}>
        <Text style={styles.guidelineTitle}>{title}</Text>
        <Text style={styles.guidelineDescription}>{description}</Text>
      </View>
    </View>
  );

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
        <Text style={styles.title}>{t('legal.community.title')}</Text>
        <Text style={styles.subtitle}>
          {t('legal.community.intro')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.coreValues.title')}</Text>

          <GuidelineItem
            icon="heart"
            iconColor="#f90e6e"
            title={t('legal.community.coreValues.respectful.title')}
            description={t('legal.community.coreValues.respectful.description')}
          />

          <GuidelineItem
            icon="checkmark-circle"
            iconColor="#10B981"
            title={t('legal.community.coreValues.authentic.title')}
            description={t('legal.community.coreValues.authentic.description')}
          />

          <GuidelineItem
            icon="shield-checkmark"
            iconColor="#3B82F6"
            title={t('legal.community.coreValues.safe.title')}
            description={t('legal.community.coreValues.safe.description')}
          />

          <GuidelineItem
            icon="people"
            iconColor="#8B5CF6"
            title={t('legal.community.coreValues.inclusive.title')}
            description={t('legal.community.coreValues.inclusive.description')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.prohibited.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.community.prohibited.subtitle')}
          </Text>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.harassment.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.harassment.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.hateSpeech.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.hateSpeech.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.nudity.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.nudity.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.illegal.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.illegal.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.scams.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.scams.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.fakeProfiles.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.fakeProfiles.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.spam.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.spam.description')}
            </Text>
          </View>

          <View style={styles.prohibitedBox}>
            <Text style={styles.prohibitedTitle}>
              <Ionicons name="close-circle" size={18} color="#EF4444" /> {t('legal.community.prohibited.minors.title')}
            </Text>
            <Text style={styles.prohibitedText}>
              {t('legal.community.prohibited.minors.description')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.profileGuidelines.title')}</Text>

          {t('legal.community.profileGuidelines.points').map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.messagingGuidelines.title')}</Text>

          {t('legal.community.messagingGuidelines.points').map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.reporting.title')}</Text>

          <Text style={styles.paragraph}>
            {t('legal.community.reporting.intro')}
          </Text>

          <View style={styles.stepBox}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('legal.community.reporting.step1.title')}</Text>
              <Text style={styles.stepDescription}>{t('legal.community.reporting.step1.description')}</Text>
            </View>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('legal.community.reporting.step2.title')}</Text>
              <Text style={styles.stepDescription}>{t('legal.community.reporting.step2.description')}</Text>
            </View>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('legal.community.reporting.step3.title')}</Text>
              <Text style={styles.stepDescription}>{t('legal.community.reporting.step3.description')}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            {t('legal.community.reporting.note')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.consequences.title')}</Text>

          <Text style={styles.paragraph}>
            {t('legal.community.consequences.intro')}
          </Text>

          {t('legal.community.consequences.points').map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}

          <Text style={styles.paragraph}>
            {t('legal.community.consequences.note')}
          </Text>
        </View>

        <View style={styles.highlightBox}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.highlightText}>
            {t('legal.community.updates')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.community.contact.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.community.contact.content')}
          </Text>
          <Text style={styles.contactText}>support@getlobby.app</Text>
          <Text style={styles.contactText}>getlobby.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('legal.community.finalNote')}
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
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '400',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  guidelineCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 2,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  guidelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  guidelineDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '400',
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
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
  prohibitedBox: {
    backgroundColor: isDarkMode ? '#3A1A1A' : '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  prohibitedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
    marginBottom: 8,
  },
  prohibitedText: {
    fontSize: 14,
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
    lineHeight: 20,
    fontWeight: '400',
  },
  stepBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 2,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f90e6e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '400',
  },
  highlightBox: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? '#1E3A5F' : '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: isDarkMode ? '#93C5FD' : '#1E40AF',
    lineHeight: 20,
    fontWeight: '500',
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
    fontSize: 15,
    color: colors.textTertiary,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default CommunityGuidelinesScreen;
