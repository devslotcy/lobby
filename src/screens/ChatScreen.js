import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageAPI, userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import NotificationService from '../services/NotificationService';
import SocketService from '../services/SocketService';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import OnlineStatusDot from '../components/OnlineStatusDot';
import CustomAlert from '../components/CustomAlert';
import ReportModal from '../components/ReportModal';
import BlockReasonModal from '../components/BlockReasonModal';
import PremiumModal from '../components/PremiumModal';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';

const MESSAGE_COOLDOWN_MS = 10 * 60 * 1000; // 10 dakika

const getCooldownKey = (matchId, userId) => `msg_cooldown_${matchId}_${userId}`;

const { width, height } = Dimensions.get('window');

// 10 Positive, intriguing conversation starters in English with emojis
const ALL_CONVERSATION_STARTERS = [
  "😊 What's something that made you smile today?",
  "✈️ If you could travel anywhere right now, where would you go?",
  "🎉 What's your favorite way to spend a weekend?",
  "💫 Tell me about something you're passionate about!",
  "🌟 What's the best adventure you've ever had?",
  "🍽️ If you could have dinner with anyone, who would it be?",
  "🚀 What's something new you'd love to try?",
  "☀️ What's your idea of a perfect day?",
  "✨ What's the most interesting thing about you?",
  "😂 What always makes you laugh?",
];

