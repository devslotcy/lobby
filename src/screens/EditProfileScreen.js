import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../hooks/useToast';
import { userAPI, authAPI } from '../services/api';
import eventEmitter, { EVENTS } from '../utils/EventEmitter';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { updateUserState } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    username: '',
    date_of_birth: null,
    location_city: '',
  });
  const [originalUsername, setOriginalUsername] = useState(''); // Track original username
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Custom date picker state
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(2000);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available', 'taken', 'checking', 'invalid', null
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      console.log('📥 Profile Data:', data.user);
      console.log('Username:', data.user.username);
      console.log('Date of Birth:', data.user.date_of_birth);
      setProfile({
        name: data.user.name,
        bio: data.user.bio || '',
        username: data.user.username || '',
        date_of_birth: data.user.date_of_birth ? String(data.user.date_of_birth).substring(0, 10) : null,
        location_city: data.user.location_city || '',
      });
      // Save original username to compare later
      setOriginalUsername(data.user.username || '');
    } catch (error) {
      showToast(t('editProfile.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setProfile({ ...profile, [field]: value });

    // Real-time username availability check
    if (field === 'username') {
      handleUsernameChange(value);
    }
  };

  const handleUsernameChange = (username) => {
    // Clear previous timeout
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }

    // Reset status if empty
    if (!username || username.trim() === '') {
      setUsernameStatus(null);
      return;
    }

    // Check if it's the same as original username (no change)
    if (username.toLowerCase() === originalUsername.toLowerCase()) {
      setUsernameStatus(null); // No need to check, it's their current username
      return;
    }

    // Validate format first (3-30 chars, lowercase, alphanumeric + underscore)
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    // Show checking status
    setUsernameStatus('checking');

    // Debounce: wait 500ms after user stops typing
    const timeout = setTimeout(async () => {
      try {
        const response = await authAPI.checkUsername(username);

        if (response.data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus(null);
      }
    }, 500);

    setUsernameCheckTimeout(timeout);
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

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

  const getYears = () => {
    const max = new Date().getFullYear() - 18;
    const years = [];
    for (let y = max; y >= 1940; y--) years.push(y);
    return years;
  };

  const openDatePicker = () => {
    if (profile.date_of_birth) {
      const dob = profile.date_of_birth;
      let day, month, year;
      if (dob instanceof Date) {
        day = dob.getDate();
        month = dob.getMonth();
        year = dob.getFullYear();
      } else {
        // "2000-01-14T00:00:00.000Z" veya "2000-01-14" — substring ile al, timezone yok
        const parts = String(dob).substring(0, 10).split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      }
      setTempYear(year);
      setTempMonth(month);
      setTempDay(day);
    } else {
      setTempYear(2000);
      setTempMonth(0);
      setTempDay(1);
    }
    setShowDatePicker(true);
  };

  const confirmDatePicker = () => {
    const selected = new Date(tempYear, tempMonth, tempDay);
    const today = new Date();
    const age = today.getFullYear() - selected.getFullYear();
    const m = today.getMonth() - selected.getMonth();
    const isUnder18 = age < 18 || (age === 18 && (m < 0 || (m === 0 && today.getDate() < selected.getDate())));
    if (isUnder18) {
      Alert.alert('Age Restriction', 'You must be at least 18 years old.');
      return;
    }
    // String olarak sakla — timezone kayması yok, formatDate ve backend ikisi de çalışır
    const isoDate = `${tempYear}-${String(tempMonth + 1).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
    updateField('date_of_birth', isoDate);
    setShowDatePicker(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    // "2000-01-14" veya "2000-01-14T..." string — direkt parse et
    const str = (date instanceof Date) ?
      `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      : String(date).substring(0, 10);
    const parts = str.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('editProfile.permissionRequired'),
          t('editProfile.allowLocationAccess')
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      // Reverse geocoding
      let city = 'Unknown';
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Geocoding timeout')), 3000)
        );

        const geocode = await Promise.race([
          Location.reverseGeocodeAsync({ latitude, longitude }),
          timeoutPromise
        ]);

        city = geocode[0]?.district || geocode[0]?.city || geocode[0]?.subregion || 'Unknown';
      } catch (geocodeError) {
        console.warn('Geocoding failed, using coordinates:', geocodeError);
        city = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      }

      setProfile({
        ...profile,
        location_city: city,
      });

      showToast(t('editProfile.locationDetected'));
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        t('editProfile.locationError'),
        t('editProfile.enableLocationServices')
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    // Check if username is taken
    if (usernameStatus === 'taken') {
      Alert.alert(
        t('editProfile.errors.usernameTaken') || 'Username Taken',
        'This username is already taken. Please choose another.'
      );
      return;
    }

    // Validate username format
    if (profile.username && usernameStatus === 'invalid') {
      Alert.alert(
        t('editProfile.errors.invalidUsername') || 'Invalid Username',
        'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores.'
      );
      return;
    }

    setSaving(true);
    try {
      // Prepare profile data - convert date to ISO string if exists
      // toISOString() UTC'ye çevirir, timezone farkında 1 gün kayar.
      // Local yıl/ay/gün kullanarak formatlıyoruz.
      const profileData = {
        ...profile,
        // Zaten "YYYY-MM-DD" string — direkt gönder
        date_of_birth: profile.date_of_birth
          ? String(profile.date_of_birth).substring(0, 10)
          : null,
      };

      console.log('💾 Saving profile data:', {
        date_of_birth: profileData.date_of_birth,
        username: profileData.username,
        name: profileData.name
      });

      // If username hasn't changed, don't send it
      if (profile.username.toLowerCase() === originalUsername.toLowerCase()) {
        delete profileData.username;
      }

      // 🔥 Call API and get fresh user data
      const response = await userAPI.updateProfile(profileData);
      console.log('✅ Profile update response:', response.data);

      // 🔥 IMMEDIATELY update global state with fresh data from server
      if (response.data.user) {
        await updateUserState(response.data.user);
        // Ayrıca local profile state'i de güncelle — geri dönünce eski veri görünmesin
        setProfile({
          name: response.data.user.name,
          bio: response.data.user.bio || '',
          username: response.data.user.username || '',
          date_of_birth: response.data.user.date_of_birth
            ? String(response.data.user.date_of_birth).substring(0, 10)
            : null,
          location_city: response.data.user.location_city || '',
        });
        setOriginalUsername(response.data.user.username || '');
      }

      // Emit event to refresh Discovery and Near Me screens
      eventEmitter.emit(EVENTS.FILTERS_CHANGED);

      showToast(t('editProfile.success') || 'Profile updated!');

      // Just go back - no forced profile completion
      setTimeout(() => navigation.goBack(), 500);
    } catch (error) {
      console.error('❌ Profile update error:', error);

      // 🔥 Handle username taken error (409 Conflict)
      if (error.response?.status === 409) {
        Alert.alert(
          t('editProfile.errors.usernameTaken') || 'Username Taken',
          error.response?.data?.message || 'This username is already taken. Please choose another.'
        );
      } else {
        showToast(error.response?.data?.message || t('editProfile.errors.updateFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('editProfile.title')}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Username Section */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('editProfile.username')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.input }]}>
              <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>@</Text>
              <TextInput
                style={[styles.inputWithPrefix, { color: colors.textPrimary }]}
                value={profile.username}
                onChangeText={(v) => updateField('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={t('editProfile.usernamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>

            {/* Username Status Messages */}
            {usernameStatus === 'checking' && (
              <View style={styles.usernameStatusContainer}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={[styles.usernameStatusText, { color: colors.textSecondary }]}>
                  Checking availability...
                </Text>
              </View>
            )}

            {usernameStatus === 'available' && (
              <View style={styles.usernameStatusContainer}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={[styles.usernameStatusText, { color: '#10b981' }]}>
                  Username is available!
                </Text>
              </View>
            )}

            {usernameStatus === 'taken' && (
              <View style={styles.usernameStatusContainer}>
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={[styles.usernameStatusText, { color: '#ef4444' }]}>
                  Username is already taken
                </Text>
              </View>
            )}

            {usernameStatus === 'invalid' && (
              <View style={styles.usernameStatusContainer}>
                <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                <Text style={[styles.usernameStatusText, { color: '#f59e0b' }]}>
                  3-30 characters, lowercase letters, numbers, and underscores only
                </Text>
              </View>
            )}
          </View>

          {/* Name Section */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('editProfile.name')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.textPrimary }]}
              value={profile.name}
              onChangeText={(v) => updateField('name', v)}
              placeholder={t('editProfile.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('editProfile.bio')}
              </Text>
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {profile.bio.length}/500
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.input, color: colors.textPrimary }]}
              value={profile.bio}
              onChangeText={(v) => updateField('bio', v)}
              placeholder={t('editProfile.bioPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Birthday Section */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('editProfile.birthday')}
              </Text>
              {profile.date_of_birth && (
                <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                  {calculateAge(profile.date_of_birth)} {t('editProfile.yearsOld')}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, { backgroundColor: colors.input }]}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateText, { color: profile.date_of_birth ? colors.textPrimary : colors.textSecondary }]}>
                {profile.date_of_birth ? formatDate(profile.date_of_birth) : t('editProfile.birthdayPlaceholder')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('editProfile.location')}
            </Text>

            {profile.location_city ? (
              <View style={[styles.locationContainer, { backgroundColor: colors.input }]}>
                <Text style={styles.locationIconText}>📍</Text>
                <Text style={[styles.locationText, { color: colors.textPrimary }]}>
                  {profile.location_city}
                </Text>
                <TouchableOpacity
                  onPress={getLocation}
                  style={styles.refreshLocationButton}
                  disabled={gettingLocation}
                >
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={gettingLocation ? colors.textSecondary : '#f80f6e'}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: colors.input }]}
                onPress={getLocation}
                disabled={gettingLocation}
                activeOpacity={0.7}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#f80f6e" />
                ) : (
                  <>
                    <Ionicons name="location" size={24} color="#f80f6e" />
                    <Text style={[styles.locationButtonText, { color: colors.textPrimary }]}>
                      {t('editProfile.getMyLocation')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('editProfile.saveChanges')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Date Picker Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Date of Birth</Text>

            {/* Selected display */}
            <View style={[styles.pickerSelectedBar, { backgroundColor: colors.background }]}>
              <Text style={styles.pickerSelectedText}>
                {String(tempDay).padStart(2, '0')} {MONTHS[tempMonth]} {tempYear}
              </Text>
            </View>

            {/* Day row */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {Array.from({ length: getDaysInMonth(tempMonth, tempYear) }, (_, i) => i + 1).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setTempDay(d)}
                  style={[styles.pickerChip, d === tempDay && styles.pickerChipSelected]}
                >
                  <Text style={[styles.pickerChipText, { color: d === tempDay ? '#fff' : colors.textPrimary }]}>
                    {String(d).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month row */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setTempMonth(i);
                    const maxDay = getDaysInMonth(i, tempYear);
                    if (tempDay > maxDay) setTempDay(maxDay);
                  }}
                  style={[styles.pickerChip, i === tempMonth && styles.pickerChipSelected]}
                >
                  <Text style={[styles.pickerChipText, { color: i === tempMonth ? '#fff' : colors.textPrimary }]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Year row */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {getYears().map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => {
                    setTempYear(y);
                    const maxDay = getDaysInMonth(tempMonth, y);
                    if (tempDay > maxDay) setTempDay(maxDay);
                  }}
                  style={[styles.pickerChip, y === tempYear && styles.pickerChipSelected]}
                >
                  <Text style={[styles.pickerChipText, { color: y === tempYear ? '#fff' : colors.textPrimary }]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.doneButton} onPress={confirmDatePicker}>
              <Text style={styles.doneButtonText}>Confirm</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    fontSize: 36,
    fontWeight: '300',
    color: '#fa1170',
    lineHeight: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 44,
  },
  // ScrollView Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  bottomSpacer: {
    height: 30,
  },
  // Section Styles
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  ageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Input Styles
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 14,
  },
  inputPrefix: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  inputWithPrefix: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
    fontSize: 15,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  // Date Picker Styles
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerSelectedBar: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerSelectedText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fa1170',
  },
  pickerSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  pickerRow: {
    marginBottom: 12,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  pickerChipSelected: {
    backgroundColor: '#fa1170',
  },
  pickerChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#fa1170',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Location Styles
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  locationIconText: {
    fontSize: 20,
  },
  locationText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  refreshLocationButton: {
    padding: 6,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Save Button Styles
  saveButton: {
    backgroundColor: '#fa1170',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Username Status Styles
  usernameStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  usernameStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
