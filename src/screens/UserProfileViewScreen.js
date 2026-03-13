import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MEDIA_BASE_URL } from '../config/api';
import { userAPI, swipeAPI, interactionsAPI } from '../services/api';
import SocketService from '../services/SocketService';
import MatchModal from '../components/MatchModal';
import OnlineStatusDot from '../components/OnlineStatusDot';
import CustomAlert from '../components/CustomAlert';
import BlockReasonModal from '../components/BlockReasonModal';
import ReportModal from '../components/ReportModal';
import { NotificationContext } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

// Move createStyles before component to avoid hoisting issues
const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },

  // Back Button - Fixed on top of photo
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },

  // Main Content
  scrollView: {
    flex: 1,
  },

  // Photo Section
  photoSection: {
    position: 'relative',
  },
  photoContainer: {
    width,
    height: width * 1.15,
    backgroundColor: colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 72,
    fontWeight: '600',
    color: isDarkMode ? '#6B7280' : '#9CA3AF',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  info: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  statusDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    opacity: 0.6,
  },
  distanceText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  photoNavButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  photoNavLeft: {
    left: 16,
  },
  photoNavRight: {
    right: 16,
  },

  // Photo Indicators
  photoIndicators: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  photoIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },

  // Info Section
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 8,
  },
  verifiedBadgeContainer: {
    marginLeft: 4,
    marginTop: 4,
  },
  userAge: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  userLocation: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  onlineStatusText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  offlineStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Bio
  bioSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bioCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: isDarkMode ? 1 : 0.5,
    borderColor: colors.border,
    shadowColor: isDarkMode ? '#000' : colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 2,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  bioText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  noBioText: {
    fontSize: 15,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Details Grid
  detailsGrid: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: isDarkMode ? 1 : 0.5,
    borderColor: colors.border,
    shadowColor: isDarkMode ? '#000' : colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 2,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // Badges Section
  badgesSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#064E3B' : '#D1FAE5',
  },
  badgeBlue: {
    backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE',
  },
  badgeGray: {
    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? '#D1D5DB' : '#4B5563',
    marginLeft: 6,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  likeButton: {
    backgroundColor: '#f90e6e',
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dislikeButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dislikeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
    justifyContent: 'space-evenly',
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomActionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
    shadowColor: isDarkMode ? '#000' : '#656565',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Chat Button
  chatButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chatButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatButtonIcon: {
    marginLeft: 8,
  },

  // About Card & Tags
  aboutCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: isDarkMode ? 1 : 0.5,
    borderColor: colors.border,
    shadowColor: isDarkMode ? '#000' : colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 2,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagVerified: {
    backgroundColor: '#DBEAFE',
  },
  tagNeutral: {
    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? '#D1D5DB' : '#374151',
  },

  // Report/Block Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  reportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  blockButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
  },
  blockButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unblockButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    alignItems: 'center',
  },
  unblockButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default function UserProfileViewScreen({ route, navigation }) {
  const { userId, user: initialUser } = route.params;
  const { showCustomNotification } = useContext(NotificationContext);
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const notifyTimeoutRef = useRef(null); // For throttling notifications
  const [matchedUser, setMatchedUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  useEffect(() => {
    // Load profile first, then other API calls with delays to prevent rate limiting
    const loadProfileData = async () => {
      await loadUserProfile();

      // Delay to prevent rate limiting
      setTimeout(() => {
        loadCurrentUser();
      }, 300);

      // Notify after a longer delay (this is not critical)
      setTimeout(() => {
        notifyProfileView();
      }, 600);
    };

    loadProfileData();

    // Subscribe to socket events
    const handleUserOnline = ({ userId: onlineUserId }) => {
      console.log('🟢 User online in profile view:', onlineUserId);
      if (onlineUserId === userId) {
        setIsUserOnline(true);
      }
    };

    const handleUserOffline = ({ userId: offlineUserId }) => {
      console.log('🔴 User offline in profile view:', offlineUserId);
      if (offlineUserId === userId) {
        setIsUserOnline(false);
      }
    };

    SocketService.on('user_online', handleUserOnline);
    SocketService.on('user_offline', handleUserOffline);

    return () => {
      // Clear notification timeout
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }

      // Cleanup socket listeners
      console.log('🧹 Cleaning up UserProfileViewScreen socket listeners');
      SocketService.off('user_online', handleUserOnline);
      SocketService.off('user_offline', handleUserOffline);
    };
  }, [userId]);

  const loadCurrentUser = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setCurrentUserData(data.user);
    } catch (error) {
      console.error('❌ Failed to load current user:', error);
    }
  };

  const notifyProfileView = async () => {
    // Clear any pending notification
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }

    // Throttle notifications - only send after 1 second of inactivity
    notifyTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('📤 Sending profile view notification for user:', userId, 'Type:', typeof userId);
        const response = await userAPI.notifyProfileView(userId);
        console.log('✅ Profile view notification sent:', response.data);
      } catch (error) {
        // Silently ignore 429 errors - user is viewing profiles too fast
        if (error.response?.status === 429) {
          console.log('⏱️ Rate limited on profile view notification (ignored)');
        } else {
          console.error('❌ Failed to send profile view notification:', error);
          console.error('❌ Error response:', error.response?.data);
          console.error('❌ Error status:', error.response?.status);
        }
        // Don't show error to user - this is a silent operation
      }
    }, 1000); // Wait 1 second before sending
  };

  const loadUserProfile = async () => {
    try {
      console.log('📥 Loading full user profile:', userId);
      const { data } = await userAPI.getUserProfile(userId);
      console.log('✅ User profile loaded:', data.user);
      setUser(data.user);
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToLoad', { message: error.response?.data?.message || error.message }),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrls = () => {
    if (!user?.photo_urls) return [];

    try {
      let urls;
      if (typeof user.photo_urls === 'string') {
        urls = JSON.parse(user.photo_urls);
      } else {
        urls = Array.isArray(user.photo_urls) ? user.photo_urls : [];
      }

      return urls
        .filter(url => url)
        .map(url => MEDIA_BASE_URL + url);
    } catch (e) {
      console.log('Error parsing photo URLs:', e);
      return [];
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return user?.age || null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderInitial = (gender) => {
    if (!gender) return 'M';
    const genderLower = gender.toLowerCase();
    if (genderLower === 'woman' || genderLower === 'female') return 'F';
    if (genderLower === 'man' || genderLower === 'male') return 'M';
    if (genderLower === 'non-binary') return 'NB';
    return gender.charAt(0).toUpperCase();
  };

  const getOnlineStatus = () => {
    // Check real-time socket status first, then API response
    if (isUserOnline || user?.is_online) {
      return { status: 'online', text: t('userProfile.online') };
    }

    if (!user?.last_active_at) {
      return { status: 'offline', text: t('userProfile.offline') };
    }

    const lastActive = new Date(user.last_active_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    if (diffMinutes < 5) {
      return { status: 'online', text: t('userProfile.online') };
    } else if (diffMinutes < 30) {
      return { status: 'recent', text: t('userProfile.minutesAgo', { minutes: diffMinutes }) };
    } else if (diffMinutes < 60) {
      return { status: 'recent', text: t('userProfile.recently') };
    } else {
      return { status: 'offline', text: t('userProfile.offline') };
    }
  };

  const formatDistance = (distance) => {
    if (!distance && distance !== 0) return null;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`; // Convert to meters if less than 1km
    }

    return `${Math.round(distance)}km`;
  };

  const formatJoinDate = () => {
    if (!user?.created_at) return t('userProfile.joinedMonthsAgo', { months: 10 });
    const joinDate = new Date(user.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return t('userProfile.joinedThisWeek');
    if (diffDays < 30) return t('userProfile.joinedWeeksAgo', { weeks: Math.floor(diffDays / 7) });
    if (diffDays < 365) return t('userProfile.joinedMonthsAgo', { months: Math.floor(diffDays / 30) });
    return t('userProfile.joinedYearsAgo', { years: Math.floor(diffDays / 365) });
  };

  const handlePhotoAreaPress = (evt) => {
    const fullPhotoUrls = getPhotoUrls();
    if (fullPhotoUrls.length <= 1) return;

    const { locationX } = evt.nativeEvent;
    const screenWidth = width;
    const midpoint = screenWidth / 2;

    if (locationX > midpoint) {
      // Next
      setCurrentPhotoIndex((prev) =>
        prev < fullPhotoUrls.length - 1 ? prev + 1 : prev
      );
    } else {
      // Previous
      setCurrentPhotoIndex((prev) =>
        prev > 0 ? prev - 1 : prev
      );
    }
  };

  const handleChatPress = async () => {
    try {
      console.log('💬 Creating or getting match for user:', user.id);
      const { data } = await swipeAPI.getOrCreateMatch(user.id);
      console.log('✅ Match data:', data);

      navigation.navigate('Chat', {
        match: {
          match_id: data.match_id,
          user: data.user,
        }
      });
    } catch (error) {
      console.error('❌ Failed to create/get match:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToStartChat'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleSendMessagePress = () => {
    if (user?.match_id) {
      // Navigate to chat with this match
      navigation.navigate('Chat', {
        matchId: user.match_id,
        otherUser: user,
      });
    } else {
      // No match yet, show info
      setAlertConfig({
        visible: true,
        title: t('userProfile.noMatchYet'),
        message: t('userProfile.youLiked', { name: user?.name }),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleLikePress = async () => {
    try {
      console.log('💖 Sending like to user:', userId);
      const { data } = await swipeAPI.swipe(userId, 'like');
      console.log('✅ Like response:', data);

      // Check if it's a match
      if (data.match) {
        console.log('🎉 It\'s a match!');
        setMatchedUser(user);
        setShowMatchModal(true);
      } else {
        // Just a like, show notification banner and go back
        showCustomNotification({
          type: 'like_sent',
          name: user?.name,
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Failed to send like:', error);

      // Check if it's a 409 Conflict (already liked)
      if (error.response?.status === 409) {
        // User already liked, reload profile to get updated state
        loadUserProfile();
      } else {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('userProfile.errors.failedToLike'),
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
      }
    }
  };

  const handleDislikePress = async () => {
    try {
      console.log('👎 Sending pass to user:', userId);
      await swipeAPI.swipe(userId, 'pass');
      console.log('✅ Pass sent successfully');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Failed to send pass:', error);
      navigation.goBack();
    }
  };

  const handleFavoritePress = async () => {
    try {
      console.log('⭐ Toggling favorite for user:', userId);
      const { data } = await interactionsAPI.toggleFavorite(userId);
      console.log('✅ Favorite response:', data);

      // Show notification based on action
      showCustomNotification({
        type: data.action === 'added' ? 'favorite_added' : 'favorite_removed',
        name: user?.name || data.user_name,
      });
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToUpdateFavorites'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleBlockPress = () => {
    setShowBlockModal(true);
  };

  const handleBlockConfirm = async (reason) => {
    setShowBlockModal(false);

    try {
      console.log('🚫 Blocking user:', userId, 'with reason:', reason);
      await userAPI.blockUser(userId, reason);

      // Update user state to reflect block status
      setUser(prevUser => ({
        ...prevUser,
        is_blocked: true,
      }));

      // Show notification that user has been blocked
      showCustomNotification({
        type: 'user_blocked',
        message: `${user?.name} has been blocked`,
      });

      // Navigate back after a short delay to let the notification appear
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('❌ Failed to block user:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToBlock'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleBlockCancel = () => {
    setShowBlockModal(false);
  };

  const handleReportPress = () => {
    setShowReportModal(true);
  };

  const handleReportConfirm = async (reason, description) => {
    setShowReportModal(false);

    try {
      console.log('🚨 Reporting user:', userId, 'with reason:', reason);
      await userAPI.reportUser(userId, reason, description);

      // Show success notification
      showCustomNotification({
        type: 'user_hidden',
        message: t('chat.reportSubmitted'),
      });

      console.log('✅ Report submitted successfully');
    } catch (error) {
      console.error('❌ Failed to report user:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToReport'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleReportCancel = () => {
    setShowReportModal(false);
  };

  const handleUnblockPress = async () => {
    try {
      console.log('🔓 Unblocking user:', userId);
      await userAPI.unblockUser(userId);

      // Update user state to reflect unblock status
      setUser(prevUser => ({
        ...prevUser,
        is_blocked: false,
      }));

      // Show notification that user has been unblocked
      showCustomNotification({
        type: 'user_unblocked',
        message: `${user?.name} has been unblocked`,
      });
    } catch (error) {
      console.error('❌ Failed to unblock user:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('userProfile.errors.failedToUnblock'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa1170" />
          <Text style={styles.loadingText}>{t('userProfile.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('userProfile.userNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullPhotoUrls = getPhotoUrls();
  const age = calculateAge(user.date_of_birth);
  const gender = getGenderInitial(user.gender);
  const location = user.location_city || 'Bangkok';
  const onlineStatus = getOnlineStatus();
  const distanceText = formatDistance(user.distance);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* Match Modal */}
      <MatchModal
        visible={showMatchModal}
        currentUser={currentUserData}
        matchedUser={matchedUser}
        onClose={() => {
          setShowMatchModal(false);
          navigation.goBack();
        }}
        onSendMessage={(matchUser) => {
          setShowMatchModal(false);
          // TODO: Navigate to chat screen
          setAlertConfig({
            visible: true,
            title: t('userProfile.chat'),
            message: t('userProfile.startChatting', { name: matchUser?.name }),
            onConfirm: () => {
              setAlertConfig({ ...alertConfig, visible: false });
              navigation.goBack();
            },
            onCancel: () => {
              setAlertConfig({ ...alertConfig, visible: false });
              navigation.goBack();
            }
          });
        }}
      />

      {/* Block Reason Modal */}
      <BlockReasonModal
        visible={showBlockModal}
        userName={user?.name}
        onConfirm={handleBlockConfirm}
        onCancel={handleBlockCancel}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        userName={user?.name}
        onConfirm={handleReportConfirm}
        onCancel={handleReportCancel}
      />

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Photo with Slider */}
        <View style={styles.photoSection}>
          {/* Back Button - Fixed on photo */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoContainer}
            activeOpacity={1}
            onPress={handlePhotoAreaPress}
          >
            {fullPhotoUrls.length > 0 ? (
              <>
                <Image
                  source={{ uri: fullPhotoUrls[currentPhotoIndex] }}
                  style={styles.photo}
                />

                {/* Photo indicators */}
                {fullPhotoUrls.length > 1 && (
                  <View style={styles.photoIndicators}>
                    {fullPhotoUrls.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.photoIndicator,
                          index === currentPhotoIndex && styles.photoIndicatorActive
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{t('userProfile.noPhoto')}</Text>
              </View>
            )}

            {/* Gradient Overlay for User Info */}
            <View style={styles.gradient}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.name}</Text>
                {user.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.info}>
                {age} / {gender} / {location}, {user.location_country || 'Thailand'}
              </Text>

              {/* Online Status and Distance */}
              <View style={styles.statusRow}>
                <OnlineStatusDot status={onlineStatus.status} size={8} />
                <Text style={styles.statusText}>{onlineStatus.text}</Text>
                {distanceText && (
                  <>
                    <View style={styles.statusDivider} />
                    <Text style={styles.distanceText}>{distanceText}</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Chat Button - Moved to top */}
        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChatPress}
            activeOpacity={0.8}
          >
            <Text style={styles.chatButtonText}>{t('userProfile.chatWith', { name: user.name })}</Text>
          </TouchableOpacity>
        </View>

        {/* About - Tag Based */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>{t('userProfile.about')}</Text>
          <View style={styles.tagsContainer}>
            {/* Online Status Tag */}
            <View style={[
              styles.tag,
              {
                backgroundColor: onlineStatus.status === 'online' ? '#10B981' :
                                  onlineStatus.status === 'recent' ? '#FEF3C7' :
                                  '#FEE2E2'
              }
            ]}>
              <OnlineStatusDot status={onlineStatus.status} size={8} />
              <Text style={[styles.tagText, onlineStatus.status === 'online' && { color: '#FFFFFF' }]}>
                {onlineStatus.text}
              </Text>
            </View>

            {/* Photo Verified Tag */}
            {user.is_verified && (
              <View style={[styles.tag, styles.tagVerified]}>
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                <Text style={styles.tagText}>{t('userProfile.photoVerified')}</Text>
              </View>
            )}

            {/* Distance Tag */}
            {distanceText && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Text style={styles.tagText}>{distanceText}</Text>
              </View>
            )}

            {/* Height Tag */}
            {user.height && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Text style={styles.tagText}>{user.height}cm</Text>
              </View>
            )}

            {/* Weight Tag */}
            {user.weight && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Text style={styles.tagText}>{user.weight}kg</Text>
              </View>
            )}

            {/* Joined Tag */}
            <View style={[styles.tag, styles.tagNeutral]}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.tagText}>{formatJoinDate()}</Text>
            </View>

            {/* Looking For Tag */}
            {user.interested_in && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Text style={styles.tagText}>
                  {t('userProfile.lookingFor', { interested_in: user.interested_in.charAt(0).toUpperCase() + user.interested_in.slice(1) })}
                </Text>
              </View>
            )}

            {/* Education Tag */}
            {user.education && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Ionicons name="school-outline" size={14} color="#6B7280" />
                <Text style={styles.tagText}>{({'High School': t('filters.lifestyle.highSchool'), 'Bachelor': t('filters.lifestyle.bachelor'), 'Master': t('filters.lifestyle.master'), 'PhD': t('filters.lifestyle.phd')})[user.education] || user.education}</Text>
              </View>
            )}

            {/* English Ability Tag */}
            {user.english_ability && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <Ionicons name="language-outline" size={14} color="#6B7280" />
                <Text style={styles.tagText}>{user.english_ability}</Text>
              </View>
            )}

            {/* Have Children Tag */}
            {user.have_children && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <MaterialCommunityIcons name="baby-face-outline" size={14} color="#6B7280" />
                <Text style={styles.tagText}>{user.have_children}</Text>
              </View>
            )}

            {/* Want Children Tag */}
            {user.want_children && (
              <View style={[styles.tag, styles.tagNeutral]}>
                <MaterialCommunityIcons name="human-male-female-child" size={14} color="#6B7280" />
                <Text style={styles.tagText}>{user.want_children}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio Section - If exists */}
        {user.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>{t('userProfile.bio')}</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportPress}
            activeOpacity={0.7}
          >
            <Text style={styles.reportButtonText}>{t('userProfile.report')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={user?.is_blocked ? styles.unblockButton : styles.blockButton}
            onPress={user?.is_blocked ? handleUnblockPress : handleBlockPress}
            activeOpacity={0.7}
          >
            <Text style={user?.is_blocked ? styles.unblockButtonText : styles.blockButtonText}>
              {user?.is_blocked ? t('userProfile.unblock') : t('userProfile.block')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.bottomActionButton}
            onPress={handleDislikePress}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={38} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomActionButton}
            onPress={user?.already_liked || user?.match_id ? handleChatPress : handleLikePress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={user?.already_liked || user?.match_id ? "mail" : "heart"}
              size={38}
              color={user?.already_liked || user?.match_id ? (isDarkMode ? "#E5E7EB" : "#6d737d") : "#fa1170"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomActionButton}
            onPress={handleFavoritePress}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={38} color="#FFB800" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