// Get 2 random conversation starters
const getRandomStarters = () => {
  const shuffled = [...ALL_CONVERSATION_STARTERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
};

export default function ChatScreen({ route, navigation }) {
  const { match } = route.params;
  const { user } = useContext(AuthContext);
  const { setCurrentChatMatchId } = useContext(NotificationContext);
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { isPremium } = useSubscription();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // saniye cinsinden
  const cooldownIntervalRef = useRef(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [conversationStarters] = useState(() => getRandomStarters());
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isUserTypingRef = useRef(false);
  const lastMessageRef = useRef('');
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const startCooldownTimer = (remainingMs) => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    setCooldownRemaining(Math.ceil(remainingMs / 1000));
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    loadMessages();
    setupSocketListeners();

    // Tell notification context that we're in this chat
    setCurrentChatMatchId(match.match_id);

    // Cooldown kontrolü: free kullanıcı ise kalan süreyi yükle
    if (!isPremium) {
      AsyncStorage.getItem(getCooldownKey(match.match_id, user.id)).then(value => {
        if (value) {
          const lastSent = parseInt(value, 10);
          const elapsed = Date.now() - lastSent;
          if (elapsed < MESSAGE_COOLDOWN_MS) {
            startCooldownTimer(MESSAGE_COOLDOWN_MS - elapsed);
          }
        }
      });
    }

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollToBottom(), 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      // Clear current chat when leaving
      setCurrentChatMatchId(null);
      cleanupSocketListeners();
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [match.match_id, isPremium]);

  const loadMessages = async () => {
    try {
      const { data } = await messageAPI.getMessages(match.match_id);
      setMessages(data.messages);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: t('chat.errors.failedToLoad'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const setupSocketListeners = () => {
    console.log('🔌 [ChatScreen] Setting up socket listeners');

    SocketService.on('connect', () => {
      console.log('🟢 Socket connected, user:', user.id);
    }, 'chat');

    SocketService.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
    }, 'chat');

    SocketService.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    }, 'chat');

    SocketService.on('new_message', (message) => {
      console.log('📨 New message received:', message);

      // Show notification if app is in background
      NotificationService.showMessageNotification({
        senderName: message.sender_name,
        messageContent: message.content,
        matchId: message.match_id,
        senderPhoto: message.sender_photo,
      });

      setMessages((prev) => {
        // Mesajı sadece bir kere ekle, duplicate kontrolü yap
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          console.log('⚠️ Duplicate message detected, skipping');
          return prev;
        }
        return [...prev, message];
      });
      setTimeout(() => scrollToBottom(), 50);
    }, 'chat');

    SocketService.on('message_sent', (message) => {
      console.log('✅ Message sent confirmation:', message);
      setMessages((prev) => {
        // Aynı content'e sahip en son temp mesajı bul
        const tempIndex = prev.findIndex(m =>
          m.tempId &&
          m.content === message.content &&
          m.sender_id === message.sender_id
        );

        if (tempIndex !== -1) {
          // Temp mesajı gerçek mesajla değiştir
          console.log('🔄 Replacing temp message with real message');
          const updated = [...prev];
          updated[tempIndex] = message;
          return updated;
        }

        // Eğer temp mesaj yoksa (örn. sayfa yenilendiyse), duplicate check yap
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          console.log('⚠️ Duplicate message detected, skipping');
          return prev;
        }

        console.log('➕ Adding message (no temp found)');
        return [...prev, message];
      });
    }, 'chat');

    SocketService.on('user_typing', () => {
      setIsTyping(true);
    }, 'chat');

    SocketService.on('user_stopped_typing', () => {
      setIsTyping(false);
    }, 'chat');

    SocketService.on('error', (error) => {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: error.message,
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }, 'chat');

    // Listen for online/offline events
    SocketService.on('user_online', ({ userId }) => {
      console.log('🟢 User came online:', userId);
      if (userId === match.user.id) {
        setIsOtherUserOnline(true);
      }
    }, 'chat');

    SocketService.on('user_offline', ({ userId }) => {
      console.log('🔴 User went offline:', userId);
      if (userId === match.user.id) {
        setIsOtherUserOnline(false);
      }
    }, 'chat');
  };

  const cleanupSocketListeners = () => {
    console.log('🧹 [ChatScreen] Cleaning up socket listeners');
    SocketService.off('connect', 'chat');
    SocketService.off('disconnect', 'chat');
    SocketService.off('reconnect', 'chat');
    SocketService.off('new_message', 'chat');
    SocketService.off('message_sent', 'chat');
    SocketService.off('user_typing', 'chat');
    SocketService.off('user_stopped_typing', 'chat');
    SocketService.off('user_online', 'chat');
    SocketService.off('user_offline', 'chat');
    SocketService.off('error', 'chat');
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !SocketService.isConnected()) return;

    // Free kullanıcı cooldown kontrolü
    if (!isPremium) {
      const value = await AsyncStorage.getItem(getCooldownKey(match.match_id, user.id));
      if (value) {
        const lastSent = parseInt(value, 10);
        const elapsed = Date.now() - lastSent;
        if (elapsed < MESSAGE_COOLDOWN_MS) {
          startCooldownTimer(MESSAGE_COOLDOWN_MS - elapsed);
          return;
        }
      }
    }

    const messageContent = inputText.trim();

    // Aynı mesajı tekrar göndermeyi engelle (300ms içinde)
    if (lastMessageRef.current === messageContent) {
      console.log('⚠️ Duplicate send attempt blocked');
      return;
    }

    lastMessageRef.current = messageContent;
    setTimeout(() => {
      lastMessageRef.current = '';
    }, 300);

    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Optimistic UI update - mesajı hemen ekle
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
      match_id: match.match_id,
      sender_id: user.id,
      sender_name: user.name,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    console.log('📤 Sending message (optimistic):', messageContent, 'tempId:', tempId);

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    stopTyping();

    // Free kullanıcı: cooldown başlat
    if (!isPremium) {
      await AsyncStorage.setItem(getCooldownKey(match.match_id, user.id), Date.now().toString());
      startCooldownTimer(MESSAGE_COOLDOWN_MS);
    }

    // Backend'e gönder
    SocketService.emit('send_message', {
      match_id: match.match_id,
      content: messageContent,
      tempId: tempId,
    });

    // Scroll'u hemen yap
    setTimeout(() => scrollToBottom(), 50);
  };

  const startTyping = () => {
    if (!SocketService.isConnected() || isUserTypingRef.current) return;

    isUserTypingRef.current = true;
    SocketService.emit('typing_start', { match_id: match.match_id });

    // 3 saniye sonra otomatik olarak typing'i durdur
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!SocketService.isConnected() || !isUserTypingRef.current) return;

    isUserTypingRef.current = false;
    SocketService.emit('typing_stop', { match_id: match.match_id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleConversationStarter = (starterText) => {
    setInputText(starterText);
  };

  const handleOptionsPress = () => {
    setShowOptionsModal(true);
  };

  const handleUserPress = () => {
    navigation.navigate('UserProfileView', {
      userId: match.user.id,
      user: match.user,
    });
  };

  const handleOptionSelect = (option) => {
    setShowOptionsModal(false);
    if (option === 'report') {
      setShowReportModal(true);
    } else if (option === 'block') {
      setShowBlockModal(true);
    }
  };

  // Block handlers
  const handleBlockConfirm = async (reason) => {
    setShowBlockModal(false);
    try {
      await userAPI.blockUser(match.user.id, reason);
      showToast(t('chat.blocked', { name: match.user.name }));
      setTimeout(() => navigation.goBack(), 500);
    } catch (error) {
      console.error('Failed to block user:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('chat.errors.failedToBlock'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleBlockCancel = () => {
    setShowBlockModal(false);
  };

  // Report handlers
  const handleReportConfirm = async (reason, description) => {
    setShowReportModal(false);
    try {
      await userAPI.reportUser(match.user.id, reason, description);
      showToast(t('chat.reportSubmitted'));
    } catch (error) {
      console.error('Failed to report user:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to submit report. Please try again.',
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const handleReportCancel = () => {
    setShowReportModal(false);
  };

  const getProfilePhoto = () => {
    if (!match.user?.photo_urls) return null;

    try {
      let urls;
      if (typeof match.user.photo_urls === 'string') {
        urls = JSON.parse(match.user.photo_urls);
      } else {
        urls = Array.isArray(match.user.photo_urls) ? match.user.photo_urls : [];
      }

      const firstUrl = urls.filter(url => url)[0];
      return firstUrl ? MEDIA_BASE_URL + firstUrl : null;
    } catch (e) {
      return null;
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return match.user?.age || null;
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
    // Check real-time status first
    if (isOtherUserOnline) {
      return { status: 'online', text: t('chat.online') };
    }

    if (!match.user?.last_active_at) {
      return { status: 'offline', text: t('chat.offline') };
    }

    const lastActive = new Date(match.user.last_active_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    if (diffMinutes < 5) {
      return { status: 'online', text: t('chat.online') };
    } else if (diffMinutes < 30) {
      return { status: 'recent', text: t('chat.minutesAgo', { count: diffMinutes }) };
    } else if (diffMinutes < 60) {
      return { status: 'recent', text: t('chat.recently') };
    } else {
      return { status: 'offline', text: t('chat.offline') };
    }
  };

  const age = calculateAge(match.user?.date_of_birth);
  const gender = getGenderInitial(match.user?.gender);
  const location = match.user?.location_city || 'Bangkok';
  const profilePhoto = getProfilePhoto();
  const onlineStatus = getOnlineStatus();

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.id;
    const theirMessageBg = isDarkMode ? '#efefef' : colors.card;

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : [styles.theirMessage, { backgroundColor: theirMessageBg, borderColor: colors.border }]
        ]}
      >
        <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : { color: colors.text }]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Chat Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => navigation.navigate('UserProfileView', { userId: match.user.id, user: match.user })}
        >
          {match.user.photo_urls && (() => {
            try {
              const urls = typeof match.user.photo_urls === 'string'
                ? JSON.parse(match.user.photo_urls)
                : match.user.photo_urls;
              const photoUrl = urls && urls.length > 0
                ? MEDIA_BASE_URL + urls[0]
                : null;

              return photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatarPlaceholder, { backgroundColor: '#fa1170' }]}>
                  <Text style={styles.headerAvatarText}>{match.user.name.charAt(0).toUpperCase()}</Text>
                </View>
              );
            } catch {
              return (
                <View style={[styles.headerAvatarPlaceholder, { backgroundColor: '#fa1170' }]}>
                  <Text style={styles.headerAvatarText}>{match.user.name.charAt(0).toUpperCase()}</Text>
                </View>
              );
            }
          })()}
          <View style={styles.headerInfoContainer}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>{match.user.name}</Text>
            <Text style={[styles.headerDetails, { color: colors.textSecondary }]}>
              {age} / {gender} / {location}
            </Text>
            <View style={styles.headerOnlineStatus}>
              <OnlineStatusDot status={onlineStatus.status} size={8} />
              <Text style={[styles.headerOnlineText, { color: onlineStatus.status === 'online' ? colors.success : colors.textSecondary }]}>
                {onlineStatus.text}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowOptionsModal(true)} style={styles.optionsButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.chatContainer, { backgroundColor: colors.backgroundSecondary, marginBottom: keyboardHeight }]}>
        {/* Background Pattern */}
        <View style={styles.patternContainer}>
          <Svg height={height} width={width} style={styles.patternSvg}>
            <Defs>
              <Pattern
                id="dots"
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <Circle cx="2" cy="2" r="1" fill={isDarkMode ? "#374151" : "#E5E7EB"} opacity="0.42" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dots)" />
          </Svg>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : `message-${index}`}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={21}
          initialNumToRender={20}
          ListFooterComponent={
            messages.length === 0 ? (
              <View style={[styles.conversationStartersContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.conversationStartersTitle, { color: colors.text }]}>
                  Start a conversation with {match.user.name}
                </Text>
                <View style={styles.conversationStartersGrid}>
                  {conversationStarters.map((starter, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.conversationStarterBubble, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleConversationStarter(starter)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.conversationStarterText, { color: colors.textSecondary }]}>{starter}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputContainer, { paddingBottom: (insets.bottom || 10) + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {!isPremium && cooldownRemaining > 0 && (
            <View style={styles.cooldownBanner}>
              <Ionicons name="time-outline" size={16} color="#f80f6f" />
              <Text style={styles.cooldownText}>
                {`${String(Math.floor(cooldownRemaining / 60)).padStart(2, '0')}:${String(cooldownRemaining % 60).padStart(2, '0')}`}
              </Text>
              <Text style={[styles.cooldownSubText, { color: colors.textSecondary }]}>
                sonra mesaj gönderebilirsiniz
              </Text>
            </View>
          )}
          <View style={styles.inputRow}>
            {!isPremium && cooldownRemaining > 0 ? (
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }, styles.inputDisabled]}
                onPress={() => setShowPremiumModal(true)}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                  Mesaj göndermek için bekliyorsunuz...
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (text.trim().length > 0) {
                    startTyping();
                  } else {
                    stopTyping();
                  }
                }}
                placeholder={t('chat.typeMessage')}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={1000}
              />
            )}
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() && !(!isPremium && cooldownRemaining > 0)) && styles.sendButtonDisabled]}
              onPress={() => {
                if (!isPremium && cooldownRemaining > 0) {
                  setShowPremiumModal(true);
                  return;
                }
                sendMessage();
              }}
              disabled={false}
            >
              <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Options Modal (3-dot menu) */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptionSelect('report')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalOptionText, styles.modalOptionDanger]}>Report</Text>
            </TouchableOpacity>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptionSelect('block')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalOptionText, styles.modalOptionDanger]}>Block</Text>
            </TouchableOpacity>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Block Modal */}
      <BlockReasonModal
        visible={showBlockModal}
        userName={match.user?.name}
        onConfirm={handleBlockConfirm}
        onCancel={handleBlockCancel}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        userName={match.user?.name}
        onConfirm={handleReportConfirm}
        onCancel={handleReportCancel}
      />

      {/* Premium Modal */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        highlightFeature="unlimitedMessages"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  headerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerDetails: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerOnlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerOnlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  keyboardAwareContent: {
    flexGrow: 1,
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  patternSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  messagesList: {
    padding: 15,
    backgroundColor: 'transparent',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f80f6f',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },
  myMessageTime: {
    color: '#FFE5EA',
  },

  // Conversation Starters - Fixed at bottom
  conversationStartersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 25,
  },
  conversationStartersTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  conversationStartersGrid: {
    width: '100%',
    gap: 8,
  },
  conversationStarterBubble: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationStarterText: {
    fontSize: 14,
    textAlign: 'left',
    fontWeight: '500',
  },

  // Cooldown Banner
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  cooldownText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f80f6f',
    letterSpacing: 1,
  },
  cooldownSubText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputDisabled: {
    opacity: 0.5,
  },

  // Input Container
  inputContainer: {
    padding: 15,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    backgroundColor: '#f80f6f',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Report/Block Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalOption: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionDanger: {
    color: '#EF4444',
  },
  modalDivider: {
    height: 1,
    marginHorizontal: 24,
  },
});
