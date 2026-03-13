import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { userAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const getYears = () => {
  const max = new Date().getFullYear() - 18;
  const years = [];
  for (let y = max; y >= 1940; y--) years.push(y);
  return years;
};

export default function OnboardingScreen({ navigation, route }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { setIsProfileIncomplete, user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [gender, setGender] = useState(null);
  const [interestedIn, setInterestedIn] = useState(null);
  const [location, setLocation] = useState(null);

  // Date picker state (EditProfile style)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(2000);
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" string

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const handleGenderSelect = (selectedGender) => {
    setGender(selectedGender);
    setStep(2);
  };

  const openDatePicker = () => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      setTempYear(parseInt(parts[0]));
      setTempMonth(parseInt(parts[1]) - 1);
      setTempDay(parseInt(parts[2]));
    } else {
      setTempYear(2000);
      setTempMonth(0);
      setTempDay(1);
    }
    setShowDatePicker(true);
  };

  const confirmDatePicker = () => {
    const today = new Date();
    const age = today.getFullYear() - tempYear;
    const m = today.getMonth() - tempMonth;
    const isUnder18 = age < 18 || (age === 18 && (m < 0 || (m === 0 && today.getDate() < tempDay)));
    if (isUnder18) {
      Alert.alert(t('common.error'), 'You must be at least 18 years old');
      return;
    }
    const isoDate = `${tempYear}-${String(tempMonth + 1).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
    setSelectedDate(isoDate);
    setShowDatePicker(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleDateConfirm = () => {
    if (!selectedDate) {
      Alert.alert(t('common.error'), 'Please select your birthday');
      return;
    }
    setStep(3);
  };

  const handleInterestedInSelect = (selected) => {
    setInterestedIn(selected);
    setStep(4);
  };

  const handleLocationRequest = async () => {
    try {
      setLoading(true);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Location permission is required to find matches nearby'
        );
        setLoading(false);
        return;
      }

      // Get current location
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Get city name from coordinates
      const geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });

      const locationResult = {
        lat: locationData.coords.latitude,
        lng: locationData.coords.longitude,
        city: geocode[0]?.city || geocode[0]?.district || geocode[0]?.subregion || null,
        country: geocode[0]?.country || null,
      };

      setLocation(locationResult);

      // Save all data to backend
      await saveProfileData(locationResult);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(t('common.error'), 'Failed to get location. Please try again.');
      setLoading(false);
    }
  };

  const saveProfileData = async (locationData = null) => {
    try {
      const updateData = {
        gender: gender,
        date_of_birth: selectedDate,
        interested_in: interestedIn,
      };

      const loc = locationData || location;
      if (loc) {
        updateData.location_lat = loc.lat;
        updateData.location_lng = loc.lng;
        updateData.location_city = loc.city;
        updateData.location_country = loc.country;
      }

      console.log('📝 Updating profile with:', updateData);

      await userAPI.updateProfile(updateData);

      // Refresh user data in AsyncStorage
      const { data } = await userAPI.getProfile();
      const updatedUser = { ...data.user, needs_profile_completion: false };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      // User ID bazlı key ile sakla — farklı hesaplarda karışmasın
      const onboardingKey = `onboarding_complete_${data.user?.id}`;
      await AsyncStorage.setItem(onboardingKey, 'true');

      // Profil tamamlandı — flag'i kapat (navigation otomatik Main'e geçecek)
      setIsProfileIncomplete(false);

      setLoading(false);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(t('common.error'), 'Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>What's your gender?</Text>
      <Text style={styles.subtitle}>Help us find better matches for you</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleGenderSelect('man')}
      >
        <Text style={styles.optionText}>Man</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleGenderSelect('woman')}
      >
        <Text style={styles.optionText}>Woman</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    const days = Array.from({ length: getDaysInMonth(tempMonth, tempYear) }, (_, i) => i + 1);
    const years = getYears();
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.title}>When's your birthday?</Text>
        <Text style={styles.subtitle}>You must be at least 18 years old</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={openDatePicker}
        >
          <Text style={[styles.dateText, { color: selectedDate ? colors.textPrimary : colors.textSecondary }]}>
            {selectedDate ? formatDate(selectedDate) : 'Select your birthday'}
          </Text>
        </TouchableOpacity>

        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Birthday</Text>
              <View style={styles.pickerRow}>
                {/* Day */}
                <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                  {days.map(d => (
                    <TouchableOpacity key={d} style={[styles.pickerItem, tempDay === d && styles.pickerItemSelected]} onPress={() => setTempDay(d)}>
                      <Text style={[styles.pickerItemText, { color: colors.textPrimary }, tempDay === d && styles.pickerItemTextSelected]}>{String(d).padStart(2,'0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Month */}
                <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity key={i} style={[styles.pickerItem, tempMonth === i && styles.pickerItemSelected]} onPress={() => setTempMonth(i)}>
                      <Text style={[styles.pickerItemText, { color: colors.textPrimary }, tempMonth === i && styles.pickerItemTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Year */}
                <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                  {years.map(y => (
                    <TouchableOpacity key={y} style={[styles.pickerItem, tempYear === y && styles.pickerItemSelected]} onPress={() => setTempYear(y)}>
                      <Text style={[styles.pickerItemText, { color: colors.textPrimary }, tempYear === y && styles.pickerItemTextSelected]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDatePicker}>
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleDateConfirm}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Who are you interested in?</Text>
      <Text style={styles.subtitle}>We'll show you matches based on your preference</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleInterestedInSelect('men')}
      >
        <Text style={styles.optionText}>Men</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleInterestedInSelect('women')}
      >
        <Text style={styles.optionText}>Women</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleInterestedInSelect('everyone')}
      >
        <Text style={styles.optionText}>Everyone</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Enable Location</Text>
      <Text style={styles.subtitle}>
        We need your location to show you matches nearby
      </Text>

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.continueButtonDisabled]}
        onPress={handleLocationRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Enable Location</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => saveProfileData()}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 40,
      gap: 8,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      backgroundColor: '#E94057',
      width: 24,
    },
    stepContainer: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 40,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    optionButton: {
      width: '100%',
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 20,
      marginBottom: 16,
      alignItems: 'center',
    },
    optionText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dateButton: {
      width: '100%',
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 20,
      marginBottom: 24,
      alignItems: 'center',
    },
    dateText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    continueButton: {
      width: '100%',
      backgroundColor: '#E94057',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      opacity: 0.6,
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
    },
    skipButton: {
      marginTop: 16,
      padding: 12,
    },
    skipButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 16,
    },
    pickerRow: {
      flexDirection: 'row',
      height: 200,
      gap: 8,
    },
    pickerCol: {
      flex: 1,
    },
    pickerItem: {
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    pickerItemSelected: {
      backgroundColor: '#E94057',
    },
    pickerItemText: {
      fontSize: 16,
    },
    pickerItemTextSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalConfirmBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: '#E94057',
    },
    modalConfirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });
