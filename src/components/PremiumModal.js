/**
 * Premium Upgrade Modal
 * Shows premium features and subscription plans
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
  Vibration,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../context/SubscriptionContext';

const { width, height } = Dimensions.get('window');
const SLIDER_WIDTH = width - 48; // 24px padding on each side

const PremiumModal = ({ visible, onClose, highlightFeature = null }) => {
  const navigation = useNavigation();
  const { products, loading, purchaseSubscription } = useSubscription();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const autoPlayInterval = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Keyed by productId — populated dynamically when products load
  const cardScalesMap = useRef({}).current;

  const premiumFeatures = [
    {
      icon: 'shuffle',
      iconColor: '#FF6B9D',
      title: 'Unlimited shakes',
      description: 'Shake as much as you want without daily limits.',
    },
    {
      icon: 'heart-circle',
      iconColor: '#C45AEC',
      title: 'Unlimited swipes',
      description: 'Swipe freely all day with no restrictions.',
    },
    {
      icon: 'heart-half',
      iconColor: '#10B981',
      title: 'See who liked you',
      description: 'View people who liked you before matching.',
    },
    {
      icon: 'eye',
      iconColor: '#3B82F6',
      title: 'See who visit your profile',
      description: 'View people who visit your profile before matching.',
    },
    {
      icon: 'rocket',
      iconColor: '#F59E0B',
      title: 'Priority matching',
      description: 'Get matched faster with higher visibility.',
    },
  ];

  const dotAnimations = useRef(
    premiumFeatures.map(() => new Animated.Value(0))
  ).current;

  // Set default selected product (yearly/longest for best value)
  useEffect(() => {
    if (products.length > 0) {
      // Ensure each product has a scale Animated.Value
      products.forEach(p => {
        if (!cardScalesMap[p.productId]) {
          cardScalesMap[p.productId] = new Animated.Value(1);
        }
      });

      if (!selectedProduct) {
        const yearlyProduct = products.find(p => p.productId.includes('yearly'));
        const defaultProduct = yearlyProduct || products[products.length - 1];
        setSelectedProduct(defaultProduct);
        Animated.spring(cardScalesMap[defaultProduct.productId], {
          toValue: 1.06,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }).start();
        console.log('[PremiumModal] Products loaded:', products);
        console.log('[PremiumModal] Selected product:', defaultProduct);
      }
    }
  }, [products]);

  // Haptic feedback and pulse animation when modal opens
  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Vibration.vibrate(50);

      // Initialize first dot as active
      dotAnimations[0].setValue(1);

      // Start pulsing animation for the button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      console.log('[PremiumModal] Modal opened');
      console.log('[PremiumModal] Products:', products);
      console.log('[PremiumModal] Loading:', loading);
      console.log('[PremiumModal] Selected:', selectedProduct);
    }
  }, [visible]);

  // Auto-play slider
  useEffect(() => {
    if (visible) {
      // Start auto-play
      autoPlayInterval.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const nextSlide = (prev + 1) % premiumFeatures.length;

          // Animate dots
          dotAnimations.forEach((anim, i) => {
            Animated.timing(anim, {
              toValue: i === nextSlide ? 1 : 0,
              duration: 300,
              useNativeDriver: false,
            }).start();
          });

          // Scroll to next slide
          if (sliderRef.current) {
            sliderRef.current.scrollToIndex({
              index: nextSlide,
              animated: true,
            });
          }

          return nextSlide;
        });
      }, 1500); // 1.5 seconds
    }

    // Cleanup on unmount or modal close
    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [visible, premiumFeatures.length, dotAnimations]);

  const selectPlan = (product) => {
    setSelectedProduct(product);
    // Animate selected card up, reset others
    products.forEach(p => {
      const anim = cardScalesMap[p.productId];
      if (anim) {
        Animated.spring(anim, {
          toValue: p.productId === product.productId ? 1.06 : 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }).start();
      }
    });
  };

  const handlePurchase = async () => {
    if (!selectedProduct || purchasing) return;

    try {
      setPurchasing(true);

      const success = await purchaseSubscription(selectedProduct.productId);

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const formatProductTitle = (productId) => {
    if (productId.includes('monthly')) return 'Monthly';
    if (productId.includes('yearly')) return 'Yearly';
    return 'Premium';
  };

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SLIDER_WIDTH);
    const clampedIndex = Math.max(0, Math.min(index, premiumFeatures.length - 1));

    if (clampedIndex !== currentSlide) {
      // Animate dots
      dotAnimations.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === clampedIndex ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
      setCurrentSlide(clampedIndex);
    }
  };

  const renderFeatureSlide = ({ item, index }) => (
    <View style={styles.slideContainer}>
      <View style={styles.iconCircle}>
        <View style={styles.iconInnerGlow}>
          <Ionicons name={item.icon} size={52} color={item.iconColor} />
        </View>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  // Parse numeric amount from a price string like "THB 1,275.00" or "$9.99"
  // Uses priceAmount (from priceAmountMicros) if available - more reliable than parsing strings
  const parseNumericPrice = (product) => {
    if (!product) return 0;
    // priceAmount is set from priceAmountMicros / 1_000_000 in IAPService - most reliable
    const fromMicros = parseFloat(product.priceAmount);
    if (fromMicros && !isNaN(fromMicros)) return fromMicros;
    // Fallback: parse the display string but handle thousand separators correctly
    if (!product.price) return 0;
    // Remove currency symbols and spaces, keep digits and last decimal separator
    const cleaned = product.price.replace(/[^\d.,]/g, '');
    // If comma is thousand sep (e.g. "1,275.00"), just remove it
    const normalized = cleaned.includes('.') ? cleaned.replace(/,/g, '') : cleaned.replace(/,/g, '.');
    return parseFloat(normalized) || 0;
  };

  // Extract currency symbol/code from price string (e.g. "THB 1,275.00" → "THB")
  const extractCurrency = (priceStr) => {
    if (!priceStr) return '';
    const prefix = priceStr.replace(/[\d.,\s]+$/, '').trim();
    if (prefix) return prefix;
    const suffix = priceStr.replace(/^[\d.,\s]+/, '').trim();
    return suffix;
  };

  // Derive number of months from subscriptionPeriod (IAP: P1M/P6M/P1Y) or billingCycle (backend: monthly/half_yearly/yearly)
  const getMonthsFromProduct = (product) => {
    const period = product.subscriptionPeriod || '';
    if (period === 'P1Y' || period === 'yearly' || period === 'annual') return 12;
    if (period === 'P6M' || period === 'half_yearly') return 6;
    if (period === 'P1M' || period === 'monthly') return 1;
    // Fallback: infer from productId
    if (product.productId?.includes('yearly')) return 12;
    if (product.productId?.includes('6_monthly')) return 6;
    return 1;
  };

  // Base (cheapest per-month) product — used for savings comparison
  const getBaseProduct = () =>
    products.reduce((best, p) => {
      if (!best) return p;
      const bMonths = getMonthsFromProduct(best);
      const pMonths = getMonthsFromProduct(p);
      const bestPerMonth = parseNumericPrice(best) / bMonths;
      const pPerMonth = parseNumericPrice(p) / pMonths;
      // base = highest per-month price (monthly plan)
      return pPerMonth > bestPerMonth ? p : best;
    }, null);

  // Calculate savings % vs base (monthly) price
  const getSavingsPercent = (product) => {
    const base = getBaseProduct();
    if (!base || !product || base.productId === product.productId) return 0;
    const basePerMonth = parseNumericPrice(base) / getMonthsFromProduct(base);
    const months = getMonthsFromProduct(product);
    const planPerMonth = parseNumericPrice(product) / months;
    if (!basePerMonth || !planPerMonth) return 0;
    return Math.round(((basePerMonth - planPerMonth) / basePerMonth) * 100);
  };

  // Best-value product = highest savings %
  const getBestValueProductId = () => {
    let best = null;
    let bestSavings = 0;
    products.forEach(p => {
      const s = getSavingsPercent(p);
      if (s > bestSavings) { bestSavings = s; best = p.productId; }
    });
    return best;
  };

  // Calculate per-month price for a plan (months auto-derived from product)
  const getPerMonthPrice = (product) => {
    if (!product) return '';
    const price = parseNumericPrice(product);
    if (!price) return '';
    const months = getMonthsFromProduct(product);
    const perMonth = price / months;
    const currency = extractCurrency(product.price);
    const amount = perMonth.toFixed(2);
    if (!currency) return amount;
    // Symbol currencies ($, €, £, ¥) go before with no space; code currencies (THB, USD) go before with space
    const isSymbol = /^[\$€£¥₺₩₹]/.test(currency);
    return isSymbol ? `${currency}${amount}` : `${currency} ${amount}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#667EEA', '#C471F5', '#ff589b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
        {/* Focus Grid Overlay */}
        <View style={styles.gridOverlay}>
          {Array.from({ length: 80 }).map((_, i) => (
            <View key={i} style={styles.gridDot}>
              <View style={styles.dotInner} />
            </View>
          ))}
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#2C2C2C" />
        </TouchableOpacity>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Features Slider */}
          <View style={styles.sliderSection}>
            <FlatList
              ref={sliderRef}
              data={premiumFeatures}
              renderItem={renderFeatureSlide}
              keyExtractor={(item, index) => index.toString()}
              horizontal={true}
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={SLIDER_WIDTH}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.sliderContent}
              getItemLayout={(data, index) => ({
                length: SLIDER_WIDTH,
                offset: SLIDER_WIDTH * index,
                index,
              })}
            />

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {premiumFeatures.map((_, index) => {
                const dotWidth = dotAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 26],
                });
                const dotOpacity = dotAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                });
                const dotColor = dotAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(255, 255, 255, 1)', 'rgba(255, 107, 157, 1)'],
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        width: dotWidth,
                        opacity: dotOpacity,
                        backgroundColor: dotColor,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Subscription Plans */}
          <View style={styles.plansContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#FF6B9D" style={styles.loader} />
            ) : products.length === 0 ? (
              <View style={styles.emptyPlans}>
                <Ionicons name="alert-circle-outline" size={48} color="#999" />
                <Text style={styles.emptyPlansText}>No plans available</Text>
              </View>
            ) : (
              <View style={styles.plansRow}>
                {[...products]
                  .sort((a, b) => getMonthsFromProduct(a) - getMonthsFromProduct(b))
                  .map((product) => {
                    const isSelected = selectedProduct?.productId === product.productId;
                    const months = getMonthsFromProduct(product);
                    const savingsPct = getSavingsPercent(product);
                    const perMonth = getPerMonthPrice(product);
                    const isBestValue = product.productId === getBestValueProductId();
                    const durationLabel = months === 1 ? 'Month' : 'Months';
                    const scaleAnim = cardScalesMap[product.productId] || new Animated.Value(1);

                    // Gradient colors: gold for best-value, subtle tint for others
                    const selectedColors = isBestValue
                      ? ['#2E2A18', '#1E1A10', '#2A2416']
                      : ['#2F2A3A', '#1E1A28'];
                    const cardSelectedStyle = isBestValue
                      ? styles.planCardSelectedGold
                      : styles.planCardSelected;

                    return (
                      <Animated.View
                        key={product.productId}
                        style={[styles.planCardWrapper, { transform: [{ scale: scaleAnim }] }]}
                      >
                        {/* Badge above card */}
                        {isBestValue ? (
                          <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>✦ BEST VALUE</Text>
                          </View>
                        ) : savingsPct > 0 ? (
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>SAVE {savingsPct}%</Text>
                          </View>
                        ) : null}

                        <Pressable onPress={() => selectPlan(product)}>
                          <LinearGradient
                            colors={isSelected ? selectedColors : ['#2A2A2A', '#1E1E1E']}
                            style={[styles.planCard, isSelected && cardSelectedStyle]}
                          >
                            <Text style={[
                              styles.planDuration,
                              isSelected && (isBestValue ? styles.planDurationGold : styles.planDurationSelected),
                            ]}>
                              {months}
                            </Text>
                            <Text style={[
                              styles.planDurationLabel,
                              isSelected && (isBestValue ? styles.planDurationLabelGold : styles.planDurationLabelSelected),
                            ]}>
                              {durationLabel}
                            </Text>
                            <View style={[styles.planPricePill, isSelected && isBestValue && styles.planPricePillGold]}>
                              <Text style={[styles.planPrice, isSelected && isBestValue && styles.planPriceGold]}>
                                {product.price || '...'}
                              </Text>
                            </View>
                            {perMonth ? (
                              <Text style={[styles.planPerMonth, isSelected && isBestValue && styles.planPerMonthGold]}>
                                {perMonth}/Mo
                              </Text>
                            ) : null}
                          </LinearGradient>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
              </View>
            )}
          </View>

        </View>

        {/* CTA Button */}
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={!selectedProduct || purchasing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  (!selectedProduct || purchasing)
                    ? ['#D1D5DB', '#D1D5DB']
                    : ['#FFF3C4', '#FFE066', '#F4C430', '#E5B800', '#F4C430', '#FFE066']
                }
                locations={[0, 0.2, 0.4, 0.5, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.ctaButton}
              >
                <View style={styles.buttonInner}>
                  {purchasing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.ctaButtonText}>UPGRADE TO PREMIUM</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* NO THANKS Button */}
          <TouchableOpacity onPress={onClose} style={styles.noThanksButton}>
            <Text style={styles.noThanksText}>NO THANKS</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Disclaimer - Outside of footer but inside LinearGradient */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>No Commitment. Cancel anytime</Text>
          <View style={styles.disclaimerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.disclaimerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimerSeparator}> | </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.disclaimerLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  container: {
    flex: 1,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.08,
    pointerEvents: 'none',
  },
  gridDot: {
    width: width / 10,
    height: height / 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  sliderSection: {
    marginBottom: 8,
    marginTop: 52,
  },
  sliderContent: {
    paddingHorizontal: 24,
  },
  slideContainer: {
    width: SLIDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconInnerGlow: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 11,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  plansContainer: {
    marginBottom: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    overflow: 'visible',
  },
  loader: {
    marginVertical: 30,
  },
  emptyPlans: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPlansText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  planCardWrapper: {
    flex: 1,
    paddingTop: 18, // space for absolute badges
  },
  planCard: {
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardSelected: {
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  planCardSelectedGold: {
    borderColor: '#C8A84B',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 2,
    alignSelf: 'center',
    backgroundColor: '#C8A84B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestValueText: {
    color: '#FFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  saveBadge: {
    position: 'absolute',
    top: 2,
    alignSelf: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  saveBadgeText: {
    color: '#FFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  planDuration: {
    fontSize: 38,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    lineHeight: 42,
    letterSpacing: -1,
  },
  planDurationSelected: {
    color: '#FFFFFF',
  },
  planDurationGold: {
    color: '#FFE066',
  },
  planDurationLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  planDurationLabelSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  planDurationLabelGold: {
    color: '#C8A84B',
  },
  planPricePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  planPricePillGold: {
    backgroundColor: 'rgba(200,168,75,0.2)',
  },
  planPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  planPriceGold: {
    color: '#FFE066',
  },
  planPerMonth: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
    textAlign: 'center',
  },
  planPerMonthGold: {
    color: 'rgba(200,168,75,0.8)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  ctaButton: {
    borderRadius: 50,
    shadowColor: '#FFD93D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#FFED4E',
  },
  buttonInner: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  noThanksButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  noThanksText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    letterSpacing: 0.5,
  },
  disclaimer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.9,
  },
  disclaimerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclaimerLink: {
    fontSize: 12,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontWeight: '500',
    opacity: 0.85,
  },
  disclaimerSeparator: {
    fontSize: 12,
    color: '#FFFFFF',
    marginHorizontal: 6,
    opacity: 0.85,
  },
});

export default PremiumModal;
