import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const tabs = [
  { name: 'Shake', icon: 'vibrate', library: 'MaterialCommunityIcons', labelKey: 'tabs.shake' },
  { name: 'NearMe', icon: 'compass', library: 'Ionicons', labelKey: 'tabs.nearby' },
  { name: 'Discover', icon: 'heart', library: 'Ionicons', labelKey: 'tabs.discover' },
  { name: 'Matches', icon: 'chatbubbles', library: 'Ionicons', labelKey: 'tabs.messages' },
  { name: 'Profile', icon: 'person', library: 'Ionicons', labelKey: 'tabs.profile' },
];

export default function BottomNavBar({ navigation, activeTab }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const handleTabPress = (tabName) => {
    // Navigate to the main tab
    navigation.navigate('Main', { screen: tabName });
  };

  const renderIcon = (tab, isActive) => {
    const color = isActive ? colors.iconActive : colors.iconDefault;
    const size = 24;

    if (tab.library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={tab.icon} size={size} color={color} />;
    }
    return <Ionicons name={tab.icon} size={size} color={color} />;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            {renderIcon(tab, isActive)}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.iconDefault,
    marginTop: 4,
  },
  labelActive: {
    color: colors.iconActive,
  },
});
