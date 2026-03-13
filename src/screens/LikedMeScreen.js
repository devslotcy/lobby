import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DynamicHeader from '../components/DynamicHeader';
import OnlineStatusDot from '../components/OnlineStatusDot';
import BottomNavBar from '../components/BottomNavBar';
import PremiumModal from '../components/PremiumModal';
import { interactionsAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import CustomAlert from '../components/CustomAlert';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

// Tabs ordered by user interest/engagement priority
const tabs = [
  { key: 'LikedMe', icon: 'heart-circle' },      // Who liked me - most exciting!
  { key: 'VisitedMe', icon: 'eye' },             // Who viewed my profile
  { key: 'Matches', icon: 'heart' },             // My matches
  { key: 'FavoriteMe', icon: 'star' },           // Who favorited me
  { key: 'MyFavorites', icon: 'star-outline' },  // My favorites
  { key: 'MyVisits', icon: 'footsteps' },        // Profiles I visited
  { key: 'MyLikes', icon: 'thumbs-up' },         // People I liked
];

export default function LikedMeScreen({ navigation }) {
  const { colors } = useTheme();
  const { isPremium } = useSubscription();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('VisitedMe');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [gridColumns, setGridColumns] = useState(3);

  if (__DEV__) {
    console.log(`🎨 [LikedMeScreen] RENDER - activeTab: ${activeTab}, users: ${users.length}, filteredUsers: ${filteredUsers.length}, loading: ${loading}`);
  }
  const [badgeCounts, setBadgeCounts] = useState({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    loadBadgeCounts();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log(`🔄 [LikedMeScreen] activeTab changed to:`, activeTab);
    }
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (__DEV__) {
      console.log(`🔄 [LikedMeScreen] useEffect triggered, users.length:`, users.length);
    }

    if (users.length > 0) {
      const sorted = [...users].sort((a, b) => {
        const dateA = new Date(a.interaction_date || 0);
        const dateB = new Date(b.interaction_date || 0);
        return dateB - dateA;
      });
      setFilteredUsers(sorted);

      if (__DEV__) {
        console.log(`✅ [LikedMeScreen] filteredUsers set, length:`, sorted.length);
      }
    } else {
      setFilteredUsers([]);

      if (__DEV__) {
        console.log(`📭 [LikedMeScreen] filteredUsers cleared (empty)`);
      }
    }
  }, [users]);

  const loadBadgeCounts = async () => {
    try {
      const response = await interactionsAPI.getBadgeCounts();
      setBadgeCounts(response.data || {});
    } catch (error) {
      console.error('Failed to load badge counts:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let response;

      try {
        switch (activeTab) {
          case 'Matches':
            response = await interactionsAPI.getMatches();
            break;
          case 'VisitedMe':
            response = await interactionsAPI.getVisitedMe();
            break;
          case 'LikedMe':
            response = await interactionsAPI.getLikedMe();
            break;
          case 'MyFavorites':
            response = await interactionsAPI.getMyFavorites();
            break;
          case 'FavoriteMe':
            response = await interactionsAPI.getFavoriteMe();
            break;
          case 'MyVisits':
            response = await interactionsAPI.getMyVisits();
            break;
          case 'MyLikes':
            response = await interactionsAPI.getMyLikes();
            break;
          default:
            response = await interactionsAPI.getMatches();
        }

        const usersData = response.data.users || [];

        if (__DEV__) {
          console.log(`📊 [LikedMeScreen] ${activeTab} response:`, {
            usersCount: usersData.length,
            isPremium: response.data.is_premium,
            totalCount: response.data.total_count,
            firstUser: usersData[0] ? { id: usersData[0].id, name: usersData[0].name } : null
          });
        }

        // Only set users - useEffect will handle filtering
        setUsers(usersData);

        if (__DEV__) {
          console.log(`✅ [LikedMeScreen] ${activeTab} state updated, users.length:`, usersData.length);
        }
      } catch (apiError) {
        if (apiError?.response?.status === 404) {
          console.log(`ℹ️ ${activeTab} endpoint not implemented yet, showing empty state`);
          setUsers([]);
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('❌ [LikedMeScreen] Failed to load data:', error);
      setAlertConfig({
        visible: true,
        title: t('likedMe.error'),
        message: t('likedMe.failedToLoad'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      if (__DEV__) {
        console.log(`🏁 [LikedMeScreen] ${activeTab} loading finished`);
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBadgeCounts();
    loadData();
  };

  const handleSelectTab = (tabKey) => {
    if (__DEV__) {
      console.log(`👆 [LikedMeScreen] Tab clicked:`, tabKey);
    }

    // Clear data immediately when switching tabs to prevent flash of old data
    setUsers([]);
    setFilteredUsers([]);
    setActiveTab(tabKey);

    // Badge'i sıfırla (tab'a tıklandığında)
    if (badgeCounts[tabKey] > 0) {
      if (__DEV__) {
        console.log(`🔢 [LikedMeScreen] Clearing badge for:`, tabKey);
      }
      setBadgeCounts(prev => ({ ...prev, [tabKey]: 0 }));
    }
  };

  const handleUserPress = (user) => {
    navigation.navigate('UserProfileView', { userId: user.id, user });
  };

  const getProfilePhoto = (user) => {
    if (!user?.photo_urls) return null;

    try {
      let urls;
      if (typeof user.photo_urls === 'string') {
        urls = JSON.parse(user.photo_urls);
      } else {
        urls = user.photo_urls;
      }

      if (Array.isArray(urls) && urls.length > 0 && urls[0]) {
        if (urls[0].startsWith('http')) {
          return urls[0];
        }
        const baseUrl = MEDIA_BASE_URL;
        return `${baseUrl}${urls[0]}`;
      }
    } catch (error) {
      console.error('Error parsing photo_urls:', error);
    }

    return null;
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Grid Toggle Component for Header
  const renderGridToggles = () => (
    <View style={[styles.gridToggleContainer, { backgroundColor: colors.inputBackground }]}>
      <TouchableOpacity
        style={[styles.gridToggle, gridColumns === 2 && styles.gridToggleActive]}
        onPress={() => setGridColumns(2)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="view-grid"
          size={24}
          color={gridColumns === 2 ? '#FFFFFF' : colors.textSecondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.gridToggle, gridColumns === 3 && styles.gridToggleActive]}
        onPress={() => setGridColumns(3)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="apps"
          size={24}
          color={gridColumns === 3 ? '#FFFFFF' : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  const getOnlineStatus = (user) => {
    if (user.is_online) {
      return 'online';
    }
    if (user.last_active_at) {
      const lastActive = new Date(user.last_active_at);
      const now = new Date();
      const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
      if (hoursSinceActive < 24) {
        return 'recent';
      }
    }
    return 'offline';
  };

  const getGenderDisplay = (gender) => {
    if (!gender) return '';
    const g = gender.toLowerCase();
    if (g === 'man' || g === 'male' || g === 'm') return 'M';
    if (g === 'woman' || g === 'female' || g === 'f') return 'F';
    return gender.charAt(0).toUpperCase();
  };

  const renderTabBar = () => (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const badgeCount = badgeCounts[tab.key] || 0;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, { backgroundColor: colors.inputBackground }, isActive && styles.tabItemActive]}
            onPress={() => handleSelectTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
            {badgeCount > 0 && (
              <View style={[styles.badge, { borderColor: colors.surface }, badgeCount >= 99 && styles.badgeLarge]}>
                <Text style={styles.badgeText}>
                  {badgeCount >= 99 ? '+99' : badgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderUserCard = (user) => {
    const containerPadding = 16;
    const gap = 8;
    const totalGaps = (gridColumns - 1) * gap;
    const cardWidth = (width - (containerPadding * 2) - totalGaps) / gridColumns;
    const cardHeight = cardWidth * 1.4;

    // Define which tabs require premium to view
    const premiumTabs = ['LikedMe', 'VisitedMe', 'FavoriteMe'];
    const shouldBlur = !isPremium && premiumTabs.includes(activeTab);

    if (__DEV__) {
      console.log(`🎨 [renderUserCard] activeTab: ${activeTab}, isPremium: ${isPremium}, shouldBlur: ${shouldBlur}`);
    }

    // Get user data
    const photoUrl = getProfilePhoto(user);
    const age = calculateAge(user.date_of_birth);
    const onlineStatus = getOnlineStatus(user);
    const genderDisplay = getGenderDisplay(user.gender);

    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userCard, { width: cardWidth, height: cardHeight }]}
        onPress={() => shouldBlur ? setShowPremiumModal(true) : handleUserPress(user)}
        activeOpacity={0.9}
      >
        {/* User Photo (blurred if not premium) */}
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.userPhoto}
            blurRadius={shouldBlur ? 20 : 0}
          />
        ) : (
          <View style={[styles.userPhotoPlaceholder, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="person" size={40} color={colors.textTertiary} />
          </View>
        )}

        {/* Eye Overlay for Blurred Cards */}
        {shouldBlur && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconBackground}>
              <Ionicons name="eye-off" size={28} color="#FFF" />
            </View>
          </View>
        )}

        {/* Online Status (hide if blurred) */}
        {!shouldBlur && (
          <View style={styles.onlineStatusContainer}>
            <OnlineStatusDot size={10} status={onlineStatus} />
          </View>
        )}

        {/* User Info Overlay (hide details if blurred) */}
        {!shouldBlur && (
          <View style={styles.userCardOverlay}>
            <View style={styles.userCardInfo}>
              <Text style={styles.userCardName} numberOfLines={1}>
                {user.name}
              </Text>
              {age && genderDisplay && (
                <Text style={styles.userCardDetails}>{age}, {genderDisplay}</Text>
              )}
              {user.location_city && (
                <View style={styles.userCardLocationRow}>
                  <Ionicons name="location-sharp" size={11} color="#FFF" style={styles.locationIcon} />
                  <Text style={styles.userCardLocation} numberOfLines={1}>
                    {user.location_city}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <DynamicHeader
          title={t('likedMe.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightContent={renderGridToggles()}
        />
        {renderTabBar()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa1170" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('likedMe.loading')}</Text>
        </View>
        <BottomNavBar navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <DynamicHeader
        title={t('likedMe.title')}
        showHamburger={true}
        navigation={navigation}
        onPremiumPress={() => setShowPremiumModal(true)}
        rightContent={renderGridToggles()}
      />

      {/* Icon Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fa1170']} />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('likedMe.noUsers')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              {t('likedMe.checkLater')}
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredUsers.map((user) => renderUserCard(user))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar navigation={navigation} />

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

      {/* Premium Modal */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        highlightFeature="see_who_shook_back"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Tab Bar
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 2,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: '#fd0474',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeLarge: {
    minWidth: 28,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },

  // User Card
  userCard: {
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  userCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
  },
  userCardInfo: {
    gap: 3,
  },
  userCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCardDetails: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  userCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    marginRight: 2,
    opacity: 0.9,
  },
  userCardLocation: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.85,
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Grid Toggle
  gridToggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 1,
    gap: 8,
  },
  gridToggle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  gridToggleActive: {
    backgroundColor: '#6B737E',
  },

  // Lock Overlay (Premium Blur)
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 107, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
