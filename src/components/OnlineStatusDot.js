import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * OnlineStatusDot - Reusable online status indicator component
 * @param {string} status - 'online', 'recent', or 'offline'
 * @param {number} size - Size of the dot (default: 8)
 * @param {boolean} withBorder - Show white border around dot (default: false)
 * @param {object} style - Additional custom styles
 */
export default function OnlineStatusDot({
  status = 'offline',
  size = 8,
  withBorder = false,
  style
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#00D856'; // Bright green
      case 'recent':
        return '#F59E0B'; // Orange
      case 'offline':
        return '#EF4444'; // Red
      default:
        return '#EF4444';
    }
  };

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: getStatusColor(),
  };

  if (withBorder) {
    const containerSize = size + 4;
    return (
      <View
        style={[
          styles.borderContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
          style,
        ]}
      >
        <View style={dotStyle} />
      </View>
    );
  }

  return <View style={[dotStyle, style]} />;
}

const styles = StyleSheet.create({
  borderContainer: {
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
