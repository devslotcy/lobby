import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

const SideBar = ({ visible, onClose, profile, getProfilePhotoUrl, navigation, onPremiumPress }) => {
  const { t } = useLanguage();
  const { isPremium } = useSubscription();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const styles = React.useMemo(() => createStyles(), []);

  // Debug: Log verification status
  React.useEffect(() => {
    if (visible && profile) {
      console.log('🔍 SideBar Profile:', {
        name: profile.name,
        is_verified: profile.is_verified,
        verification_status: profile.verification_status
      });
    }
  }, [visible, profile]);

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const menuItems = [
    {
      icon: 'settings-outline',
      label: t('sidebar.appSettings'),
      screen: 'AppSettings',
    },
    {
      icon: 'shield-checkmark-outline',
      label: t('sidebar.privacyOptions'),
      screen: 'PrivacyOptions',
    },
    {
      icon: 'chatbubble-outline',
      label: t('sidebar.feedback'),
      screen: 'Feedback',
    },
    {
      icon: 'help-circle-outline',
      label: t('sidebar.help'),
      screen: 'Help',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Overlay */}
        <Pressable style={styles.overlay} onPress={onClose} />

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileRow}>
              {/* Profile Photo */}
              <TouchableOpacity activeOpacity={0.7}>
                {getProfilePhotoUrl?.() ? (
                  <Image
                    source={{ uri: getProfilePhotoUrl() }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={32} color="#999" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Profile Info */}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name}</Text>
                <Text style={styles.profileLocation}>
                  {profile?.age}, {profile?.location_city || 'Mueang Nonthaburi'}
                </Text>
                <Text style={[styles.profileMembership, isPremium && styles.profileMembershipPremium]}>
                  {isPremium ? '⭐ Premium Member' : t('sidebar.freeMember')}
                </Text>
                <View style={[
                  styles.verificationBadge,
                  profile?.is_verified && styles.verifiedBadge
                ]}>
                  <Ionicons
                    name={profile?.is_verified ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={profile?.is_verified ? "#FFFFFF" : "#6B7280"}
                  />
                  <Text style={[
                    styles.verificationText,
                    profile?.is_verified && styles.verifiedText
                  ]}>
                    {profile?.is_verified ? t('profile.verified') : t('profile.notVerified')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  item.isPremium && { backgroundColor: item.backgroundColor },
                ]}
                onPress={() => {
                  if (item.screen && navigation) {
                    navigation.navigate(item.screen);
                    onClose();
                  } else if (item.onPress) {
                    item.onPress();
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.textColor || '#CCCCCC'}
                  />
                </View>
                <Text
                  style={[
                    styles.menuItemText,
                    item.isPremium && {
                      color: item.textColor,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={item.textColor || '#666'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Premium Upgrade Card - Fixed at bottom */}
          <View style={styles.upgradeSection}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                onClose();
                if (onPremiumPress) {
                  onPremiumPress();
                }
              }}
            >
              <LinearGradient
                colors={isPremium
                  ? ['#F5A623', '#F7C948', '#FFE066']
                  : ['#667EEA', '#C471F5', '#ff589b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumCard}
              >
                {/* Title */}
                <View style={styles.premiumHeader}>
                  <Text style={styles.premiumTitle} numberOfLines={1}>
                    {isPremium ? 'Premium User' : t('sidebar.goPremium')}
                  </Text>
                  <Text style={styles.premiumSubtitle} numberOfLines={1}>
                    {isPremium ? 'Unlimited Features' : t('sidebar.unlockFeatures')}
                  </Text>
                </View>

                {/* Feature Icons - All 5 in one row with flex */}
                <View style={styles.featuresContainer}>
                  <View style={styles.featuresRow}>
                    <View style={styles.featureIconCircle}>
                      <Ionicons name="infinite" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureIconCircle}>
                      <Ionicons name="heart" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureIconCircle}>
                      <Ionicons name="rocket" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureIconCircle}>
                      <Ionicons name="eye" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureIconCircle}>
                      <Ionicons name="shuffle" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </View>

                {/* CTA Button */}
                <View style={[styles.premiumCTA, isPremium && styles.premiumCTAGold]}>
                  <Text style={[styles.premiumCTAText, isPremium && styles.premiumCTATextGold]}>
                    {isPremium ? 'PREMIUM' : t('sidebar.upgrade')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = () => StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#1A1A1A',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  profileSection: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 74,
    height: 74,
    borderRadius: 35,
    backgroundColor: '#0b0b0b',
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  profileMembership: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  profileMembershipPremium: {
    color: '#F5A623',
    fontWeight: '600',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  verifiedBadge: {
    backgroundColor: '#3B82F6', // Açık mavi
  },
  verificationText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  verifiedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  menuSection: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  upgradeSection: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#1A1A1A',
  },
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  premiumHeader: {
    marginBottom: 18,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  premiumCTA: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumCTAText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: 0.25,
  },
  premiumCTAGold: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  premiumCTATextGold: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});

export default SideBar;
