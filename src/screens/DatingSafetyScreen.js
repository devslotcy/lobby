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

const DatingSafetyScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const SafetyTip = ({ icon, iconColor, title, description }) => (
    <View style={styles.tipCard}>
      <View style={[styles.tipIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDescription}>{description}</Text>
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
        <Text style={styles.title}>{t('safety.title')}</Text>
        <Text style={styles.subtitle}>
          {t('safety.subtitle')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.beforeYouMeet.title')}</Text>

          <SafetyTip
            icon="shield-checkmark"
            iconColor="#10B981"
            title={t('safety.beforeYouMeet.useAppMessaging.title')}
            description={t('safety.beforeYouMeet.useAppMessaging.description')}
          />

          <SafetyTip
            icon="eye"
            iconColor="#3B82F6"
            title={t('safety.beforeYouMeet.videoChatFirst.title')}
            description={t('safety.beforeYouMeet.videoChatFirst.description')}
          />

          <SafetyTip
            icon="search"
            iconColor="#8B5CF6"
            title={t('safety.beforeYouMeet.doResearch.title')}
            description={t('safety.beforeYouMeet.doResearch.description')}
          />

          <SafetyTip
            icon="time"
            iconColor="#F59E0B"
            title={t('safety.beforeYouMeet.takeYourTime.title')}
            description={t('safety.beforeYouMeet.takeYourTime.description')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.meetingInPerson.title')}</Text>

          <SafetyTip
            icon="people"
            iconColor="#10B981"
            title={t('safety.meetingInPerson.publicPlaces.title')}
            description={t('safety.meetingInPerson.publicPlaces.description')}
          />

          <SafetyTip
            icon="car"
            iconColor="#3B82F6"
            title={t('safety.meetingInPerson.ownTransportation.title')}
            description={t('safety.meetingInPerson.ownTransportation.description')}
          />

          <SafetyTip
            icon="notifications"
            iconColor="#8B5CF6"
            title={t('safety.meetingInPerson.tellSomeone.title')}
            description={t('safety.meetingInPerson.tellSomeone.description')}
          />

          <SafetyTip
            icon="location"
            iconColor="#F59E0B"
            title={t('safety.meetingInPerson.shareLocation.title')}
            description={t('safety.meetingInPerson.shareLocation.description')}
          />

          <SafetyTip
            icon="call"
            iconColor="#EF4444"
            title={t('safety.meetingInPerson.phoneCharged.title')}
            description={t('safety.meetingInPerson.phoneCharged.description')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.duringDate.title')}</Text>

          <SafetyTip
            icon="wine"
            iconColor="#10B981"
            title={t('safety.duringDate.watchDrink.title')}
            description={t('safety.duringDate.watchDrink.description')}
          />

          <SafetyTip
            icon="heart-dislike"
            iconColor="#3B82F6"
            title={t('safety.duringDate.trustInstincts.title')}
            description={t('safety.duringDate.trustInstincts.description')}
          />

          <SafetyTip
            icon="home"
            iconColor="#8B5CF6"
            title={t('safety.duringDate.noPrivateLocations.title')}
            description={t('safety.duringDate.noPrivateLocations.description')}
          />

          <SafetyTip
            icon="card"
            iconColor="#F59E0B"
            title={t('safety.duringDate.payForYourself.title')}
            description={t('safety.duringDate.payForYourself.description')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.redFlags.title')}</Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text style={styles.warningText}>{t('safety.redFlags.subtitle')}</Text>
          </View>

          <Text style={styles.redFlag}>{t('safety.redFlags.refusesVideoChat')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.asksForMoney')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.pressuresToMeet')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.makesUncomfortable')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.inconsistentStories')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.aggressive')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.movesCommunication')}</Text>
          <Text style={styles.redFlag}>{t('safety.redFlags.ignoresBoundaries')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.protectPrivacy.title')}</Text>

          <SafetyTip
            icon="shield"
            iconColor="#10B981"
            title={t('safety.protectPrivacy.limitInfo.title')}
            description={t('safety.protectPrivacy.limitInfo.description')}
          />

          <SafetyTip
            icon="image"
            iconColor="#3B82F6"
            title={t('safety.protectPrivacy.carefulPhotos.title')}
            description={t('safety.protectPrivacy.carefulPhotos.description')}
          />

          <SafetyTip
            icon="finger-print"
            iconColor="#8B5CF6"
            title={t('safety.protectPrivacy.strongPasswords.title')}
            description={t('safety.protectPrivacy.strongPasswords.description')}
          />
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('safety.reportSuspicious.title')}</Text>
          <Text style={styles.paragraph}>
            {t('safety.reportSuspicious.description')}
          </Text>
          <Text style={styles.paragraph}>
            {t('safety.reportSuspicious.contact')}
          </Text>
          <Text style={styles.contactText}>support@getlobby.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('safety.finalNote')}
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
  tipCard: {
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
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '400',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#3A1A1A' : '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 15,
    fontWeight: '600',
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
  },
  redFlag: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 12,
    fontWeight: '400',
  },
  emergencyBox: {
    backgroundColor: isDarkMode ? '#3A1A1A' : '#FEE2E2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: isDarkMode ? '#7F1D1D' : '#FCA5A5',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
  },
  emergencyText: {
    fontSize: 15,
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '400',
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? '#FCA5A5' : '#DC2626',
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
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
    fontSize: 15,
    color: colors.textTertiary,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default DatingSafetyScreen;
