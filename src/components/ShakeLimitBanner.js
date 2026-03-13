/**
 * Shake Limit Banner
 * Shows remaining shakes for free users
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const ShakeLimitBanner = ({ remainingShakes, maxShakes = 10, onUpgradePress, isPremium = false }) => {
  // Don't show banner if unlimited or premium
  if (remainingShakes === -1 || isPremium) {
    return null;
  }

  const percentage = (remainingShakes / maxShakes) * 100;
  const isLow = remainingShakes <= 3;
  const isZero = remainingShakes === 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isZero ? ['#FF6B6B', '#FF8E53'] : ['#FFB347', '#FFCC33']}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isZero ? 'lock-closed' : 'flash'}
              size={24}
              color="#FFF"
            />
          </View>

          <View style={styles.textContainer}>
            {isZero ? (
              <>
                <Text style={styles.title}>Daily Limit Reached! ⏰</Text>
                <Text style={styles.subtitle}>
                  Come back tomorrow or upgrade to Premium
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  {remainingShakes}/{maxShakes} Shakes Left Today
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${percentage}%` },
                        isLow && styles.progressBarLow,
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(percentage)}%
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={onUpgradePress}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.upgradeButtonText}>
            {isZero ? 'Get Unlimited' : 'Premium'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
    lineHeight: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  progressBarLow: {
    backgroundColor: '#FF6B6B',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    minWidth: 35,
    textAlign: 'right',
  },
  upgradeButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});

export default ShakeLimitBanner;
