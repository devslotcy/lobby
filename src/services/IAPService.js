/**
 * In-App Purchase Service
 * Handles both iOS (App Store) and Android (Google Play) purchases
 * Using react-native-iap library
 */

import { Platform, Alert, NativeModules } from 'react-native';
import api from './api';

// Product IDs for your app (Google Play & App Store)
const PRODUCT_IDS = {
  ios: ['premium_monthly', 'premium_6_monthly', 'premium_yearly'],
  android: ['premium_monthly', 'premium_6_monthly', 'premium_yearly'],
};

class IAPService {
  constructor() {
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
    this.isInitialized = false;
    this.iap = null;
    this.cachedProducts = []; // Cache fetched products for offerToken access
  }

  /**
   * Initialize IAP connection
   * Call this when app starts
   */
  async initialize() {
    try {
      console.log('[IAP] Initializing connection...');

      if (this.isExpoGo()) {
        console.warn('[IAP] Expo Go detected. Skipping IAP initialization.');
        this.isInitialized = false;
        return false;
      }

      if (!this.iap) {
        this.iap = this.loadIapModule();
      }

      if (!this.iap) {
        console.warn('[IAP] react-native-iap is unavailable (NitroModules not loaded).');
        this.isInitialized = false;
        return false;
      }

      console.log('[IAP] Calling initConnection...');
      const connected = await this.iap.initConnection();
      console.log('[IAP] Connection result:', connected, typeof connected);

      this.isInitialized = true;

      // On Android, flush pending purchases from cache
      if (Platform.OS === 'android') {
        try {
          // This method was removed in newer versions of react-native-iap
          if (typeof this.iap.flushFailedPurchasesCachedAsPendingAndroid === 'function') {
            await this.iap.flushFailedPurchasesCachedAsPendingAndroid();
            console.log('[IAP] Flushed failed purchases on Android');
          }
        } catch (err) {
          console.log('[IAP] Flush pending purchases not available in this version');
        }
      }

      // Set up purchase listeners
      this.setupPurchaseListeners();

      console.log('[IAP] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[IAP] Error initializing:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Set up purchase event listeners
   */
  setupPurchaseListeners() {
    if (!this.ensureReady()) return;

    // Purchase update listener
    this.purchaseUpdateSubscription = this.iap.purchaseUpdatedListener(async (purchase) => {
      console.log('[IAP] Purchase updated:', purchase);

      const receipt = purchase.transactionReceipt;
      const productId = purchase.productId;

      try {
        // Verify receipt with your backend
        const verified = await this.verifyPurchaseWithBackend(purchase);

        if (verified) {
          // iOS: Finish transaction
          if (Platform.OS === 'ios') {
            await this.iap.finishTransaction({ purchase, isConsumable: false });
          }

          // Android: Acknowledge purchase
          if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
            await this.iap.acknowledgePurchaseAndroid(purchase.purchaseToken);
          }

          console.log('[IAP] Purchase verified and finalized');

          // Notify user
          Alert.alert(
            'Purchase Successful!',
            'Your Premium subscription is now active. Enjoy unlimited features!',
            [{ text: 'OK' }]
          );
        } else {
          console.error('[IAP] Purchase verification failed');
          Alert.alert('Purchase Error', 'Failed to verify your purchase. Please contact support.');
        }
      } catch (error) {
        console.error('[IAP] Error processing purchase:', error);
      }
    });

    // Purchase error listener
    this.purchaseErrorSubscription = this.iap.purchaseErrorListener((error) => {
      console.error('[IAP] Purchase error:', error);

      // Handle specific errors
      if (error.code === 'E_USER_CANCELLED') {
        console.log('[IAP] User cancelled purchase');
        return;
      }

      if (error.code === 'E_ITEM_UNAVAILABLE') {
        Alert.alert('Product Unavailable', 'This subscription is currently unavailable. Please try again later.');
        return;
      }

      if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
        return;
      }

      // Generic error
      Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase. Please try again.');
    });

    console.log('[IAP] Purchase listeners set up');
  }

  /**
   * Get available subscription products from store
   * @returns {Promise<Array>} List of products with pricing
   */
  async getAvailableProducts() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.ensureReady()) {
        console.warn('[IAP] IAP module not ready, falling back to backend products');
        return this.getProductsFromBackend();
      }

