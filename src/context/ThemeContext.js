import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../constants/colors';

export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAutoTheme, setIsAutoTheme] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load theme settings from AsyncStorage on mount
  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const [savedDarkMode, savedAutoTheme] = await Promise.all([
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('autoTheme'),
      ]);

      const darkMode = savedDarkMode === 'true';
      const autoTheme = savedAutoTheme === 'true';

      setIsAutoTheme(autoTheme);

      if (autoTheme) {
        // Use system preference if auto theme is enabled
        const colorScheme = Appearance.getColorScheme();
        setIsDarkMode(colorScheme === 'dark');
      } else {
        // Use manual setting
        setIsDarkMode(darkMode);
      }
    } catch (error) {
      console.error('[ThemeContext] Error loading theme settings:', error);
      // Default to light mode on error
      setIsDarkMode(false);
      setIsAutoTheme(false);
    } finally {
      setLoading(false);
    }
  };

  // Listen to system theme changes (only when auto theme is enabled)
  useEffect(() => {
    if (!isAutoTheme) return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('[ThemeContext] System theme changed to:', colorScheme);
      setIsDarkMode(colorScheme === 'dark');
    });

    return () => subscription.remove();
  }, [isAutoTheme]);

  // Listen to AppState changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Reload settings when app comes to foreground
        loadThemeSettings();
      }
    });

    return () => subscription?.remove();
  }, []);

  // Toggle dark mode manually
  const toggleDarkMode = useCallback(async (value) => {
    console.log('[ThemeContext] Toggling dark mode to:', value);
    setIsDarkMode(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  }, []);

  // Toggle auto theme
  const toggleAutoTheme = useCallback(async (value) => {
    console.log('[ThemeContext] Toggling auto theme to:', value);
    setIsAutoTheme(value);
    await AsyncStorage.setItem('autoTheme', value.toString());

    if (value) {
      // When enabling auto theme, immediately apply system preference
      const colorScheme = Appearance.getColorScheme();
      setIsDarkMode(colorScheme === 'dark');
    }
  }, []);

  // Get current colors based on theme
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        isDarkMode,
        isAutoTheme,
        loading,
        toggleDarkMode,
        toggleAutoTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
