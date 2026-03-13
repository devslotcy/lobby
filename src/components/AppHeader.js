import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';
import SideBar from './SideBar';
import { useTheme } from '../context/ThemeContext';

const AppHeader = ({ title, rightButtons, navigation, onPremiumPress, profile: profileProp, getProfilePhotoUrl: getProfilePhotoUrlProp }) => {
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Load profile only if not provided as prop
  useEffect(() => {
    if (!profileProp && sidebarVisible) {
      loadProfile();
    }
  }, [sidebarVisible, profileProp]);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setLocalProfile(data.user);
    } catch (error) {
      console.error('Failed to load profile for header:', error);
    }
  };

  const getLocalProfilePhotoUrl = () => {
    const profile = localProfile;
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

  // Use prop if provided, otherwise use local state
  const profile = profileProp || localProfile;
  const getProfilePhotoUrl = getProfilePhotoUrlProp || getLocalProfilePhotoUrl;

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>

        {rightButtons ? rightButtons : <View style={styles.placeholder} />}
      </View>

      <SideBar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        profile={profile}
        getProfilePhotoUrl={getProfilePhotoUrl}
        navigation={navigation}
        onPremiumPress={onPremiumPress}
      />
    </>
  );
};

const createStyles = (colors) => StyleSheet.create({
  header: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginRight: 12,
  },
  hamburgerLine: {
    width: 22,
    height: 2.5,
    backgroundColor: colors.textPrimary,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    flex: 1,
  },
  placeholder: {
    width: 0,
  },
});

export default AppHeader;
