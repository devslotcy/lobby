/**
 * Premium Badge Component
 * Shows a premium indicator on user profiles/cards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const PremiumBadge = ({ size = 'medium', style }) => {
  const sizes = {
    small: {
      container: { paddingHorizontal: 6, paddingVertical: 3 },
      icon: 12,
      text: 10,
    },
    medium: {
      container: { paddingHorizontal: 8, paddingVertical: 4 },
      icon: 14,
      text: 11,
    },
    large: {
      container: { paddingHorizontal: 10, paddingVertical: 5 },
      icon: 16,
      text: 12,
    },
  };

  const currentSize = sizes[size];

  return (
    <LinearGradient
      colors={['#FFD700', '#FFA500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        currentSize.container,
        style,
      ]}
    >
      <Ionicons name="star" size={currentSize.icon} color="#FFF" />
      <Text style={[styles.text, { fontSize: currentSize.text }]}>PREMIUM</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    gap: 3,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default PremiumBadge;
