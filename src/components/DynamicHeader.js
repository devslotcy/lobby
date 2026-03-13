import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InteractionBadge from './InteractionBadge';
import SideBar from './SideBar';
import { userAPI } from '../services/api';
import { MEDIA_BASE_URL } from '../config/api';

/**
 * Dynamic Header Component
 * @param {string} title - Header title
 * @param {array} rightIcons - Array of icon objects: [{ name: 'icon-name', onPress: () => {}, badge: 0, color: '#color', iconSet: 'Ionicons'|'MaterialCommunityIcons' }]
 * @param {object} leftIcon - Left icon object: { name: 'icon-name', onPress: () => {} }
 * @param {boolean} showHamburger - Show hamburger menu (opens sidebar)
 * @param {ReactNode} rightContent - Custom right content (replaces rightIcons)
 * @param {object} navigation - Navigation object (required if showHamburger is true)
 * @param {function} onPremiumPress - Premium button press handler (for sidebar)
 */
export default function DynamicHeader({
  title = 'Discover',
  rightIcons = [],
  leftIcon = null,
  showTitle = true,
  showHamburger = false,
  rightContent = null,
  navigation = null,
  onPremiumPress = null,
}) {
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profile, setProfile] = useState(null);

  // Load profile when sidebar opens
  useEffect(() => {
    if (sidebarVisible && showHamburger && !profile) {
      loadProfile();
    }
  }, [sidebarVisible, showHamburger]);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setProfile(data.user);
    } catch (error) {
      console.error('Failed to load profile for header:', error);
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
        return MEDIA_BASE_URL + urls[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const renderIcon = (icon, index) => {
    const IconComponent = icon.iconSet === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
    const isActive = icon.isActive || false;
    const shouldShowBadge = icon.badge !== undefined && icon.badge > 0;

    // Debug log for heart icon (dev only)
    if (__DEV__ && icon.name === 'heart' && icon.badge !== undefined) {
      console.log(`💝 [DynamicHeader] Heart: ${icon.badge}`);
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={icon.onPress}
        activeOpacity={0.7}
        style={[
          styles.iconButton,
          isActive && styles.iconButtonActive,
        ]}
      >
        <View style={{ position: 'relative' }}>
          <IconComponent
            name={icon.name}
            size={icon.size || 26}
            color={icon.color || colors.textSecondary}
          />
          {shouldShowBadge && (
            <InteractionBadge count={icon.badge} animated={icon.animated !== false} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        {/* Hamburger Menu or Left Icon */}
        {showHamburger ? (
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
            <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
            <View style={[styles.hamburgerLine, { backgroundColor: colors.textPrimary }]} />
          </TouchableOpacity>
        ) : leftIcon ? (
          <TouchableOpacity
            onPress={leftIcon.onPress}
            style={styles.leftIcon}
            activeOpacity={0.7}
          >
            <Ionicons
              name={leftIcon.name}
              size={leftIcon.size || 26}
              color={leftIcon.color || colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        {/* Title */}
        {showTitle && (
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
        )}

        {/* Right Content (Custom) or Right Icons */}
        {rightContent ? (
          rightContent
        ) : (
          <View style={styles.headerIcons}>
            {rightIcons.map((icon, index) => renderIcon(icon, index))}
          </View>
        )}
      </View>

      {/* Sidebar (only if showHamburger is true) */}
      {showHamburger && (
        <SideBar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          profile={profile}
          getProfilePhotoUrl={getProfilePhotoUrl}
          navigation={navigation}
          onPremiumPress={onPremiumPress}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    height: 62,
    borderBottomWidth: 0,
  },
  hamburgerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  hamburgerLine: {
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  leftIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  iconButton: {
    padding: 4,
    borderRadius: 8,
  },
  iconButtonActive: {
    backgroundColor: '#6b7380',
    padding: 4,
    borderRadius: 6,
  },
});
