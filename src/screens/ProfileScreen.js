import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../hooks/useToast';
import { userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import CustomAlert from '../components/CustomAlert';
import InteractionBadge from '../components/InteractionBadge';
import PremiumModal from '../components/PremiumModal';
import EarlyBirdBadge from '../components/EarlyBirdBadge';
import DynamicHeader from '../components/DynamicHeader';
import SocketService from '../services/SocketService';
import { useInteraction } from '../context/InteractionContext';
import { useSubscription } from '../context/SubscriptionContext';

export default function ProfileScreen({ navigation }) {
  const { user, updateUserState } = useContext(AuthContext);
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { isPremium, subscription } = useSubscription();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // details, photos, preview
  const [uploadingIndex, setUploadingIndex] = useState(null); // Track which slot is uploading
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0); // For preview photo slider
  const [photoActionModal, setPhotoActionModal] = useState({ visible: false, photoIndex: null, isMainPhoto: false });

  // Use global interaction context
  const { interactionCount, markAsRead } = useInteraction();
  const [badgeAnimated, setBadgeAnimated] = useState(false);

  // Create styles early - must be before any conditional returns
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Modal states
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showHaveChildrenModal, setShowHaveChildrenModal] = useState(false);
  const [showWantChildrenModal, setShowWantChildrenModal] = useState(false);
  const [showEnglishModal, setShowEnglishModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });

  // Options arrays with translations
  // value = database'e gönderilen sabit değer, label = kullanıcıya gösterilen çeviri
  const educationOptions = [
    { value: null,          label: t('common.noAnswer') },
    { value: 'High School', label: t('profile.educationOptions.highSchool') },
    { value: 'Bachelor',    label: t('profile.educationOptions.bachelors') },
    { value: 'Master',      label: t('profile.educationOptions.masters') },
    { value: 'PhD',         label: t('profile.educationOptions.phd') },
  ];

  const getEducationLabel = (value) => {
    const found = educationOptions.find(o => o.value === value);
    return found ? found.label : value;
  };

  const englishOptions = [
    t('common.noAnswer'),
    t('profile.englishOptions.none'),
    t('profile.englishOptions.basic'),
    t('profile.englishOptions.intermediate'),
    t('profile.englishOptions.fluent'),
    t('profile.englishOptions.native'),
  ];

  const childrenOptions = [
    t('common.noAnswer'),
    t('profile.childrenOptions.noChildren'),
    t('profile.childrenOptions.haveChildren'),
  ];

  const wantChildrenOptions = [
    t('common.noAnswer'),
    t('profile.wantChildrenOptions.yes'),
    t('profile.wantChildrenOptions.no'),
    t('profile.wantChildrenOptions.maybe'),
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });

    return unsubscribe;
  }, [navigation]);

  // Listen for badge animation triggers
  useEffect(() => {
    if (user) {
      // Listen for new interactions to trigger animation
      SocketService.on('like_received', () => {
        setBadgeAnimated(true);
        setTimeout(() => setBadgeAnimated(false), 500);
      });

      SocketService.on('favorite_received', () => {
        setBadgeAnimated(true);
        setTimeout(() => setBadgeAnimated(false), 500);
      });

      SocketService.on('profile_viewed', () => {
        setBadgeAnimated(true);
        setTimeout(() => setBadgeAnimated(false), 500);
      });

      SocketService.on('new_match', () => {
        setBadgeAnimated(true);
        setTimeout(() => setBadgeAnimated(false), 500);
      });

      return () => {
        SocketService.off('like_received');
        SocketService.off('favorite_received');
        SocketService.off('profile_viewed');
        SocketService.off('new_match');
      };
    }
  }, [user]);

  // Reset photo index when switching tabs
  useEffect(() => {
    if (activeTab === 'preview') {
      setCurrentPhotoIndex(0);
    }
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setProfile(data.user);
      // 🔥 Also update global user state to keep it in sync
      await updateUserState(data.user);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: t('profile.failedToLoad'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
    }
  };


  // Premium modal handlers - MUST be before any early returns
  const handlePremiumPress = useCallback(() => {
    setShowPremiumModal(true);
  }, []);

  const handlePremiumClose = useCallback(() => {
    setShowPremiumModal(false);
  }, []);

  const updateProfileField = async (field, value) => {
    try {
      setSaving(true);
      console.log(`📝 Updating ${field}:`, value);
      const response = await userAPI.updateProfile({ [field]: value });
      console.log('✅ Update successful:', response.data);

      // 🔥 IMMEDIATELY update with fresh data from server response
      if (response.data.user) {
        setProfile(response.data.user);
        await updateUserState(response.data.user);
        console.log('✅ Profile state updated with fresh data');
      } else {
        // Fallback: reload if response doesn't include user data
        await loadProfile();
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile';
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: errorMsg,
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setSaving(false);
    }
  };

  const getProfilePhotoUrl = () => {
    if (!profile?.photo_urls) return null;

    try {
      let urls;
      if (typeof profile.photo_urls === 'string') {
        urls = JSON.parse(profile.photo_urls);
      } else {
        urls = profile.photo_urls;
      }

      if (urls && urls.length > 0) {
        const fullUrl = MEDIA_BASE_URL + urls[0];
        return fullUrl;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const handleProfilePhotoPress = async () => {
    // If user has a profile photo, navigate to Photos tab
    if (getProfilePhotoUrl()) {
      setActiveTab('photos');
      return;
    }

    // If no profile photo, open image picker to upload
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setAlertConfig({
          visible: true,
          title: 'Permission Required',
          message: 'Please allow access to your photo library to upload photos.',
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadProfilePhoto(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to pick image',
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    }
  };

  const uploadProfilePhoto = async (imageUri) => {
    try {
      const response = await userAPI.uploadPhoto(imageUri);

      if (response.data) {
        // Reload profile to get updated photos
        await loadProfile();
        showToast('Your photo uploaded');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast(
        error.response?.data?.message || 'Failed to upload photo. Please try again.'
      );
    }
  };

  const InfoCard = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const InfoRow = ({ label, value, onPress, showChevron = false }) => (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={[styles.infoValue, !value && styles.noAnswerText]}>
          {value || t('common.noAnswer')}
        </Text>
        {showChevron && <Text style={styles.chevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const Divider = () => <View style={styles.divider} />;

  const renderVerificationCard = () => {
    // Don't show if already verified
    if (profile?.is_verified) return null;

    // Check if verification is pending
    const isPending = profile?.verification_status === 'pending';

    return (
      <TouchableOpacity
        style={[
          styles.verificationPromptCard,
          isPending && styles.verificationPendingCard
        ]}
        onPress={() => !isPending && navigation.navigate('Verification')}
        activeOpacity={isPending ? 1 : 0.7}
        disabled={isPending}
      >
        <View style={[
          styles.verificationPromptIconContainer,
          isPending && styles.verificationPendingIcon
        ]}>
          <Ionicons
            name={isPending ? "time-outline" : "shield-checkmark"}
            size={32}
            color={isPending ? "#F59E0B" : "#3B82F6"}
          />
        </View>
        <View style={styles.verificationPromptContent}>
          <Text style={[
            styles.verificationPromptTitle,
            isPending && styles.verificationPromptTitlePending
          ]}>
            {isPending ? t('profile.verification.pending') : t('profile.verification.verify')}
          </Text>
          <Text style={[
            styles.verificationPromptText,
            isPending && styles.verificationPromptTextPending
          ]}>
            {isPending
              ? t('profile.verification.pendingMessage')
              : t('profile.verification.verifyMessage')}
          </Text>
        </View>
        {!isPending && (
          <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      {/* Verification Prompt Card */}
      {renderVerificationCard()}

      {/* Basic Info Card */}
      <InfoCard>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Text style={styles.cardName}>{profile?.name}</Text>
          <Text style={styles.cardSubtitle}>
            {profile?.age} / {profile?.gender?.charAt(0).toUpperCase()} / {profile?.location_city || 'Location'}
          </Text>
        </TouchableOpacity>
      </InfoCard>

      {/* Bio Card (if exists) */}
      {profile?.bio && (
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <InfoCard>
            <View style={styles.bioSection}>
              <Text style={styles.bioLabel}>{t('profile.bio')}</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </InfoCard>
        </TouchableOpacity>
      )}

      {/* Profile Details Card */}
      <InfoCard>
        <InfoRow
          label={t('profile.lookingFor')}
          value={profile?.interested_in ? `${profile.interested_in.charAt(0).toUpperCase() + profile.interested_in.slice(1)}` : null}
          showChevron={true}
          onPress={() => navigation.navigate('LookingFor')}
        />
        <Divider />
        <InfoRow
          label={t('profile.height')}
          value={profile?.height ? `${profile.height}${t('profile.cm')}` : null}
          showChevron={true}
          onPress={() => setShowHeightModal(true)}
        />
        <Divider />
        <InfoRow
          label={t('profile.weight')}
          value={profile?.weight ? `${profile.weight}${t('profile.kg')}` : null}
          showChevron={true}
          onPress={() => setShowWeightModal(true)}
        />
        <Divider />
        <InfoRow
          label={t('profile.education')}
          value={getEducationLabel(profile?.education)}
          showChevron={true}
          onPress={() => setShowEducationModal(true)}
        />
        <Divider />
        <InfoRow
          label={t('profile.englishAbility')}
          value={profile?.english_ability}
          showChevron={true}
          onPress={() => setShowEnglishModal(true)}
        />
        <Divider />
        <InfoRow
          label={t('profile.haveChildren')}
          value={profile?.have_children}
          showChevron={true}
          onPress={() => setShowHaveChildrenModal(true)}
        />
        <Divider />
        <InfoRow
          label={t('profile.wantChildren')}
          value={profile?.want_children}
          showChevron={true}
          onPress={() => setShowWantChildrenModal(true)}
        />
      </InfoCard>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>

      </View>

    </View>
  );

  const renderPhotosContent = () => {
    // Verification Prompt Card (shown at top if not verified)
    const verificationCard = renderVerificationCard();

    // Parse photo URLs
    let photoUrls = [];
    try {
      if (profile?.photo_urls) {
        if (typeof profile.photo_urls === 'string') {
          photoUrls = JSON.parse(profile.photo_urls);
        } else {
          photoUrls = Array.isArray(profile.photo_urls) ? profile.photo_urls : [];
        }
      }
    } catch (e) {
      photoUrls = [];
    }

    // Create array of photo items with full URLs
    const photoItems = photoUrls.map((url, index) => ({
      key: `photo-${index}`,
      url: url,
      fullUrl: MEDIA_BASE_URL + url,
      index: index,
    }));

    // Add empty slots to make total of 9
    const emptySlots = Array(Math.max(0, 9 - photoItems.length))
      .fill(null)
      .map((_, i) => ({
        key: `empty-${photoItems.length + i}`,
        url: null,
        fullUrl: null,
        index: photoItems.length + i,
      }));

    const allSlots = [...photoItems, ...emptySlots];

    const pickImage = async (index) => {
      try {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          setAlertConfig({
            visible: true,
            title: 'Permission Required',
            message: 'Please allow access to your photo library to upload photos.',
            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
          });
          return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.6,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const imageUri = result.assets[0].uri;
          await uploadPhoto(imageUri, index);
        }
      } catch (error) {
        console.error('Error picking image:', error);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Failed to pick image',
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
      }
    };

    const uploadPhoto = async (imageUri, index) => {
      try {
        setUploadingIndex(index);

        const response = await userAPI.uploadPhoto(imageUri);

        if (response.data) {
          console.log('📸 Upload response:', JSON.stringify(response.data));
          // Reload profile to get updated photos
          await loadProfile();
          console.log('📸 Profile reloaded, photo_urls:', JSON.stringify(profile?.photo_urls));
          showToast('Your photo uploaded');
        }
      } catch (error) {
        console.error('Upload error:', error);
        console.error('Upload error response:', JSON.stringify(error.response?.data));
        console.error('Upload error status:', error.response?.status);
        showToast(
          error.response?.data?.message || 'Failed to upload photo. Please try again.'
        );
      } finally {
        setUploadingIndex(null);
      }
    };

    const deletePhoto = async (index) => {
      try {
        await userAPI.deletePhoto(index);
        await loadProfile();
        showToast('Photo deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showToast(
          error.response?.data?.message || 'Failed to delete photo.'
        );
      }
    };

    const handleDragEnd = async ({ data }) => {
      // Filter out empty slots and get just the URLs
      const reorderedUrls = data
        .filter(item => item.url !== null)
        .map(item => item.url);

      // Update backend with new order
      try {
        await userAPI.updateProfile({ photo_urls: reorderedUrls });
        await loadProfile();
      } catch (error) {
        console.error('Reorder error:', error);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Failed to reorder photos',
          onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
          onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
        });
      }
    };

    const makeMainPhoto = async (index) => {
      try {
        // Reorder photos: move selected photo to index 0
        const currentPhotos = [...photoUrls];
        const selectedPhoto = currentPhotos[index];

        // Remove the photo from its current position and add to front
        currentPhotos.splice(index, 1);
        currentPhotos.unshift(selectedPhoto);

        console.log('Updating photo order:', currentPhotos);

        // Update backend - PostgreSQL JSONB needs JSON string
        const photoUrlsJson = JSON.stringify(currentPhotos);
        console.log('Sending as JSON:', photoUrlsJson);

        await userAPI.updateProfile({ photo_urls: photoUrlsJson });
        await loadProfile();
        showToast(t('profile.photos.mainPhotoUpdated'));
      } catch (error) {
        console.error('Make main photo error:', error);
        console.error('Error details:', error.response?.data);
        showToast(error.response?.data?.message || 'Failed to set main photo');
      }
    };

    const handlePhotoPress = (index) => {
      if (uploadingIndex === index) {
        // Currently uploading - do nothing
        return;
      }

      if (allSlots[index] && allSlots[index].url) {
        // Photo exists - show bottom sheet
        setPhotoActionModal({
          visible: true,
          photoIndex: index,
          isMainPhoto: index === 0
        });
      } else {
        // Empty slot - upload new photo
        pickImage(index);
      }
    };

    const handlePhotoAction = (action) => {
      const { photoIndex } = photoActionModal;
      setPhotoActionModal({ visible: false, photoIndex: null, isMainPhoto: false });

      if (action === 'delete') {
        deletePhoto(photoIndex);
      } else if (action === 'makeMain') {
        makeMainPhoto(photoIndex);
      }
    };

    const renderPhotoItem = (item) => {
      const index = item.index;

      return (
        <TouchableOpacity
          style={styles.photoSlotItem}
          onPress={() => handlePhotoPress(index)}
          activeOpacity={0.7}
          disabled={uploadingIndex === index}
        >
          {uploadingIndex === index ? (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : item.fullUrl ? (
            <>
              <Image source={{ uri: item.fullUrl }} style={styles.photoImage} />
              {index === 0 && (
                <View style={styles.mainPhotoOverlay}>
                  <Text style={styles.mainPhotoText}>Main Photo</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoPlaceholderIcon}>
                <Text style={styles.photoPlusIcon}>+</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <>
        {/* Verification Prompt Card */}
        {verificationCard}

        {/* Photo Grid using View + map instead of FlatList to avoid VirtualizedList nesting */}
        <View style={styles.photoGridContainer}>
          <View style={styles.photoGridRow}>
            {allSlots.map((item) => (
              <View key={item.key} style={styles.photoSlot}>
                {renderPhotoItem(item)}
              </View>
            ))}
          </View>

          {/* Info Message */}
          <View style={styles.photoInfoCard}>
            <Text style={styles.photoInfoText}>
              Upload more photos to get more messages!{'\n'}
              We recommend at least 6 good photos. Tap{'\n'}
              the <Text style={styles.photoInfoBold}>+</Text> to add photos.
            </Text>
          </View>
        </View>

        {/* Photo Action Bottom Sheet */}
        <Modal
          visible={photoActionModal.visible}
          transparent
          animationType="slide"
          onRequestClose={() => setPhotoActionModal({ visible: false, photoIndex: null, isMainPhoto: false })}
        >
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setPhotoActionModal({ visible: false, photoIndex: null, isMainPhoto: false })}
          >
            <View style={styles.bottomSheetContent}>
              {!photoActionModal.isMainPhoto && (
                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={() => handlePhotoAction('makeMain')}
                >
                  <Text style={styles.bottomSheetOptionText}>Make Main Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.bottomSheetOption, styles.bottomSheetDeleteOption]}
                onPress={() => handlePhotoAction('delete')}
              >
                <Text style={styles.bottomSheetDeleteText}>Delete Photo</Text>
              </TouchableOpacity>

              <View style={styles.bottomSheetDivider} />

              <TouchableOpacity
                style={styles.bottomSheetOption}
                onPress={() => setPhotoActionModal({ visible: false, photoIndex: null, isMainPhoto: false })}
              >
                <Text style={styles.bottomSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  const renderPreviewTab = () => {
    // Verification Prompt Card (shown at top if not verified)
    const verificationCard = renderVerificationCard();

    // Parse photo URLs
    let photoUrls = [];
    try {
      if (profile?.photo_urls) {
        if (typeof profile.photo_urls === 'string') {
          photoUrls = JSON.parse(profile.photo_urls);
        } else {
          photoUrls = Array.isArray(profile.photo_urls) ? profile.photo_urls : [];
        }
      }
    } catch (e) {
      photoUrls = [];
    }

    // Convert to full URLs and filter out empty ones
    const fullPhotoUrls = photoUrls
      .filter(url => url)
      .map(url => MEDIA_BASE_URL + url);

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

    const getGenderInitial = (gender) => {
      if (!gender) return '';
      return gender.charAt(0).toUpperCase();
    };

    const formatJoinDate = () => {
      if (!profile?.created_at) return 'Joined Recently';
      const joinDate = new Date(profile.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - joinDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 7) return 'Joined This Week';
      if (diffDays < 30) return `Joined ${Math.floor(diffDays / 7)} Weeks Ago`;
      if (diffDays < 365) return `Joined ${Math.floor(diffDays / 30)} Months Ago`;
      return `Joined ${Math.floor(diffDays / 365)} Years Ago`;
    };

    const handlePhotoAreaPress = (evt) => {
      if (fullPhotoUrls.length <= 1) return;

      const { locationX } = evt.nativeEvent;
      const screenWidth = Dimensions.get('window').width;
      const midpoint = screenWidth / 2;

      // If tap on right half, go next; if tap on left half, go previous
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

    return (
      <View style={styles.tabContent}>
        {/* Verification Prompt Card */}
        {verificationCard}

        <View style={styles.previewCard}>
          {/* Main Photo with Slider */}
          <TouchableOpacity
            style={styles.previewPhotoContainer}
            activeOpacity={1}
            onPress={handlePhotoAreaPress}
          >
            {fullPhotoUrls.length > 0 ? (
              <>
                <Image
                  source={{ uri: fullPhotoUrls[currentPhotoIndex] }}
                  style={styles.previewPhoto}
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
              <View style={styles.previewPhotoPlaceholder}>
                <Text style={styles.previewPhotoPlaceholderText}>No Photo</Text>
              </View>
            )}

            {/* Gradient Overlay for Text */}
            <View style={styles.previewGradient}>
              <Text style={styles.previewName}>{profile?.name || 'Your Name'}</Text>
              <Text style={styles.previewInfo}>
                {calculateAge(profile?.date_of_birth) || '20'} / {getGenderInitial(profile?.gender) || 'F'} / {profile?.location_city || 'Mueang Nonthaburi'}, Thailand
              </Text>
              {profile?.bio && (
                <Text style={styles.previewBioText}>{profile.bio}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Badges Section */}
          <View style={styles.previewBadges}>
            <View style={[styles.previewBadge, styles.previewBadgeOnline]}>
              <Text style={styles.previewBadgeTextOnline}>Online</Text>
            </View>

            {profile?.is_verified && (
              <View style={[styles.previewBadge, styles.previewBadgeVerified]}>
                <Text style={styles.previewBadgeIcon}>✓</Text>
                <Text style={styles.previewBadgeTextVerified}>{t('profile.preview.photoVerified')}</Text>
              </View>
            )}

            {profile?.height && (
              <View style={[styles.previewBadge, styles.previewBadgeInfo]}>
                <Text style={styles.previewBadgeTextInfo}>{profile.height}cm</Text>
              </View>
            )}

            {profile?.weight && (
              <View style={[styles.previewBadge, styles.previewBadgeInfo]}>
                <Text style={styles.previewBadgeTextInfo}>{profile.weight}kg</Text>
              </View>
            )}

            <View style={[styles.previewBadge, styles.previewBadgeInfo]}>
              <Text style={styles.previewBadgeIcon}>⏱</Text>
              <Text style={styles.previewBadgeTextInfo}>{formatJoinDate()}</Text>
            </View>

            {profile?.interested_in && (
              <View style={[styles.previewBadge, styles.previewBadgeInfo]}>
                <Text style={styles.previewBadgeTextInfo}>
                  Looking For {profile.interested_in.charAt(0).toUpperCase() + profile.interested_in.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Text */}
        <View style={styles.previewInfoCard}>
          <Text style={styles.previewInfoText}>
            This is how your profile appears to other users
          </Text>
        </View>
      </View>
    );
  };

  // Height Selection Modal
  const renderHeightModal = () => (
    <Modal
      visible={showHeightModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHeightModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowHeightModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHeightModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.height')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {heightOptions.map((option) => (
              <TouchableOpacity
                key={option.cm}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('height', option.cm);
                  setShowHeightModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {profile?.height === option.cm && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option.display}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Weight Selection Modal
  const renderWeightModal = () => (
    <Modal
      visible={showWeightModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowWeightModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowWeightModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWeightModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.weight')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {weightOptions.map((option) => (
              <TouchableOpacity
                key={option.kg}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('weight', option.kg);
                  setShowWeightModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {profile?.weight === option.kg && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option.display}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Education Selection Modal
  const renderEducationModal = () => (
    <Modal
      visible={showEducationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEducationModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowEducationModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEducationModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.education')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {educationOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('education', option.value);
                  setShowEducationModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {((option.value === null && !profile?.education) || profile?.education === option.value) &&
                    <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // English Ability Modal
  const renderEnglishModal = () => (
    <Modal
      visible={showEnglishModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEnglishModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowEnglishModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEnglishModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.englishAbility')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {englishOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('english_ability', option === t('common.noAnswer') ? null : option);
                  setShowEnglishModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {((option === t('common.noAnswer') && !profile?.english_ability) || profile?.english_ability === option) &&
                    <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Have Children Modal
  const renderHaveChildrenModal = () => (
    <Modal
      visible={showHaveChildrenModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHaveChildrenModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowHaveChildrenModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHaveChildrenModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.haveChildren')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {childrenOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('have_children', option === t('common.noAnswer') ? null : option);
                  setShowHaveChildrenModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {((option === t('common.noAnswer') && !profile?.have_children) || profile?.have_children === option) &&
                    <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Want Children Modal
  const renderWantChildrenModal = () => (
    <Modal
      visible={showWantChildrenModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowWantChildrenModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowWantChildrenModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWantChildrenModal(false)}>
              <Text style={styles.modalBack}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.wantChildren')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScrollView}>
            {wantChildrenOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={async () => {
                  await updateProfileField('want_children', option === t('common.noAnswer') ? null : option);
                  setShowWantChildrenModal(false);
                }}
              >
                <View style={styles.radioButton}>
                  {((option === t('common.noAnswer') && !profile?.want_children) || profile?.want_children === option) &&
                    <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('profile.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render tab bar component (to be used inside ScrollView)
  const renderTabBar = () => (
    <View style={styles.tabBarCard}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            {t('profile.tabs.details')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
            {t('profile.tabs.photos')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preview' && styles.activeTab]}
          onPress={() => setActiveTab('preview')}
        >
          <Text style={[styles.tabText, activeTab === 'preview' && styles.activeTabText]}>
            {t('profile.tabs.preview')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render profile header component (to be used inside ScrollView)
  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <TouchableOpacity onPress={handleProfilePhotoPress} activeOpacity={0.7}>
        {getProfilePhotoUrl() ? (
          <Image
            source={{ uri: getProfilePhotoUrl() }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarPlus}>+</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerName}>{profile?.name}</Text>
        <Text style={styles.headerLocation}>
          {profile?.location_city || 'Mueang Nonthaburi'}, Thailand
        </Text>
        <View style={[
          styles.verificationBadge,
          profile?.is_verified && styles.verificationBadgeVerified
        ]}>
          <Ionicons
            name={profile?.is_verified ? "checkmark-circle" : "close-circle"}
            size={18}
            color={profile?.is_verified ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[
            styles.verificationBadgeText,
            profile?.is_verified && styles.verificationBadgeTextVerified
          ]}>
            {profile?.is_verified ? t('profile.verified') : t('profile.notVerified')}
          </Text>
        </View>
      </View>
    </View>
  );

  const handleInteractionPress = async () => {
    navigation.navigate('LikedMe');
    // Mark interactions as read when user opens the page
    await markAsRead();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Dynamic Header */}
      <DynamicHeader
        title={t('profile.title')}
        showHamburger={true}
        navigation={navigation}
        onPremiumPress={() => setShowPremiumModal(true)}
        rightIcons={[
          {
            name: 'heart',
            onPress: handleInteractionPress,
            size: 28,
            color: '#fa1170',
            badge: interactionCount,
            animated: badgeAnimated,
          },
        ]}
      />

      {/* Main ScrollView containing everything */}
      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        {renderProfileHeader()}

        {/* Early Bird Badge - Show for early bird users */}
        {isPremium && subscription?.is_early_bird && (
          <View style={styles.earlyBirdContainer}>
            <EarlyBirdBadge
              number={subscription?.early_bird_number}
              size="medium"
            />
          </View>
        )}

        {/* Tab Navigation Card */}
        {renderTabBar()}

        {/* Tab Content */}
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'photos' && renderPhotosContent()}
        {activeTab === 'preview' && renderPreviewTab()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Selection Modals */}
      {renderHeightModal()}
      {renderWeightModal()}
      {renderEducationModal()}
      {renderEnglishModal()}
      {renderHaveChildrenModal()}
      {renderWantChildrenModal()}

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
        onClose={handlePremiumClose}
      />
    </SafeAreaView>
  );
}

// Height options (125cm - 220cm)
const heightOptions = Array.from({ length: 96 }, (_, i) => {
  const cm = 125 + i;
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { cm, display: `${cm}cm / ${feet}ft ${inches}"` };
});

// Weight options (30kg - 150kg)
const weightOptions = Array.from({ length: 121 }, (_, i) => {
  const kg = 30 + i;
  const lbs = Math.round(kg * 2.20462);
  return { kg, display: `${kg}kg / ${lbs}lbs` };
});

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
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Header Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 56,
    backgroundColor: '#7CB9E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4A4A4A',
    borderStyle: 'dashed',
  },
  avatarPlus: {
    fontSize: 44,
    color: '#2A2A2A',
    fontWeight: '400',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 56,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
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
  verificationBadgeVerified: {
    backgroundColor: '#3B82F6', // Açık mavi
  },
  verificationBadgeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  verificationBadgeTextVerified: {
    color: '#FFFFFF', // Beyaz text for verified
    fontWeight: '600',
  },

  // Tab Bar Styles
  tabBarCard: {
    backgroundColor: isDarkMode ? colors.card : '#3b3b3b',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 2,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: isDarkMode ? '#fff' : '#242424',
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Card Styles
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0 : 0.05,
    shadowRadius: 3,
    elevation: isDarkMode ? 0 : 2,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },

  // Verification Card
  verificationCard: {
    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
  },
  verificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verificationIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: isDarkMode ? '#93C5FD' : '#1E40AF',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 12,
    color: isDarkMode ? '#60A5FA' : '#3B82F6',
    lineHeight: 16,
  },

  // Card Header
  cardHeader: {
    marginBottom: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Bio Section
  bioSection: {
    paddingVertical: 4,
  },
  bioLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    fontWeight: '600',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 4,
  },
  noAnswerText: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 24,
    color: colors.border,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: 4,
  },

  // Action Buttons
  actionButtons: {
    marginTop: 24,
    marginHorizontal: 16,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#fa1170',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  earlyBirdContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 12,
  },

  // Verification Prompt Card
  verificationPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1a293e' : '#d5e5fc',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.5)' : '#BFDBFE',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDarkMode ? 0.3 : 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  verificationPendingCard: {
    backgroundColor: isDarkMode ? '#443111' : '#FEF3C7',
    borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.5)' : '#FDE68A',
    shadowColor: '#ffbc48',
  },
  verificationPromptIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verificationPendingIcon: {
    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
  },
  verificationPromptContent: {
    flex: 1,
  },
  verificationPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#93C5FD' : '#1E40AF',
    marginBottom: 4,
  },
  verificationPromptText: {
    fontSize: 13,
    color: isDarkMode ? '#60A5FA' : '#3B82F6',
    lineHeight: 18,
  },

  // Main ScrollView
  mainScrollView: {
    flex: 1,
  },

  // Photo Grid Styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  photoGridContainer: {
    padding: 12,
  },
  photoGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoSlot: {
    flexBasis: '33.333%', // 3 columns per row
    aspectRatio: 0.75, // Portrait ratio (3:4)
    padding: 4, // Gap between items
    position: 'relative',
  },
  photoSlotItem: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoSlotDragging: {
    opacity: 0.5,
    transform: [{ scale: 1.05 }],
  },
  profilePhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  profilePhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  mainPhotoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mainPhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  photoPlaceholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgb(157, 160, 165)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlusIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  photoInfoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  photoInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  photoInfoBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Preview Tab Styles
  previewCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 8,
    elevation: isDarkMode ? 0 : 4,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  previewPhotoContainer: {
    width: '100%',
    height: 460,
    position: 'relative',
  },
  previewPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    resizeMode: 'cover',
  },
  previewPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPhotoPlaceholderText: {
    fontSize: 18,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  previewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 4,
  },
  previewName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  previewInfo: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '400',
  },
  previewBioText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 19,
    opacity: 0.85,
    marginTop: 2,
    fontWeight: '400',
  },
  previewBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 12,
    gap: 8,
    backgroundColor: '#1A1A1A',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewBadgeOnline: {
    backgroundColor: '#10B981',
  },
  previewBadgeVerified: {
    backgroundColor: '#3B82F6',
  },
  previewBadgeInfo: {
    backgroundColor: '#374151',
  },
  previewBadgeIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  previewBadgeTextOnline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewBadgeTextVerified: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewBadgeTextInfo: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  previewInfoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  previewInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Photo Slider Indicators
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

  // Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalBack: {
    fontSize: 32,
    color: '#3B82F6',
    fontWeight: '300',
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '400',
  },

  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 4,
  },
  bottomSheetOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomSheetOptionText: {
    fontSize: 17,
    color: '#3B82F6',
    fontWeight: '500',
  },
  bottomSheetDeleteOption: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  bottomSheetDeleteText: {
    fontSize: 17,
    color: '#EF4444',
    fontWeight: '500',
  },
  bottomSheetDivider: {
    height: 8,
    backgroundColor: colors.surface,
    marginVertical: 4,
  },
  bottomSheetCancelText: {
    fontSize: 17,
    color: colors.textPrimary,
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
