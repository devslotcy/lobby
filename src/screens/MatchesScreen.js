import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { swipeAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import DynamicHeader from '../components/DynamicHeader';
import CustomAlert from '../components/CustomAlert';
import InteractionBadge from '../components/InteractionBadge';
import PremiumModal from '../components/PremiumModal';
import SocketService from '../services/SocketService';
import { useInteraction } from '../context/InteractionContext';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 3.5 - 3; // 3.5 cards visible, 8px narrower

export default function MatchesScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [alertVisible, setAlertVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [wavingMatchId, setWavingMatchId] = useState(null); // Track which match is being waved
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const swipeableRefs = useRef({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });

  // Use global interaction context
  const { interactionCount, markAsRead } = useInteraction();
  const { showToast } = useToast();

  // Create styles early - must be before any conditional returns
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  useEffect(() => {
    loadMatches();

    // Listen for navigation focus to refresh matches
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📍 MatchesScreen focused, refreshing matches');
      loadMatches();
    });

    // Listen for user online/offline status
    SocketService.on('user_online', ({ userId }) => {
      console.log('🟢 User online:', userId);
      setOnlineUsers((prev) => new Set([...prev, userId]));
      // Update last_active_at for this user in matches
      setMatches((prev) =>
        prev.map((match) =>
          match.user.id === userId
            ? { ...match, user: { ...match.user, last_active_at: new Date().toISOString() } }
            : match
        )
      );
    });

    SocketService.on('user_offline', ({ userId }) => {
      console.log('🔴 User offline:', userId);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    SocketService.on('new_match', (data) => {
      console.log('🎉 New match event received:', data);
      // Refresh matches list
      loadMatches();
    });

    SocketService.on('new_message', () => {
      console.log('💬 New message received, updating badge count');
      // Refresh matches to update unread count
      loadMatches();
    });

    return () => {
      unsubscribe();
      SocketService.off('user_online');
      SocketService.off('user_offline');
      SocketService.off('new_match');
      SocketService.off('new_message');
    };
  }, [navigation]);

  const loadMatches = async () => {
    try {
      const { data } = await swipeAPI.getMatches();
      console.log('📬 Matches loaded:', data.matches?.length, 'matches');
      console.log('📬 Matches data:', JSON.stringify(data.matches?.slice(0, 3), null, 2));
      setMatches(data.matches || []);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: t('errors.loadMatches'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
  };

  const handleUnmatch = async (matchId) => {
    try {
      await swipeAPI.unmatch(matchId);
      // Remove from local state
      setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
      // Close swipeable
      if (swipeableRefs.current[matchId]) {
        swipeableRefs.current[matchId].close();
      }
    } catch (error) {
      console.error('Failed to unmatch:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: t('errors.unmatch'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const confirmUnmatch = (match) => {
    setSelectedMatch(match);
    setAlertVisible(true);
  };

  const renderRightActions = (progress, dragX, match) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmUnmatch(match)}
        >
          <Text style={styles.deleteText}>×</Text> 
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getPhotoUrl = (photoUrls) => {
    if (!photoUrls) return null;
    try {
      // photo_urls zaten string olabilir veya array olabilir
      let urls;
      if (typeof photoUrls === 'string') {
        urls = JSON.parse(photoUrls);
      } else {
        urls = photoUrls;
      }

      if (urls && urls.length > 0) {
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      console.log('Error parsing photo URLs:', e);
      return null;
    }
    return null;
  };

  const getOnlineStatus = (userId, lastActiveAt) => {
    // Check real-time online status first
    if (onlineUsers.has(userId)) {
      return { color: '#10B981', text: 'Online' }; // Green - online
    }

    if (!lastActiveAt) {
      return { color: '#EF4444', text: 'Offline' }; // Red - offline
    }

    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    if (diffMinutes < 5) {
      return { color: '#10B981', text: 'Online' }; // Green - online
    } else if (diffMinutes < 60) {
      return { color: '#F59E0B', text: `${diffMinutes}m ago` }; // Orange - recent
    } else if (diffMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffMinutes / 60);
      return { color: '#F59E0B', text: `${hours}h ago` }; // Orange
    } else {
      return { color: '#EF4444', text: 'Offline' }; // Red - offline
    }
  };

  // Get new matches (no messages sent yet)
  const getNewMatches = () => {
    const newMatches = matches.filter(match => {
      const count = parseInt(match.message_count) || 0;
      return count === 0;
    });
    console.log('🆕 New matches (no messages):', newMatches.length);
    return newMatches;
  };

  // Get conversations (matches with messages)
  const getConversations = () => {
    const convos = matches.filter(match => {
      const count = parseInt(match.message_count) || 0;
      return count > 0;
    });
    console.log('💬 Conversations (with messages):', convos.length);
    return convos;
  };

  // Handle wave (send wave emoji as first message)
  const handleWave = async (match) => {
    try {
      setWavingMatchId(match.match_id);

      // Send wave emoji via WebSocket
      SocketService.emit('send_message', {
        match_id: match.match_id,
        content: '👋'
      });

      // Show toast notification
      showToast(`👋 ${t('matches.youWavedAt', { name: match.user.name })}`, 2000);

      // Refresh matches to update the list
      await loadMatches();
    } catch (error) {
      console.error('Failed to send wave:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('errors.sendWave'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false }),
        confirmText: t('common.ok'),
        cancelText: null,
      });
    } finally {
      setWavingMatchId(null);
    }
  };

  // Render new match card for horizontal scroll
  const renderNewMatchCard = (match) => {
    const photoUrl = getPhotoUrl(match.user.photo_urls);
    const isShakeMatch = match.match_type === 'shake';
    const isWaving = wavingMatchId === match.match_id;

    return (
      <View key={match.match_id} style={styles.newMatchCard}>
        <TouchableOpacity
          style={styles.newMatchImageContainer}
          onPress={() => navigation.navigate('Chat', { match })}
          activeOpacity={0.9}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.newMatchImage} />
          ) : (
            <View style={styles.newMatchImagePlaceholder}>
              <Text style={styles.newMatchImagePlaceholderText}>
                {match.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* SHAKE badge */}
          {isShakeMatch && (
            <View style={styles.shakeBadge}>
              <Text style={styles.shakeBadgeText}>SHAKE</Text>
            </View>
          )}

          {/* Gradient overlay for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.newMatchGradient}
          />

          {/* Name overlay */}
          <View style={styles.newMatchNameOverlay}>
            <Text style={styles.newMatchDate}>
              {(() => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const dateStr = match.matched_at || match.created_at;
                if (!dateStr) return '';
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return '';
                return `${date.getDate()} ${months[date.getMonth()]}`;
              })()}
            </Text>
            <Text style={styles.newMatchName} numberOfLines={1}>
              {match.user.name}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Wave button */}
        <TouchableOpacity
          style={[styles.waveButton, isWaving && styles.waveButtonDisabled]}
          onPress={() => handleWave(match)}
          disabled={isWaving}
          activeOpacity={0.7}
        >
          <Text style={styles.waveButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
            {isWaving ? t('common.loading') : `${t('matches.wave')} 👋`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleHeartPress = async () => {
    navigation.navigate('LikedMe');
    // Mark interactions as read when user opens the page
    await markAsRead();
  };

  const renderMatch = ({ item }) => {
    const photoUrl = getPhotoUrl(item.user.photo_urls);
    const onlineStatus = getOnlineStatus(item.user.id, item.user.last_active_at);
    const isShakeMatch = item.match_type === 'shake';

    // Determine message count text
    let messageText = '';
    if (item.unread_count > 0) {
      messageText = t('matches.unreadCount', { count: item.unread_count });
    } else if (item.received_message_count > 0) {
      messageText = t('matches.receivedCount', { count: item.received_message_count });
    } else if (item.message_count > 0) {
      messageText = item.message_count > 1
        ? t('matches.messagesCount', { count: item.message_count })
        : t('matches.messageCount', { count: item.message_count });
    }

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[item.match_id] = ref;
          }
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={styles.matchCard}
          onPress={() => navigation.navigate('Chat', { match: item })}
          activeOpacity={0.9}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.matchInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.matchName}>
                {item.user.name}, {item.user.age}
              </Text>
              {item.user.is_verified && <Text style={styles.verifiedBadge}>✓</Text>}
              {isShakeMatch && (
                <View style={styles.shakeMatchBadge}>
                  <Text style={styles.shakeMatchBadgeText}>SHAKE</Text>
                </View>
              )}
            </View>

            {/* Online Status */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: onlineStatus.color }]} />
              <Text style={[styles.statusText, { color: onlineStatus.color }]}>
                {onlineStatus.text}
              </Text>
            </View>

            <Text style={styles.messageCount}>{messageText}</Text>
          </View>

          <View style={styles.chevron}>
            <Text style={styles.chevronText}>›</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <DynamicHeader
          title={t('matches.title')}
          showHamburger={true}
          navigation={navigation}
          onPremiumPress={() => setShowPremiumModal(true)}
          rightIcons={[
            {
              name: 'heart',
              onPress: handleHeartPress,
              size: 28,
              color: '#fa1170',
              badge: interactionCount,
              animated: false,
            },
          ]}
        />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </SafeAreaView>
    );
  }

  const newMatches = getNewMatches();
  const conversations = getConversations();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DynamicHeader
        title={t('matches.title')}
        showHamburger={true}
        navigation={navigation}
        onPremiumPress={() => setShowPremiumModal(true)}
        rightIcons={[
          {
            name: 'heart',
            onPress: handleHeartPress,
            size: 28,
            color: '#fa1170',
            badge: interactionCount,
            animated: false,
          },
        ]}
      />

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#fa1170']}
            tintColor="#fa1170"
          />
        }
      >
        {/* New Matches Section */}
        {newMatches.length > 0 && (
          <View style={styles.newMatchesSection}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newMatchesScroll}
            >
              {newMatches.map(match => renderNewMatchCard(match))}
            </ScrollView>
            <View style={styles.newMatchesBorder} />
          </View>
        )}

        {/* Messages Section */}
        {conversations.length > 0 && (
          <View style={styles.messagesSection}>
            {conversations.map(match => (
              <View key={match.match_id}>
                {renderMatch({ item: match })}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Empty state when no matches at all - centered on screen */}
      {matches.length === 0 && (
        <View style={styles.emptyContainerCentered}>
          <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>{t('matches.noMatches')}</Text>
          <Text style={[styles.emptySubtext, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>{t('matches.keepSwiping')}</Text>
        </View>
      )}

      {/* Custom Alert for Unmatch */}
      {selectedMatch && (
        <CustomAlert
          visible={alertVisible}
          title={t('matches.unmatch')}
          message={t('matches.unmatchConfirm', { name: selectedMatch.user.name })}
          onConfirm={() => {
            setAlertVisible(false);
            handleUnmatch(selectedMatch.match_id);
            setSelectedMatch(null);
          }}
          onCancel={() => {
            setAlertVisible(false);
            setSelectedMatch(null);
            // Close the swipeable
            if (swipeableRefs.current[selectedMatch.match_id]) {
              swipeableRefs.current[selectedMatch.match_id].close();
            }
          }}
          confirmText={t('matches.unmatch')}
          cancelText="Cancel"
        />
      )}

      {/* Custom Alert for Errors */}
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
      />
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  // Scroll container
  scrollContainer: {
    flex: 1,
  },
  // New Matches Section
  newMatchesSection: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  newMatchesScroll: {
    paddingHorizontal: 15,
    gap: 10,
  },
  newMatchesBorder: {
    marginHorizontal: 15,
    marginTop: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newMatchCard: {
    width: CARD_WIDTH,
    marginRight: 0,
  },
  newMatchImageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3 - 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.cardBackground,
  },
  newMatchImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
  },
  newMatchImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fa1170',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newMatchImagePlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  newMatchNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  newMatchGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  newMatchDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  newMatchName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  onlineIndicatorContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  shakeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shakeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  waveButton: {
    backgroundColor: isDarkMode ? colors.card : '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  waveButtonDisabled: {
    opacity: 0.6,
  },
  waveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? colors.textPrimary : '#6B7280',
  },
  // Messages Section
  messagesSection: {
    paddingHorizontal: 15,
    paddingTop: 1,
    paddingBottom: 20,
  },
  emptyMessagesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // SHAKE badge for message cards
  shakeMatchBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  shakeMatchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
    paddingVertical: 0,
    paddingLeft: 0,
    backgroundColor: isDarkMode ? colors.card : '#FFFFFF',
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: isDarkMode ? '#000' : colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.12,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 2,
    overflow: 'hidden',
    borderWidth: isDarkMode ? 1 : 0.5,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: isDarkMode ? colors.surface : '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#fa1170',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    fontSize: 14,
    color: '#4285F4',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 15,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  matchBio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  messageCount: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  chevron: {
    marginLeft: 10,
  },
  chevronText: {
    fontSize: 24,
    color: colors.border,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainerCentered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Swipe to Delete
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: 8,
    marginBottom: 3,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    paddingHorizontal: 15,
  },
  deleteText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '300',
    marginRight: 16,
    marginTop: -8,
  },
  deleteLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Heart Button
  heartButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
