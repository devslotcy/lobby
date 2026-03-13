import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { userAPI } from '../services/api';
import Constants from 'expo-constants';
import DynamicHeader from '../components/DynamicHeader';

const AppSettingsScreen = ({ navigation }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTogglingProfile, setIsTogglingProfile] = useState(false);

  // Get theme context
  const { colors, isDarkMode, isAutoTheme, toggleDarkMode, toggleAutoTheme } = useTheme();

  // Get auth context
  const { logout, user, setUser } = useAuth();

  // Get language context
  const { t } = useLanguage();

  // Get subscription context for restore purchases
  const { restorePurchases } = useSubscription();

  // Get profile_active from user context
  const profileActive = user?.profile_active ?? true;

  // Create dynamic styles based on theme
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const renderCard = (title, children) => (
    <View style={styles.card}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      <View style={styles.cardContent}>
        {children}
      </View>
    </View>
  );

  const renderToggleItem = (icon, label, description, value, onValueChange, iconColor, isLast = false) => (
    <View style={[styles.settingItem, isLast && styles.settingItemLast]}>
      <View style={styles.settingLeft}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconColor ? `${iconColor}15` : '#F3F4F6' }]}>
            <Ionicons name={icon} size={22} color={iconColor || '#f90e6e'} />
          </View>
        )}
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#f90e6e' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );

  const renderMenuItem = (icon, label, description, onPress, iconColor, showChevron = true, isLast = false, isDanger = false, isLoading = false) => (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.settingItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.settingLeft}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: isDanger ? '#FEE2E2' : iconColor ? `${iconColor}15` : '#F3F4F6' }]}>
            <Ionicons name={icon} size={22} color={isDanger ? '#EF4444' : iconColor || '#6B7280'} />
          </View>
        )}
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, isDanger && styles.dangerText]}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={iconColor || '#6B7280'} />
      ) : (
        showChevron && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout.title'),
      t('settings.logout.message'),
      [
        {
          text: t('settings.logout.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              // Navigation will be handled automatically by AuthContext
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('settings.logout.error'));
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('appSettings.resetAccount.title'),
      t('appSettings.resetAccount.message'),
      [
        {
          text: t('appSettings.resetAccount.cancel'),
          style: 'cancel',
        },
        {
          text: t('appSettings.resetAccount.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              console.log('🔄 Resetting account...');

              // Call reset account API
              await userAPI.deleteAccount();

              // Show success message
              Alert.alert(
                t('common.success'),
                t('appSettings.resetAccount.success')
              );
            } catch (error) {
              console.error('Reset account error:', error);
              Alert.alert(t('common.error'), t('appSettings.resetAccount.error'));
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleProfile = () => {
    const newStatus = !profileActive;
    Alert.alert(
      newStatus ? t('appSettings.profileVisibility.turnOnTitle') : t('appSettings.profileVisibility.turnOffTitle'),
      newStatus ? t('appSettings.profileVisibility.turnOnMessage') : t('appSettings.profileVisibility.turnOffMessage'),
      [
        {
          text: t('appSettings.profileVisibility.cancel'),
          style: 'cancel',
        },
        {
          text: newStatus ? t('appSettings.profileVisibility.turnOn') : t('appSettings.profileVisibility.turnOff'),
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setIsTogglingProfile(true);
              console.log('🔄 Toggling profile visibility to:', newStatus);
              await userAPI.toggleProfileVisibility(newStatus);

              // Update user context
              setUser({ ...user, profile_active: newStatus });

              if (newStatus) {
                // Profile turned ON - show success message
                Alert.alert(
                  t('common.success'),
                  t('appSettings.profileVisibility.successOn')
                );
              } else {
                // Profile turned OFF - logout automatically
                console.log('🔒 Profile turned off, logging out...');
                await logout();
                // Navigation will be handled automatically by AuthContext
              }
            } catch (error) {
              console.error('Toggle profile error:', error);
              Alert.alert(t('common.error'), t('appSettings.profileVisibility.error'));
            } finally {
              setIsTogglingProfile(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <DynamicHeader
        title={t('sidebar.appSettings')}
        navigation={navigation}
        leftIcon={{ name: 'chevron-back', onPress: () => navigation.goBack() }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        {renderCard(t('settings.appearance.title'), (
          <>
            {renderToggleItem(
              'contrast',
              t('settings.appearance.autoTheme.label'),
              t('settings.appearance.autoTheme.description'),
              isAutoTheme,
              toggleAutoTheme,
              '#3B82F6'
            )}
            {renderToggleItem(
              'moon',
              t('settings.appearance.darkMode.label'),
              t('settings.appearance.darkMode.description'),
              isDarkMode,
              toggleDarkMode,
              '#F59E0B',
              true
            )}
          </>
        ))}

        {/* Account */}
        {renderCard(t('settings.account.title'), (
          <>
            {renderMenuItem(
              'refresh',
              t('settings.account.restorePurchases.label'),
              t('settings.account.restorePurchases.description'),
              async () => {
                try {
                  await restorePurchases();
                } catch (error) {
                  Alert.alert('Error', 'Failed to restore purchases. Please try again.');
                }
              },
              '#10B981',
              true,
              true
            )}
          </>
        ))}

        {/* Support */}
        {renderCard(t('settings.support.title'), (
          <>
            {renderMenuItem(
              'help-circle',
              t('settings.support.help.label'),
              t('settings.support.help.description'),
              () => navigation.navigate('Help'),
              '#f90e6e'
            )}
            {renderMenuItem(
              'chatbox-ellipses',
              t('settings.support.feedback.label'),
              t('settings.support.feedback.description'),
              () => navigation.navigate('Feedback'),
              '#8B5CF6',
              true,
              true
            )}
          </>
        ))}

        {/* Legal & Privacy */}
        {renderCard(t('settings.legal.title'), (
          <>
            {renderMenuItem(
              'document-text',
              t('settings.legal.terms'),
              null,
              () => navigation.navigate('Terms'),
              '#6B7280'
            )}
            {renderMenuItem(
              'shield-checkmark',
              t('settings.legal.privacy'),
              null,
              () => navigation.navigate('PrivacyPolicy'),
              '#6B7280'
            )}
            {renderMenuItem(
              'heart',
              t('settings.legal.safety'),
              null,
              () => navigation.navigate('DatingSafety'),
              '#6B7280'
            )}
            {renderMenuItem(
              'people',
              t('settings.legal.community'),
              null,
              () => navigation.navigate('CommunityGuidelines'),
              '#6B7280',
              true,
              true
            )}
          </>
        ))}

        {/* Account Actions */}
        {renderCard(t('settings.accountActions.title'), (
          <>
            {renderMenuItem(
              'log-out',
              t('settings.accountActions.logout'),
              null,
              handleLogout,
              '#F59E0B',
              false,
              false,
              false,
              isLoggingOut
            )}
            {renderMenuItem(
              profileActive ? 'eye-off' : 'eye',
              profileActive ? t('settings.accountActions.turnOffProfile') : t('settings.accountActions.turnOnProfile'),
              profileActive ? t('settings.accountActions.turnOffDescription') : t('settings.accountActions.turnOnDescription'),
              handleToggleProfile,
              profileActive ? '#F59E0B' : '#10B981',
              false,
              false,
              false,
              isTogglingProfile
            )}
            {renderMenuItem(
              'trash',
              t('settings.accountActions.deleteAccount.label'),
              t('settings.accountActions.deleteAccount.description'),
              handleDeleteAccount,
              null,
              false,
              true,
              true,
              isLoggingOut
            )}
          </>
        ))}

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {Constants.expoConfig?.version || '2.4.0'}</Text>
          <Text style={styles.versionSubtext}>© 2026 Lobby</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    letterSpacing: 0.3,
  },
  cardContent: {
    // Container for settings items
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    minHeight: 64,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  languageTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
    lineHeight: 18,
  },
  dangerText: {
    color: colors.error,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  versionText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: colors.textPlaceholder,
    fontWeight: '400',
  },
});

export default AppSettingsScreen;
