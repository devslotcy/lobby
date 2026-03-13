import React, { useState, useContext, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import CustomAlert from '../components/CustomAlert';

export default function SignupScreenNew({ navigation }) {
  const { signup } = useContext(AuthContext);
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });

  // Date picker state
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(2000);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getYears = () => {
    const max = new Date().getFullYear() - 18;
    const result = [];
    for (let y = max; y >= 1940; y--) result.push(y);
    return result;
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    date_of_birth: '',
    gender: '',
    interested_in: '',
    bio: '',
    photo: null,
    location_lat: null,
    location_lng: null,
    location_city: '',
    usernameStatus: null, // null, 'checking', 'available', 'taken'
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    gender: '',
    interested_in: '',
  });

  // Refs for inputs
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Username check timeout ref
  const usernameCheckTimeout = useRef(null);

  // Location prefetch: arka planda konum alımını başlat
  const locationPrefetchRef = useRef(null); // Promise
  const [locationLoading, setLocationLoading] = useState(false);

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Username availability check
  const checkUsernameAvailability = async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/check-username/${username}`);
      return response.data.available;
    } catch (error) {
      console.error('Username check error:', error);
      return false;
    }
  };

  // Handle username change with debounced check
  const handleUsernameChange = (username) => {
    updateField('username', username);

    // Clear previous timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Reset status if username is too short
    if (username.length < 3) {
      setFormData(prev => ({ ...prev, username, usernameStatus: null }));
      return;
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setFormData(prev => ({ ...prev, username, usernameStatus: null }));
      return;
    }

    // Set checking status
    setFormData(prev => ({ ...prev, username, usernameStatus: 'checking' }));

    // Debounce API call (500ms)
    usernameCheckTimeout.current = setTimeout(async () => {
      const isAvailable = await checkUsernameAvailability(username);
      setFormData(prev => ({
        ...prev,
        usernameStatus: isAvailable ? 'available' : 'taken'
      }));
    }, 500);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setAlertConfig({
        visible: true,
        title: t('auth.signup.permissionRequired'),
        message: t('auth.signup.allowPhotosAccess'),
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateField('photo', result.assets[0]);
    }
  };

  // Düşük seviyede konum + reverse geocode — arka planda da çağrılabilir
  const fetchLocationData = useCallback(async () => {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return { granted: false, canAskAgain };
    }

    // Accuracy.Lowest → GPS'i kullanmaz, sadece ağ/cell tower → çok hızlı (~0.5s)
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
    const { latitude, longitude } = location.coords;

    let city = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    let country = '';

    try {
      const geocode = await Promise.race([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      city = geocode[0]?.district || geocode[0]?.city || geocode[0]?.subregion || city;
      country = geocode[0]?.country || '';
    } catch {
      // Timeout veya hata → koordinatları kullan, sorun değil
    }

    return { granted: true, latitude, longitude, city, country };
  }, []);

  // Step 4'e geçince arka planda konum almaya başla (prefetch)
  useEffect(() => {
    if (step === 4 && !formData.location_lat) {
      locationPrefetchRef.current = fetchLocationData();
    }
  }, [step]);

  // Step 5'e gelince prefetch tamamlandıysa otomatik doldur
  useEffect(() => {
    if (step === 5 && !formData.location_lat && locationPrefetchRef.current) {
      setLocationLoading(true);
      locationPrefetchRef.current
        .then((result) => {
          locationPrefetchRef.current = null;
          if (result?.granted && result.latitude) {
            setFormData(prev => ({
              ...prev,
              location_lat: result.latitude,
              location_lng: result.longitude,
              location_city: result.city,
              location_country: result.country,
            }));
          }
        })
        .catch(() => { locationPrefetchRef.current = null; })
        .finally(() => setLocationLoading(false));
    }
  }, [step]);

  const getLocation = async () => {
    try {
      setLocationLoading(true);

      // Prefetch zaten başlamışsa onun sonucunu bekle, yoksa şimdi başlat
      const result = await (locationPrefetchRef.current || fetchLocationData());
      locationPrefetchRef.current = null;

      if (!result.granted) {
        const { canAskAgain } = result;
        setAlertConfig({
          visible: true,
          title: t('auth.signup.permissionRequired'),
          message: canAskAgain
            ? t('auth.signup.allowLocationAccess')
            : t('auth.signup.locationPermissionDenied', { defaultValue: 'Konum izni reddedildi. Uygulama konum tabanlı çalıştığı için izin zorunludur. Lütfen ayarlardan izin verin.' }),
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            if (!canAskAgain) Linking.openSettings();
          },
          onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          confirmText: canAskAgain
            ? t('common.ok', { defaultValue: 'Tamam' })
            : t('auth.signup.openSettings', { defaultValue: 'Ayarları Aç' }),
        });
        return false;
      }

      setFormData(prev => ({
        ...prev,
        location_lat: result.latitude,
        location_lng: result.longitude,
        location_city: result.city,
        location_country: result.country,
      }));

      return true;
    } catch (error) {
      console.error('Location error:', error);
      locationPrefetchRef.current = null;
      setAlertConfig({
        visible: true,
        title: t('auth.signup.locationError'),
        message: t('auth.signup.couldNotGetLocation'),
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
      return false;
    } finally {
      setLocationLoading(false);
    }
  };

  const validateStep = () => {
    // Clear previous errors
    setErrors({
      email: '',
      password: '',
      username: '',
      name: '',
      gender: '',
      interested_in: '',
    });

    switch (step) {
      case 1:
        // Email validation
        if (!formData.email) {
          setErrors(prev => ({ ...prev, email: t('auth.signup.emailRequired') }));
          emailInputRef.current?.focus();
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setErrors(prev => ({ ...prev, email: t('auth.signup.validEmail') }));
          emailInputRef.current?.focus();
          return false;
        }

        // Password validation
        if (!formData.password) {
          setErrors(prev => ({ ...prev, password: t('auth.signup.passwordRequired') }));
          passwordInputRef.current?.focus();
          return false;
        }
        if (formData.password.length < 8) {
          setErrors(prev => ({ ...prev, password: t('auth.signup.passwordMinLength') }));
          passwordInputRef.current?.focus();
          return false;
        }

        // Username validation
        if (!formData.username) {
          setErrors(prev => ({ ...prev, username: t('auth.signup.usernameRequired') }));
          usernameInputRef.current?.focus();
          return false;
        }
        if (formData.username.length < 3 || formData.username.length > 30) {
          setErrors(prev => ({ ...prev, username: t('auth.signup.usernameLength', { length: formData.username.length }) }));
          usernameInputRef.current?.focus();
          return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          setErrors(prev => ({ ...prev, username: t('auth.signup.usernameFormat') }));
          usernameInputRef.current?.focus();
          return false;
        }
        // Check username availability
        if (formData.usernameStatus !== 'available') {
          setErrors(prev => ({
            ...prev,
            username: formData.usernameStatus === 'taken'
              ? t('auth.signup.usernameTaken')
              : t('auth.signup.checkingAvailability')
          }));
          usernameInputRef.current?.focus();
          return false;
        }
        break;
      case 2:
        if (!formData.name) {
          setErrors(prev => ({ ...prev, name: t('auth.signup.nameRequired') }));
          nameInputRef.current?.focus();
          return false;
        }
        if (!formData.date_of_birth) {
          setAlertConfig({
            visible: true,
            title: t('auth.signup.birthDateRequired'),
            message: t('auth.signup.pleaseSelectBirthDate'),
            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
          });
          return false;
        }
        break;
      case 3:
        if (!formData.gender) {
          setErrors(prev => ({ ...prev, gender: t('auth.signup.selectGender') }));
          return false;
        }
        if (!formData.interested_in) {
          setErrors(prev => ({ ...prev, interested_in: t('auth.signup.selectInterestedIn') }));
          return false;
        }
        break;
      case 4:
        if (!formData.photo) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('auth.signup.pleaseUploadPhoto'),
            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
          });
          return false;
        }
        break;
      case 5:
        console.log('Validation Step 5:', {
          location_lat: formData.location_lat,
          location_lng: formData.location_lng,
          location_city: formData.location_city,
        });
        if (!formData.location_lat || !formData.location_lng) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('auth.signup.pleaseSetLocation'),
            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < 5) {
      setStep(step + 1);
    } else {
      await handleSignup();
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('date_of_birth', formData.date_of_birth);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('interested_in', formData.interested_in);
      formDataToSend.append('bio', formData.bio || '');
      formDataToSend.append('location_lat', formData.location_lat);
      formDataToSend.append('location_lng', formData.location_lng);
      formDataToSend.append('location_city', formData.location_city);

      if (formData.photo) {
        formDataToSend.append('photo', {
          uri: formData.photo.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
      }

      console.log('Sending signup request...');
      await signup(formDataToSend);
      console.log('Signup successful! User logged in automatically.');
      // AuthContext automatically logs in the user, navigation will happen via AuthProvider
    } catch (error) {
      console.error('Signup error:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = t('auth.signup.signupFailed');

      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || t('auth.signup.serverError', { status: error.response.status });
      } else if (error.message) {
        // Network or other error with custom message from interceptor
        errorMessage = error.message;
      }

      setAlertConfig({
        visible: true,
        title: t('auth.signup.signupError'),
        message: errorMessage,
        onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
        onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
      });
    } finally {
      setLoading(false);
    }
  };


  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('auth.signup.createAccount')}</Text>
            <Text style={styles.stepSubtitle}>{t('auth.signup.step1')}</Text>

            <View>
              <TextInput
                ref={emailInputRef}
                style={[styles.input, errors.email && styles.inputError]}
                placeholder={t('auth.signup.email')}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={formData.email}
                onChangeText={(v) => {
                  updateField('email', v);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, errors.password && styles.inputError]}
                placeholder={t('auth.signup.password')}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={formData.password}
                onChangeText={(v) => {
                  updateField('password', v);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                secureTextEntry
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View>
              <TextInput
                ref={usernameInputRef}
                style={[
                  styles.input,
                  errors.username && styles.inputError,
                  formData.usernameStatus === 'checking' && styles.inputChecking,
                  formData.usernameStatus === 'available' && styles.inputAvailable,
                  formData.usernameStatus === 'taken' && styles.inputTaken
                ]}
                placeholder={t('auth.signup.username')}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              value={formData.username}
              onChangeText={(v) => {
                handleUsernameChange(v.toLowerCase());
                if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
              }}
              autoCapitalize="none"
              maxLength={30}
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
            {formData.usernameStatus === 'checking' && (
              <View style={styles.usernameStatus}>
                <ActivityIndicator size="small" color="#f90e6e" />
                <Text style={styles.usernameStatusText}>{t('auth.signup.checkingUsername')}</Text>
              </View>
            )}
            {formData.usernameStatus === 'available' && formData.username.length >= 3 && (
              <View style={styles.usernameStatus}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={[styles.usernameStatusText, { color: '#10B981' }]}>
                  {t('auth.signup.usernameAvailable', { username: formData.username })}
                </Text>
              </View>
            )}
            {formData.usernameStatus === 'taken' && (
              <View style={styles.usernameStatus}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={[styles.usernameStatusText, { color: '#EF4444' }]}>
                  {t('auth.signup.usernameNotAvailable', { username: formData.username })}
                </Text>
              </View>
            )}
            {!formData.usernameStatus && (
              <Text style={styles.hint}>{t('auth.signup.usernameOnlyLetters')}</Text>
            )}
          </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('profile.preview.yourName')}</Text>
            <Text style={styles.stepSubtitle}>{t('auth.signup.step2')}</Text>

            <View>
              <TextInput
                ref={nameInputRef}
                style={[styles.input, errors.name && styles.inputError]}
                placeholder={t('auth.signup.fullName')}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={formData.name}
                onChangeText={(v) => {
                  updateField('name', v);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <Text style={styles.label}>{t('auth.signup.birthDate')}</Text>
            <TouchableOpacity
              style={styles.modernDateButton}
              onPress={() => {
                // If date is already set, parse it for the wheel picker
                if (formData.date_of_birth) {
                  const parts = formData.date_of_birth.substring(0, 10).split('-');
                  setTempYear(parseInt(parts[0]));
                  setTempMonth(parseInt(parts[1]) - 1);
                  setTempDay(parseInt(parts[2]));
                } else {
                  setTempYear(2000);
                  setTempMonth(0);
                  setTempDay(1);
                }
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dateContent}>
                <View style={styles.dateIconWrapper}>
                  <Ionicons name="calendar-outline" size={24} color="#f90e6e" />
                </View>
                <View style={styles.dateTextWrapper}>
                  <Text style={styles.dateLabel}>{t('auth.signup.yourBirthday')}</Text>
                  <Text style={[styles.dateValue, !formData.date_of_birth && styles.datePlaceholder]}>
                    {formData.date_of_birth
                      ? new Date(formData.date_of_birth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : t('auth.signup.tapToSelectBirthDate')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            {/* Date Picker Modal */}
            <Modal
              transparent
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => setShowDatePicker(false)}
                />
                <TouchableOpacity activeOpacity={1} style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
                  <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
                  <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Date of Birth</Text>

                  <View style={[styles.pickerSelectedBar, { backgroundColor: colors.background }]}>
                    <Text style={styles.pickerSelectedText}>
                      {String(tempDay).padStart(2, '0')} {MONTHS[tempMonth]} {tempYear}
                    </Text>
                  </View>

                  <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Day</Text>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
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

                  <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Month</Text>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
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

                  <Text style={[styles.pickerSectionLabel, { color: colors.textSecondary }]}>Year</Text>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
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

                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => {
                      const selected = new Date(tempYear, tempMonth, tempDay);
                      const today = new Date();
                      const age = today.getFullYear() - selected.getFullYear();
                      const m = today.getMonth() - selected.getMonth();
                      const isUnder18 = age < 18 || (age === 18 && (m < 0 || (m === 0 && today.getDate() < selected.getDate())));
                      if (isUnder18) {
                        setAlertConfig({
                          visible: true,
                          title: t('auth.signup.ageRestriction'),
                          message: t('auth.signup.mustBe18'),
                          onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                          onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                        });
                        return;
                      }
                      const isoDate = `${tempYear}-${String(tempMonth + 1).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
                      updateField('date_of_birth', isoDate);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.doneButtonText}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </Modal>

            <View style={styles.birthdayHelp}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" style={{ marginTop: 10 }} />
              <Text style={styles.helperText}>{t('auth.signup.ageWillBeVisible')}</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('lookingFor.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('auth.signup.step3')}</Text>

            <View>
              <Text style={styles.label}>{t('auth.signup.iAm')}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.optionButton, formData.gender === 'man' && styles.optionButtonSelected]}
                  onPress={() => {
                    updateField('gender', 'man');
                    if (errors.gender) setErrors(prev => ({ ...prev, gender: '' }));
                  }}
                >
                  <Text style={[styles.optionText, formData.gender === 'man' && styles.optionTextSelected]}>
                    {t('auth.signup.man')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, formData.gender === 'woman' && styles.optionButtonSelected]}
                  onPress={() => {
                    updateField('gender', 'woman');
                    if (errors.gender) setErrors(prev => ({ ...prev, gender: '' }));
                  }}
                >
                  <Text style={[styles.optionText, formData.gender === 'woman' && styles.optionTextSelected]}>
                    {t('auth.signup.woman')}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
            </View>

            <View>
              <Text style={styles.label}>{t('auth.signup.interestedIn')}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.optionButton, formData.interested_in === 'men' && styles.optionButtonSelected]}
                  onPress={() => {
                    updateField('interested_in', 'men');
                    if (errors.interested_in) setErrors(prev => ({ ...prev, interested_in: '' }));
                  }}
                >
                  <Text style={[styles.optionText, formData.interested_in === 'men' && styles.optionTextSelected]}>
                    {t('auth.signup.men')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, formData.interested_in === 'women' && styles.optionButtonSelected]}
                  onPress={() => {
                    updateField('interested_in', 'women');
                    if (errors.interested_in) setErrors(prev => ({ ...prev, interested_in: '' }));
                  }}
                >
                  <Text style={[styles.optionText, formData.interested_in === 'women' && styles.optionTextSelected]}>
                    {t('auth.signup.women')}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.interested_in ? <Text style={styles.errorText}>{errors.interested_in}</Text> : null}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('auth.signup.profilePhoto')}</Text>
            <Text style={styles.stepSubtitle}>{t('auth.signup.step4')}</Text>

            {formData.photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.photo.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
                  <Text style={styles.changePhotoText}>{t('auth.signup.changePhoto')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>{t('auth.signup.uploadPhoto')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.helperText}>{t('auth.signup.photoRequired')}</Text>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('auth.signup.tellUsAboutYou')}</Text>
            <Text style={styles.stepSubtitle}>{t('auth.signup.step5')}</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('auth.signup.writeAboutYourself')}
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              value={formData.bio}
              onChangeText={(v) => updateField('bio', v)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.charCount}>{formData.bio.length}/500</Text>

            <View style={styles.locationSection}>
              <Text style={styles.label}>{t('auth.signup.yourLocation')}</Text>

              {formData.location_city ? (
                <View style={styles.locationFoundCard}>
                  <View style={styles.locationFoundHeader}>
                    <Ionicons name="location" size={24} color="#10B981" />
                    <View style={styles.locationFoundInfo}>
                      <Text style={styles.locationFoundCity}>{formData.location_city}</Text>
                      <Text style={styles.locationFoundCoords}>
                        {formData.location_lat?.toFixed(4)}, {formData.location_lng?.toFixed(4)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.locationRefreshButton}
                      onPress={async () => {
                        const success = await getLocation();
                        if (!success) {
                          setAlertConfig({
                            visible: true,
                            title: t('common.error'),
                            message: t('auth.signup.couldNotGetLocation'),
                            onConfirm: () => setAlertConfig({ ...alertConfig, visible: false }),
                            onCancel: () => setAlertConfig({ ...alertConfig, visible: false })
                          });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.locationFoundHelper}>
                    {t('auth.signup.locationWillBeUsed')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.modernLocationButton, locationLoading && styles.buttonDisabled]}
                  onPress={async () => {
                    if (locationLoading) return;
                    await getLocation();
                  }}
                  activeOpacity={0.8}
                  disabled={locationLoading}
                >
                  <View style={styles.locationButtonContent}>
                    <View style={styles.locationIconCircle}>
                      {locationLoading
                        ? <ActivityIndicator color="#FFFFFF" size="small" />
                        : <Ionicons name="location" size={28} color="#FFFFFF" />
                      }
                    </View>
                    <View style={styles.locationButtonTextWrapper}>
                      <Text style={styles.locationButtonTitle}>
                        {locationLoading
                          ? t('auth.signup.detectingLocation', { defaultValue: 'Konum alınıyor...' })
                          : t('auth.signup.getMyLocation')
                        }
                      </Text>
                      <Text style={styles.locationButtonSubtitle}>
                        {locationLoading
                          ? t('auth.signup.pleaseWait', { defaultValue: 'Lütfen bekleyin' })
                          : t('auth.signup.tapToDetectLocation')
                        }
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {!formData.location_city && (
                <Text style={styles.locationHelperText}>
                  {t('auth.signup.locationRequired')}
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, s <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {step === 5 ? t('auth.signup.completeSignup') : t('auth.signup.next')}
            </Text>
          )}
        </TouchableOpacity>

        {step === 1 && (
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              <Text style={styles.linkTextDark}>{t('auth.signup.haveAccount')} </Text>
              <Text style={styles.linkTextBold}>{t('auth.signup.login')}</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>

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

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 15,
    height: 50,
  },
  backButton: {
    fontSize: 16,
    color: '#f90e6e',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
    marginTop: 40,
  },
  progressDot: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ddd',
  },
  progressDotActive: {
    backgroundColor: '#f90e6e',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
    marginTop: 12,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  input: {
    backgroundColor: colors.input,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: '#EF4444',
    marginBottom: 5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    marginLeft: 5,
  },
  inputChecking: {
    borderColor: '#f90e6e',
  },
  inputAvailable: {
    borderColor: '#10B981',
  },
  inputTaken: {
    borderColor: '#EF4444',
  },
  usernameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 12,
    marginLeft: 4,
    gap: 6,
  },
  usernameStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  optionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  optionButtonSelected: {
    borderColor: '#f90e6e',
    backgroundColor: '#FFF0F6',
  },
  optionText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#f90e6e',
  },
  uploadButton: {
    height: 300,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: colors.surface,
  },
  uploadIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  uploadText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImage: {
    width: 300,
    height: 400,
    borderRadius: 15,
    marginBottom: 15,
  },
  changePhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f90e6e',
  },
  changePhotoText: {
    color: '#f90e6e',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 10,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 5,
  },
  footer: {
    padding: 20,
    gap: 15,
  },
  button: {
    backgroundColor: '#f90e6e',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 15,
  },
  linkTextDark: {
    color: colors.textPrimary,
  },
  linkTextBold: {
    color: '#f90e6e',
    fontWeight: '600',
  },
  // Modern DatePicker Button
  modernDateButton: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dateIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTextWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  datePlaceholder: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalBackground,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButtonIcon: {
    padding: 4,
  },
  ageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F6',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f90e6e',
  },
  ageNoticeText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  // Modern Dropdown Picker Styles
  pickerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  pickerColumn: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  datePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  datePreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalActions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#f90e6e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  birthdayHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    paddingHorizontal: 4,
    gap: 6,
  },
  locationSection: {
    marginTop: 20,
  },
  // Modern Location Button (Before Location)
  modernLocationButton: {
    backgroundColor: isDarkMode ? colors.card : '#1F2937',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  locationIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f90e6e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#f90e6e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  locationButtonTextWrapper: {
    flex: 1,
  },
  locationButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationButtonSubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  locationHelperText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Location Found Card (After Location)
  locationFoundCard: {
    backgroundColor: isDarkMode ? '#064E3B' : '#F0FDF4',
    borderWidth: 1.5,
    borderColor: isDarkMode ? '#059669' : '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locationFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationFoundInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationFoundCity: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationFoundCoords: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationFoundHelper: {
    fontSize: 13,
    color: isDarkMode ? '#6EE7B7' : '#059669',
    fontWeight: '500',
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
  },
});
