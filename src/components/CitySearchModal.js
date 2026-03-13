import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_PLACES_API_KEY } from '../config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

export default function CitySearchModal({ visible, onClose, onSelectCity, currentCity }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Reset state when closing
      setSearchQuery('');
      setPredictions([]);
    }
  }, [visible]);

  // Debounced search function
  const handleSearchChange = (text) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 2) {
      setPredictions([]);
      return;
    }

    // Set new timeout for API call
    searchTimeout.current = setTimeout(() => {
      searchPlaces(text);
    }, 500); // 500ms debounce
  };

  const searchPlaces = async (query) => {
    if (!query || query.length < 2) return;

    setLoading(true);
    try {
      // Google Places Autocomplete API
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&types=(cities)&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        setPredictions(data.predictions || []);
      } else {
        console.error('Google Places API error:', data.status);
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (prediction) => {
    try {
      setLoading(true);

      // Get place details to fetch coordinates
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const { geometry, name, formatted_address } = data.result;
        const { lat, lng } = geometry.location;

        // Return city info to parent
        onSelectCity({
          name: name || prediction.structured_formatting.main_text,
          fullAddress: formatted_address || prediction.description,
          latitude: lat,
          longitude: lng,
          placeId: prediction.place_id,
        });

        onClose();
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => handleSelectCity(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.cityIcon} />
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{item.structured_formatting.main_text}</Text>
        <Text style={styles.citySecondary}>{item.structured_formatting.secondary_text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Search City</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter city or place name..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Current City */}
          {currentCity && searchQuery.length === 0 && (
            <View style={styles.currentCityContainer}>
              <Text style={styles.currentCityLabel}>Current Selection:</Text>
              <View style={styles.currentCityBadge}>
                <Ionicons name="location" size={16} color="#3B82F6" />
                <Text style={styles.currentCityText}>{currentCity}</Text>
              </View>
            </View>
          )}

          {/* Results */}
          <View style={styles.resultsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : predictions.length > 0 ? (
              <FlatList
                data={predictions}
                renderItem={renderCityItem}
                keyExtractor={(item) => item.place_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No cities found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="earth-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Search for a city</Text>
                <Text style={styles.emptySubtext}>Type at least 2 characters to search</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  currentCityContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currentCityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  currentCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  currentCityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityIcon: {
    marginRight: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  citySecondary: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
});
