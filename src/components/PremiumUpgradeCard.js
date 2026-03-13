/**
 * Premium Upgrade Card Component
 * Shows on ProfileScreen to prompt free users to upgrade
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const PremiumUpgradeCard = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Ionicons name="star" size={32} color="#FFD700" />
          <Text style={styles.title}>Upgrade to Premium</Text>
        </View>

        <Text style={styles.subtitle}>
          Unlock all features and match faster
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Ionicons name="flash" size={18} color="#FFF" />
            <Text style={styles.featureText}>Unlimited shakes</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="eye" size={18} color="#FFF" />
            <Text style={styles.featureText}>See who shook you</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="rocket" size={18} color="#FFF" />
            <Text style={styles.featureText}>Priority matching (2x faster)</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="options" size={18} color="#FFF" />
            <Text style={styles.featureText}>Advanced filters</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="arrow-undo" size={18} color="#FFF" />
            <Text style={styles.featureText}>Undo last shake</Text>
          </View>
        </View>

        <View style={styles.pricingContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Monthly:</Text>
            <Text style={styles.priceValue}>$7.99/mo</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Yearly:</Text>
            <Text style={styles.priceValue}>$39.99/yr</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 58%</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Get Premium</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 16,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  pricingContainer: {
    marginBottom: 16,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});

export default PremiumUpgradeCard;
