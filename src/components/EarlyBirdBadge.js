/**
 * Early Bird Badge Component
 * Shows special badge for first 500 premium users
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EarlyBirdBadge = ({ number, size = 'medium' }) => {
  const isSmall = size === 'small';
  const isMedium = size === 'medium';

  return (
    <LinearGradient
      colors={['#FFD700', '#FFA500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        isMedium && styles.badgeMedium,
      ]}
    >
      <Text style={[styles.trophy, isSmall && styles.trophySmall]}>🏆</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.earlyBirdText, isSmall && styles.earlyBirdTextSmall]}>
          Early Bird
        </Text>
        {number && (
          <Text style={[styles.numberText, isSmall && styles.numberTextSmall]}>
            #{number}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trophy: {
    fontSize: 16,
    marginRight: 6,
  },
  trophySmall: {
    fontSize: 12,
    marginRight: 4,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earlyBirdText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  earlyBirdTextSmall: {
    fontSize: 10,
  },
  numberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.9,
  },
  numberTextSmall: {
    fontSize: 9,
  },
});

export default EarlyBirdBadge;
