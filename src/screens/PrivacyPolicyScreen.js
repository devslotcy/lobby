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

const PrivacyPolicyScreen = ({ navigation }) => {
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
        <Text style={styles.title}>{t('legal.privacy.title')}</Text>
        <Text style={styles.updateDate}>{t('legal.privacy.lastUpdated')}</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            {t('legal.privacy.intro')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.infoWeCollect.title')}</Text>

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.infoWeCollect.personal.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.infoWeCollect.personal.intro')}
          </Text>
          {(t('legal.privacy.sections.infoWeCollect.personal.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.infoWeCollect.automatic.title')}</Text>
          {(t('legal.privacy.sections.infoWeCollect.automatic.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.howWeUse.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.howWeUse.intro')}
          </Text>
          {(t('legal.privacy.sections.howWeUse.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.sharing.title')}</Text>

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.sharing.withUsers.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.sharing.withUsers.content')}
          </Text>

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.sharing.withProviders.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.sharing.withProviders.intro')}
          </Text>
          {(t('legal.privacy.sections.sharing.withProviders.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.sharing.legal.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.sharing.legal.content')}
          </Text>

          <Text style={styles.subSectionTitle}>{t('legal.privacy.sections.sharing.noSell.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.sharing.noSell.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.security.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.security.intro')}
          </Text>
          {(t('legal.privacy.sections.security.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.security.disclaimer')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.retention.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.retention.intro')}
          </Text>
          {(t('legal.privacy.sections.retention.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.yourRights.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.yourRights.intro')}
          </Text>
          {(t('legal.privacy.sections.yourRights.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.location.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.location.intro')}
          </Text>
          {(t('legal.privacy.sections.location.points') || []).map((point, index) => (
            <Text key={index} style={styles.bulletPoint}>{point}</Text>
          ))}
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.location.control')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.children.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.children.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.thirdParty.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.thirdParty.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.international.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.international.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.changes.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.changes.content')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('legal.privacy.sections.contact.title')}</Text>
          <Text style={styles.paragraph}>
            {t('legal.privacy.sections.contact.content')}
          </Text>
          <Text style={styles.contactText}>support@getlobby.app</Text>
          <Text style={styles.contactText}>getlobby.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('legal.privacy.finalNote')}
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
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
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

export default PrivacyPolicyScreen;
