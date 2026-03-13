/**
 * Blurred Profile Card Component
 * Shows blurred profile photos for free users in LikedMeScreen
 * Prompts upgrade to Premium to unlock
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Try to import BlurView, fallback to regular View if not available
let BlurView;
try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // Fallback: Use regular View with opacity if expo-blur is not installed
  BlurView = View;
  console.log('⚠️ expo-blur not found, using fallback');
}

const { width } = Dimensions.get('window');

const BlurredProfileCard = ({ onUpgrade, cardWidth, cardHeight, showCount = false, count = 0, message = 'shook you' }) => {
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, height: cardHeight }]}
      onPress={onUpgrade}
      activeOpacity={0.8}
    >
      {/* Placeholder image (you can use any generic silhouette) */}
      <View style={styles.placeholderContainer}>
        <Ionicons name="person" size={60} color="#E0E0E0" />
      </View>

      {/* Blur overlay */}
      <BlurView
        intensity={95}
        style={styles.blurOverlay}
        tint="light"
      >
        <View style={styles.lockContainer}>
          <View style={styles.lockIconBackground}>
            <Ionicons name="lock-closed" size={32} color="#FF6B6B" />
          </View>

          <Text style={styles.lockTitle}>Premium Feature</Text>

          {showCount && count > 0 && (
            <Text style={styles.countText}>
              {count} {count === 1 ? 'person' : 'people'} {message}
            </Text>
          )}

          <Text style={styles.lockDescription}>
            Upgrade to Premium to unlock
          </Text>

          <View style={styles.upgradeButton}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.upgradeButtonText}>Unlock Premium</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fallback for when BlurView is not available
  },
  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lockIconBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BlurredProfileCard;
