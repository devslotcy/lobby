import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  initLanguage,
  setLanguage as setI18nLanguage,
  getLanguage,
  getAvailableLanguages,
  t as translate,
  formatDate as formatI18nDate,
  formatRelativeTime as formatI18nRelativeTime,
} from '../i18n';

export const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [loading, setLoading] = useState(true);

  // Load language settings on mount
  useEffect(() => {
    loadLanguageSettings();
  }, []);

  const loadLanguageSettings = async () => {
    try {
      const lang = await initLanguage();
      setLanguageState(lang);
    } catch (error) {
      console.error('[LanguageContext] Error loading language settings:', error);
      setLanguageState('en');
    } finally {
      setLoading(false);
    }
  };

  // Listen to AppState changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Reload settings when app comes to foreground
        const currentLang = getLanguage();
        setLanguageState(currentLang);
      }
    });

    return () => subscription?.remove();
  }, []);

  // Change language
  const setLanguage = useCallback(async (langCode) => {
    console.log('[LanguageContext] Changing language to:', langCode);
    const success = await setI18nLanguage(langCode);
    if (success) {
      setLanguageState(langCode);
      console.log('[LanguageContext] Language changed successfully to:', langCode);
      // Force re-render by updating state
      return true;
    }
    console.log('[LanguageContext] Failed to change language');
    return false;
  }, []);

  // Translation function - recreate when language changes to force re-renders
  const t = useCallback((key, params) => {
    const translation = translate(key, params);
    return translation;
  }, [language]); // CRITICAL: Re-create when language changes

  // Format date
  const formatDate = useCallback((date, format) => {
    return formatI18nDate(date, format);
  }, [language]);

  // Format relative time
  const formatRelativeTime = useCallback((date) => {
    return formatI18nRelativeTime(date);
  }, [language]);

  // Get available languages
  const availableLanguages = getAvailableLanguages();

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatDate,
        formatRelativeTime,
        availableLanguages,
        loading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