      const productIds = Platform.OS === 'ios' ? PRODUCT_IDS.ios : PRODUCT_IDS.android;

      console.log('[IAP] Fetching products with SKUs:', JSON.stringify(productIds));

      const products = await this.iap.fetchProducts({
        skus: productIds,
        type: 'subs',
      });

      console.log('[IAP] Products fetched count:', products?.length);
      console.log('[IAP] Products fetched raw:', JSON.stringify(products, null, 2));

      if (!products || products.length === 0) {
        console.warn('[IAP] No products returned from store, falling back to backend');
        return this.getProductsFromBackend();
      }

      // Cache raw products for offerToken access during purchase
      this.cachedProducts = products;

      // Format products for display (v14 uses different field names)
      // On Android, pricing is nested in subscriptionOfferDetailsAndroid
      return products.map((product) => {
        let price = product.localizedPrice;
        let priceAmount = product.price;
        let currency = product.currency;

        // Android v14: extract price from subscription offer details
        if (Platform.OS === 'android' && !price && product.subscriptionOfferDetailsAndroid?.length > 0) {
          const offer = product.subscriptionOfferDetailsAndroid[0];
          const phase = offer.pricingPhases?.pricingPhaseList?.[0];
          if (phase) {
            price = phase.formattedPrice;
            priceAmount = phase.priceAmountMicros ? (parseInt(phase.priceAmountMicros) / 1000000).toString() : undefined;
            currency = phase.priceCurrencyCode;
          }
        }

        console.log(`[IAP] Product ${product.id}: price=${price}, priceAmount=${priceAmount}`);

        return {
          productId: product.id,
          title: product.title,
          description: product.description,
          price: price || '$0.00',
          priceAmount: priceAmount || '0',
          currency: currency || 'USD',
          subscriptionPeriod: product.subscriptionPeriodAndroid || product.subscriptionPeriodIOS,
          introductoryPrice: product.introductoryPrice,
          introductoryPriceSubscriptionPeriod: product.introductoryPriceSubscriptionPeriodIOS,
          freeTrialPeriod: product.freeTrialPeriodAndroid,
        };
      });
    } catch (error) {
      console.error('[IAP] Error fetching products:', error);
      return [];
    }
  }

  /**
   * Get products from backend API (fallback when IAP module not available)
   * Used in Expo Go or when native IAP is unavailable
   */
  async getProductsFromBackend() {
    try {
      console.log('[IAP] Fetching products from backend...');
      const response = await api.get('/subscription/products');
      const backendProducts = response.data?.products || [];
      console.log('[IAP] Backend products:', backendProducts.length);
      // Normalize to same shape as store products
      return backendProducts.map(p => ({
        productId: p.id,
        title: p.name,
        description: p.description,
        price: p.price,
        priceAmount: p.priceAmount?.toString(),
        currency: p.currency,
        subscriptionPeriod: p.billingCycle,
      }));
    } catch (error) {
      console.error('[IAP] Backend product fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Get mock products for development/testing
   * @returns {Array} Mock product list
   */
  getMockProducts() {
    return [
      {
        productId: 'premium_monthly',
        title: 'Premium Monthly',
        description: 'Unlimited shakes, see who shook you back, priority matching',
        price: '$7.99',
        priceAmount: 7.99,
        currency: 'USD',
        subscriptionPeriod: 'P1M',
      },
      {
        productId: 'premium_6_monthly',
        title: 'Premium 6 Months',
        description: 'Save 42% with 6-month plan',
        price: '$19.99',
        priceAmount: 19.99,
        currency: 'USD',
        subscriptionPeriod: 'P6M',
      },
      {
        productId: 'premium_yearly',
        title: 'Premium Yearly',
        description: 'Best value - Save 58%!',
        price: '$39.99',
        priceAmount: 39.99,
        currency: 'USD',
        subscriptionPeriod: 'P1Y',
      },
    ];
  }

  /**
   * Purchase subscription
   * @param {string} productId - Product ID to purchase
   * @returns {Promise<boolean>} Purchase success status
   */
  async purchaseSubscription(productId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.ensureReady()) {
        return false;
      }

      console.log('[IAP] Requesting subscription purchase:', productId);
      console.log('[IAP] Cached products count:', this.cachedProducts.length);
      console.log('[IAP] Cached product IDs:', this.cachedProducts.map(p => p.id));

      if (Platform.OS === 'ios') {
        await this.iap.requestPurchase({
          request: { apple: { sku: productId } },
          type: 'subs',
        });
      } else {
        // Android: Need offerToken from cached products for subscription purchase
        const product = this.cachedProducts.find((p) => p.id === productId);
        const offerToken =
          product?.subscriptionOfferDetailsAndroid?.[0]?.offerToken;

        console.log('[IAP] Android product found:', !!product);
        console.log('[IAP] Android offerToken:', offerToken);
        console.log('[IAP] Android subscriptionOfferDetails:', JSON.stringify(product?.subscriptionOfferDetailsAndroid));

        if (!offerToken) {
          console.error('[IAP] WARNING: No offerToken found! Purchase will likely fail.');
          console.error('[IAP] This means fetchProducts did not return real products or cachedProducts is empty.');
        }

        await this.iap.requestPurchase({
          request: {
            google: {
              skus: [productId],
              subscriptionOffers: offerToken
                ? [{ sku: productId, offerToken }]
                : undefined,
            },
          },
          type: 'subs',
        });
      }

      // Purchase result will be handled by purchaseUpdateListener
      return true;
    } catch (error) {
      console.error('[IAP] Error purchasing subscription:', error);

      if (error.code === 'E_USER_CANCELLED') {
        console.log('[IAP] User cancelled purchase');
        return false;
      }

      throw error;
    }
  }

  /**
   * Verify purchase with backend
   * @param {object} purchase - Purchase object from IAP
   * @returns {Promise<boolean>} Verification result
   */
  async verifyPurchaseWithBackend(purchase) {
    try {
      const { productId, transactionReceipt, purchaseToken, transactionId } = purchase;

      console.log('[IAP] Verifying purchase with backend...');

      if (Platform.OS === 'ios') {
        // iOS: Send receipt data to backend
        const response = await api.post('/subscription/verify/ios', {
          receiptData: transactionReceipt,
        });

        return response.data.success;
      } else {
        // Android: Send purchase token to backend
        const response = await api.post('/subscription/verify/android', {
          productId,
          purchaseToken,
        });

        return response.data.success;
      }
    } catch (error) {
      console.error('[IAP] Error verifying purchase:', error);
      return false;
    }
  }

  /**
   * Restore purchases (iOS & Android)
   * Fetches active purchases from the store and re-verifies them with the backend.
   * This re-links the subscription to the current user account.
   * @returns {Promise<boolean>} Restore success status
   */
  async restorePurchases() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.ensureReady()) {
        return false;
      }

      console.log('[IAP] Restoring purchases...');

      // Get all active purchases from the store (Google Play / App Store)
      const purchases = await this.iap.getAvailablePurchases();

      console.log('[IAP] Available purchases from store:', JSON.stringify(purchases, null, 2));

      if (!purchases || purchases.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases found to restore.');
        return false;
      }

      let restoredCount = 0;

      for (const purchase of purchases) {
        try {
          console.log('[IAP] Restoring purchase:', purchase.productId, 'platform:', Platform.OS);

          // Use /restore endpoint so backend re-verifies with Apple/Google and updates DB
          const restored = await this.restorePurchaseWithBackend(purchase);

          if (restored) {
            restoredCount++;

            // Finish transaction on iOS
            if (Platform.OS === 'ios') {
              await this.iap.finishTransaction({ purchase, isConsumable: false });
            }
          }
        } catch (error) {
          console.error('[IAP] Error restoring individual purchase:', error);
        }
      }

      if (restoredCount > 0) {
        Alert.alert(
          'Purchases Restored',
          'Your Premium subscription has been restored successfully!',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert('Restore Failed', 'Unable to restore your purchases. Please contact support.');
        return false;
      }
    } catch (error) {
      console.error('[IAP] Error restoring purchases:', error);
      Alert.alert('Restore Failed', 'An error occurred while restoring purchases. Please try again.');
      return false;
    }
  }

  /**
   * Restore a single purchase via backend /restore endpoint
   * Re-verifies with Apple/Google and updates the DB subscription record
   */
  async restorePurchaseWithBackend(purchase) {
    try {
      const { productId, transactionReceipt, purchaseToken } = purchase;

      console.log('[IAP] Restoring purchase with backend...');

      let response;
      if (Platform.OS === 'ios') {
        response = await api.post('/subscription/restore', {
          platform: 'ios',
          receiptData: transactionReceipt,
        });
      } else {
        response = await api.post('/subscription/restore', {
          platform: 'android',
          productId,
          purchaseToken,
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('[IAP] Error restoring purchase with backend:', error);
      return false;
    }
  }

  /**
   * Check subscription status from backend
   * @returns {Promise<object>} Subscription status
   */
  async checkSubscriptionStatus() {
    try {
      const response = await api.get('/subscription/status');
      return response.data;
    } catch (error) {
      console.error('[IAP] Error checking subscription status:', error);
      throw error;
    }
  }

  /**
   * Get remaining shake count
   * @returns {Promise<object>} Shake limit info
   */
  async getShakeLimit() {
    try {
      const response = await api.get('/subscription/shake-limit');
      return response.data;
    } catch (error) {
      console.error('[IAP] Error getting shake limit:', error);
      throw error;
    }
  }

  /**
   * Redeem promo code
   * @param {string} code - Promo code
   * @returns {Promise<object>} Redemption result
   */
  async redeemPromoCode(code) {
    try {
      const response = await api.post('/subscription/redeem', { code });
      return response.data;
    } catch (error) {
      console.error('[IAP] Error redeeming promo code:', error);
      throw error;
    }
  }

  /**
   * Get premium features status
   * @returns {Promise<object>} Features status
   */
  async getPremiumFeatures() {
    try {
      const response = await api.get('/subscription/features');
      return response.data;
    } catch (error) {
      console.error('[IAP] Error getting premium features:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription (redirects to store management)
   */
  cancelSubscription() {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Manage Subscription',
        'To cancel your subscription, go to Settings > [Your Name] > Subscriptions on your iPhone.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Manage Subscription',
        'To cancel your subscription, open the Google Play Store app, tap Menu > Subscriptions, then select your subscription.',
        [{ text: 'OK' }]
      );
    }
  }

  loadIapModule() {
    if (this.isExpoGo()) {
      console.log('[IAP] Expo Go detected, skipping module load');
      return null;
    }

    // Try to load react-native-iap directly - Nitro check is unreliable
    // in some build configurations
    try {
      // eslint-disable-next-line global-require
      const iapModule = require('react-native-iap');
      console.log('[IAP] react-native-iap loaded successfully, exports:', Object.keys(iapModule).slice(0, 10));
      return iapModule;
    } catch (error) {
      console.error('[IAP] Failed to load react-native-iap:', error.message);
      return null;
    }
  }

  ensureReady() {
    if (this.isExpoGo()) {
      return false;
    }

    if (!this.iap) {
      this.iap = this.loadIapModule();
    }

    if (!this.iap) {
      console.warn('[IAP] react-native-iap is unavailable. Skipping IAP action.');
      return false;
    }

    return true;
  }

  isExpoGo() {
    try {
      // Avoid hard dependency: expo-constants exists in Expo apps, but guard just in case
      // eslint-disable-next-line global-require
      const Constants = require('expo-constants');
      const resolved = Constants?.default ?? Constants;
      const appOwnership = resolved?.appOwnership ?? resolved?.executionEnvironment;
      return appOwnership === 'expo' || appOwnership === 'storeClient';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up listeners and connection
   */
  async disconnect() {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      if (this.iap) {
        await this.iap.endConnection();
      }
      this.isInitialized = false;

      console.log('[IAP] Disconnected');
    } catch (error) {
      console.error('[IAP] Error disconnecting:', error);
    }
  }
}

// Export singleton instance
const iapService = new IAPService();
export default iapService;
