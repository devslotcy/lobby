import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import en from './locales/en';
import tr from './locales/tr';
import es from './locales/es';
import pt from './locales/pt';
import fr from './locales/fr';
import id from './locales/id';
import th from './locales/th';
import ar from './locales/ar';
import ru from './locales/ru';

const LANGUAGE_KEY = '@app_language';

// Available languages
const locales = {
  en,
  tr,
  es,
  pt,
  fr,
  id,
  th,
  ar,
  ru,
};

// Default language
let currentLanguage = 'en';
let currentLocale = locales.en;

// Initialize language from storage or device
export const initLanguage = async () => {
  try {
    // Always use device language (ignore saved language for now)
    const deviceLang = getDeviceLanguage();
    console.log('[i18n] Device language:', deviceLang);
    currentLanguage = deviceLang;
    currentLocale = locales[deviceLang];
    console.log('[i18n] Using device language:', deviceLang);

    // Save device language to storage
    await AsyncStorage.setItem(LANGUAGE_KEY, deviceLang);
  } catch (error) {
    console.log('[i18n] Error loading language:', error);
  }
  console.log('[i18n] Final language:', currentLanguage);
  return currentLanguage;
};

// Set language
export const setLanguage = async (lang) => {
  if (locales[lang]) {
    currentLanguage = lang;
    currentLocale = locales[lang];
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    return true;
  }
  return false;
};

// Get current language
export const getLanguage = () => currentLanguage;

// Get device language
export const getDeviceLanguage = () => {
  try {
    const deviceLocales = Localization.getLocales();
    console.log('[i18n] Device locales:', deviceLocales);
    if (deviceLocales && deviceLocales.length > 0) {
      let deviceLang = deviceLocales[0].languageCode;
      console.log('[i18n] Device language code:', deviceLang);

      // Map alternative language codes to standard codes
      const languageMap = {
        'in': 'id', // Indonesian: 'in' (deprecated) -> 'id' (ISO 639-1)
      };

      if (languageMap[deviceLang]) {
        console.log(`[i18n] Mapping ${deviceLang} to ${languageMap[deviceLang]}`);
        deviceLang = languageMap[deviceLang];
      }

      // Check if we support this language
      if (locales[deviceLang]) {
        console.log('[i18n] ✅ Language supported:', deviceLang);
        return deviceLang;
      } else {
        console.log('[i18n] ❌ Language not supported, falling back to English');
      }
    }
  } catch (error) {
    console.log('[i18n] Error getting device language:', error);
  }
  return 'en'; // Fallback to English
};

// Get available languages (sorted by popularity and user experience)
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

// Translation function with interpolation support
export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = currentLocale;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = locales.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }

  // If value is an array, return it as-is (for list translations)
  if (Array.isArray(value)) {
    return value;
  }

  // If value is not a string, return the value itself (for objects, etc.)
  if (typeof value !== 'string') {
    return value;
  }

  // Replace placeholders like {{name}} with params
  return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
};

// Format date with localized month names
export const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  const day = d.getDate();
  const monthIndex = d.getMonth();
  const year = d.getFullYear();

  const months = currentLocale.date.months;
  const monthsFull = currentLocale.date.monthsFull;

  switch (format) {
    case 'short':
      // "7 Jan" or "7 Oca"
      return `${day} ${months[monthIndex]}`;
    case 'medium':
      // "7 January" or "7 Ocak"
      return `${day} ${monthsFull[monthIndex]}`;
    case 'long':
      // "7 January 2024" or "7 Ocak 2024"
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    case 'monthDay':
      // "Jan 7" or "Oca 7"
      return `${months[monthIndex]} ${day}`;
    default:
      return `${day} ${months[monthIndex]}`;
  }
};

// Format relative time (e.g., "5 minutes ago")
export const formatRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diffSeconds = Math.floor((now - d) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return t('time.justNow');
  if (diffMinutes === 1) return t('time.minuteAgo');
  if (diffMinutes < 60) return t('time.minutesAgo', { count: diffMinutes });
  if (diffHours === 1) return t('time.hourAgo');
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('time.dayAgo');
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  if (diffWeeks === 1) return t('time.weekAgo');
  if (diffWeeks < 4) return t('time.weeksAgo', { count: diffWeeks });
  if (diffMonths === 1) return t('time.monthAgo');
  if (diffMonths < 12) return t('time.monthsAgo', { count: diffMonths });
  if (diffYears === 1) return t('time.yearAgo');
  return t('time.yearsAgo', { count: diffYears });
};

export default {
  t,
  formatDate,
  formatRelativeTime,
  setLanguage,
  getLanguage,
  getAvailableLanguages,
  initLanguage,
};
