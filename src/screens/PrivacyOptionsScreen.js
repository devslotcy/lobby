import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DynamicHeader from '../components/DynamicHeader';

const PrivacyOptionsScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('BLOCKED'); // Default tab
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [hiddenUsers, setHiddenUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'BLOCKED') {
      loadBlockedUsers();
    } else {
      loadHiddenUsers();
    }
  }, [activeTab]);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const { data } = await userAPI.getBlockedUsers();
      setBlockedUsers(data.blocked_users || []);
    } catch (error) {
      console.error('❌ Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHiddenUsers = async () => {
    try {
      setLoading(true);
      const { data } = await userAPI.getHiddenUsers();
      setHiddenUsers(data.hidden_users || []);
    } catch (error) {
      console.error('❌ Failed to load hidden users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, userName) => {
    try {
      console.log('🔓 Unblocking user:', userId);
      await userAPI.unblockUser(userId);

      // Remove from list
      setBlockedUsers(prev => prev.filter(user => user.id !== userId));

      console.log(`✅ ${userName} has been unblocked`);
    } catch (error) {
      console.error('❌ Failed to unblock user:', error);
    }
  };

  const handleUnhide = async (userId, userName) => {
    try {
      console.log('👁️ Unhiding user:', userId);
      await userAPI.unhideUser(userId);

      // Remove from list
      setHiddenUsers(prev => prev.filter(user => user.id !== userId));

      console.log(`✅ ${userName} has been unhidden`);
    } catch (error) {
      console.error('❌ Failed to unhide user:', error);
    }
  };

  const getPhotoUrl = (photoUrls) => {
    if (!photoUrls) return null;

    try {
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = Array.isArray(photoUrls) ? photoUrls : [];
      }

      const firstUrl = urls.filter(url => url)[0];
      return firstUrl ? MEDIA_BASE_URL + firstUrl : null;
    } catch (e) {
      return null;
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';

    const now = new Date();
    const blockedDate = new Date(date);
    const diffMs = now - blockedDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffDays === 0) return t('privacyOptions.timeAgo.today');
    if (diffDays === 1) return t('privacyOptions.timeAgo.dayAgo');
    if (diffDays < 7) return t('privacyOptions.timeAgo.daysAgo', { diffDays });
    if (diffWeeks === 1) return t('privacyOptions.timeAgo.weekAgo');
    if (diffWeeks < 4) return t('privacyOptions.timeAgo.weeksAgo', { diffWeeks });

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return t('privacyOptions.timeAgo.monthAgo');
    return t('privacyOptions.timeAgo.monthsAgo', { diffMonths });
  };

  // Render tabs
  const renderTabs = () => {
    const tabs = [
      { key: 'BLOCKED', label: t('privacyOptions.blockedUsers') },
      { key: 'HIDDEN', label: t('privacyOptions.hiddenUsers') },
    ];

    return (
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && [
                styles.tabActive,
                { backgroundColor: isDarkMode ? '#4c4c4c' : '#F3F4F6' }
              ],
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === tab.key && { color: isDarkMode ? '#FFFFFF' : '#000000' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleCardPress = (user) => {
    navigation.navigate('UserProfileView', {
      userId: user.id,
      user: user,
    });
  };

  const renderBlockedUserCard = (user) => {
    const photoUrl = getPhotoUrl(user.photo_urls);

    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleCardPress(user)}
        activeOpacity={0.7}
      >
        {/* User Photo */}
        <View style={styles.userPhotoContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.userPhoto} />
          ) : (
            <View style={styles.userPhotoPlaceholder}>
              <Text style={styles.userPhotoPlaceholderText}>
                {user.name?.charAt(0).toUpperCase() || t('privacyOptions.unknownInitial')}
              </Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>{user.name}</Text>
          <Text style={[styles.userDetails, { color: colors.textSecondary }]}>
            {user.age} • {user.gender === 'man' || user.gender === 'male' ? t('privacyOptions.male') : t('privacyOptions.female')} • {user.location_city || t('privacyOptions.unknown')}
          </Text>
          <Text style={[styles.userTime, { color: colors.textTertiary }]}>{formatTimeAgo(user.blocked_at)}</Text>
        </View>

        {/* Unblock Button */}
        <TouchableOpacity
          style={[styles.unblockButton, { backgroundColor: colors.background, borderColor: '#10B981' }]}
          onPress={(e) => {
            e.stopPropagation();
            handleUnblock(user.id, user.name);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.unblockButtonText}>{t('privacyOptions.unblock')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHiddenUserCard = (user) => {
    const photoUrl = getPhotoUrl(user.photo_urls);

    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleCardPress(user)}
        activeOpacity={0.7}
      >
        {/* User Photo */}
        <View style={styles.userPhotoContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.userPhoto} />
          ) : (
            <View style={styles.userPhotoPlaceholder}>
              <Text style={styles.userPhotoPlaceholderText}>
                {user.name?.charAt(0).toUpperCase() || t('privacyOptions.unknownInitial')}
              </Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>{user.name}</Text>
          <Text style={[styles.userDetails, { color: colors.textSecondary }]}>
            {user.age} • {user.gender === 'man' || user.gender === 'male' ? t('privacyOptions.male') : t('privacyOptions.female')} • {user.location_city || t('privacyOptions.unknown')}
          </Text>
          <Text style={[styles.userTime, { color: colors.textTertiary }]}>{formatTimeAgo(user.hidden_at)}</Text>
        </View>

        {/* Unhide Button */}
        <TouchableOpacity
          style={[styles.unhideButton, { backgroundColor: colors.background, borderColor: '#10B981' }]}
          onPress={(e) => {
            e.stopPropagation();
            handleUnhide(user.id, user.name);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.unhideButtonText}>{t('privacyOptions.unhide')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa1170" />
        </View>
      );
    }

    if (activeTab === 'BLOCKED') {
      if (blockedUsers.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="ban" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>{t('privacyOptions.noBlocked')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {t('privacyOptions.blockedAppearHere')}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          {blockedUsers.map(user => renderBlockedUserCard(user))}
        </View>
      );
    } else {
      if (hiddenUsers.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="eye-off" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>{t('privacyOptions.noHidden')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {t('privacyOptions.hiddenAppearHere')}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          {hiddenUsers.map(user => renderHiddenUserCard(user))}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <DynamicHeader
        title={t('sidebar.privacyOptions')}
        navigation={navigation}
        leftIcon={{ name: 'chevron-back', onPress: () => navigation.goBack() }}
      />
      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 15,
    marginTop: 24,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  userPhotoContainer: {
    marginRight: 12,
  },
  userPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  userPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fa1170',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPhotoPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userDetails: {
    fontSize: 13,
    marginBottom: 2,
  },
  userTime: {
    fontSize: 12,
  },
  unblockButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  unhideButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  unhideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});

export default PrivacyOptionsScreen;
