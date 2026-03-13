import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { userAPI } from '../services/api';
import eventEmitter, { EVENTS } from '../utils/EventEmitter';

export default function LookingForScreen({ navigation, route }) {
  const { showToast } = useToast();
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  // Preferences state
  const [interestedIn, setInterestedIn] = useState('women');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);

  // Modal states
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showMinAgeModal, setShowMinAgeModal] = useState(false);
  const [showMaxAgeModal, setShowMaxAgeModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setProfile(data.user);
      setInterestedIn(data.user.interested_in || 'women');
      setMinAge(data.user.min_age || 18);
      setMaxAge(data.user.max_age || 99);
    } catch (error) {
      showToast(t('lookingFor.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (field, value) => {
    try {
      console.log('💾 Saving preference:', field, '=', value);
      setSaving(true);
      const response = await userAPI.updateProfile({ [field]: value });
      console.log('✅ Save response:', response.data);

      // Update local state
      if (field === 'interested_in') setInterestedIn(value);
      else if (field === 'min_age') setMinAge(value);
      else if (field === 'max_age') setMaxAge(value);

      // Emit event to refresh Discovery and Near Me screens
      eventEmitter.emit(EVENTS.FILTERS_CHANGED);

      showToast(t('lookingFor.preferencesUpdated'));
    } catch (error) {
      console.error('❌ Save error:', error.response?.data || error.message);
      showToast(t('lookingFor.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const getInterestedInLabel = () => {
    const labels = {
      men: t('lookingFor.men'),
      women: t('lookingFor.women'),
      everyone: t('lookingFor.everyone'),
    };
    return labels[interestedIn] || t('lookingFor.women');
  };

  const getInterestedInDisplayValue = () => {
    // For profile display - capitalize first letter
    if (!profile?.interested_in) return null;
    return profile.interested_in.charAt(0).toUpperCase() + profile.interested_in.slice(1);
  };

  const InfoCard = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const InfoRow = ({ label, value, onPress, showChevron = true }) => (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
        {showChevron && <Text style={[styles.chevron, { color: colors.border }]}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  // Gender Selection Modal
  const GenderSelectionModal = () => (
    <Modal
      visible={showGenderModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGenderModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowGenderModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('lookingFor.lookingFor')}</Text>
            <TouchableOpacity onPress={() => setShowGenderModal(false)}>
              <Text style={styles.modalClose}>{t('lookingFor.done')}</Text>
            </TouchableOpacity>
          </View>

          {['women', 'men', 'everyone'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={styles.radioOption}
              onPress={() => {
                savePreferences('interested_in', gender);
                setShowGenderModal(false);
              }}
            >
              <Text style={styles.radioLabel}>
                {t(`lookingFor.${gender}`)}
              </Text>
              <View style={styles.radioButton}>
                {interestedIn === gender && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Age Selection Modal
  const AgeSelectionModal = ({ visible, onClose, currentValue, field, title }) => {
    const [selectedAge, setSelectedAge] = useState(currentValue);
    const ages = Array.from({ length: 82 }, (_, i) => i + 18); // 18-99

    // Reset selected age when modal opens
    useEffect(() => {
      if (visible) {
        setSelectedAge(currentValue);
      }
    }, [visible, currentValue]);

    const handleSave = () => {
      if (selectedAge !== currentValue) {
        savePreferences(field, selectedAge);
      }
      onClose();
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleSave}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleSave}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.modalClose}>{t('lookingFor.done')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ageScrollView}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSelectedAge(field === 'min_age' ? 18 : 99)}
              >
                <Text style={styles.radioLabel}>{t('lookingFor.any')}</Text>
                <View style={styles.radioButton}>
                  {selectedAge === (field === 'min_age' ? 18 : 99) && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              {ages.map((age) => (
                <TouchableOpacity
                  key={age}
                  style={styles.radioOption}
                  onPress={() => setSelectedAge(age)}
                >
                  <Text style={styles.radioLabel}>{age}</Text>
                  <View style={styles.radioButton}>
                    {selectedAge === age && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa1170" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <InfoRow
            label={t('lookingFor.title')}
            value={getInterestedInLabel()}
            onPress={() => setShowGenderModal(true)}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <InfoRow
            label={t('lookingFor.minimumAge')}
            value={minAge === 18 ? t('lookingFor.any') : minAge.toString()}
            onPress={() => setShowMinAgeModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            label={t('lookingFor.maximumAge')}
            value={maxAge === 99 ? t('lookingFor.any') : maxAge.toString()}
            onPress={() => setShowMaxAgeModal(true)}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <GenderSelectionModal />
      <AgeSelectionModal
        visible={showMinAgeModal}
        onClose={() => setShowMinAgeModal(false)}
        currentValue={minAge}
        field="min_age"
        title={t('lookingFor.minimumAge')}
      />
      <AgeSelectionModal
        visible={showMaxAgeModal}
        onClose={() => setShowMaxAgeModal(false)}
        currentValue={maxAge}
        field="max_age"
        title={t('lookingFor.maximumAge')}
      />

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
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
  content: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fa1170',
  },
  radioOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fa1170',
  },
  ageScrollView: {
    maxHeight: 400,
  },
  savingOverlay: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fa1170',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
