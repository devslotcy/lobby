/**
 * Subscription Context
 * Manages subscription state, premium features, and shake limits
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import iapService from '../services/IAPService';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Shake limits (for free users)
  const [remainingShakes, setRemainingShakes] = useState(10);
  const [maxShakes, setMaxShakes] = useState(10);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Premium features
  const [features, setFeatures] = useState({
    unlimitedShakes: false,
    seeWhoShookBack: false,
    priorityMatching: false,
    advancedFilters: false,
    readReceipts: false,
    noAds: false,
  });

  /**
   * Initialize IAP service
   */
  useEffect(() => {
    let isActive = true;

    const initIAP = async () => {
      try {
        const initialized = await iapService.initialize();
        if (initialized && isActive) {
          console.log('[SubscriptionContext] IAP initialized');
        }
      } catch (error) {
        console.error('[SubscriptionContext] Error initializing IAP:', error);
      }
    };

    initIAP();

    return () => {
      isActive = false;
      // Don't disconnect IAP here, keep connection alive for app lifetime
    };
  }, []);

  /**
   * Load subscription status from backend
   */
  const loadSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch subscription status
      const status = await iapService.checkSubscriptionStatus();

      setSubscription(status);
      setIsPremium(status.isPremium || false);

      // Update shake limits
      if (status.isPremium) {
        setRemainingShakes(-1);
        setMaxShakes(-1);
        setIsUnlimited(true);
      } else {
        setRemainingShakes(status.remainingShakesToday || 10);
        setMaxShakes(status.maxShakes || 10);
        setIsUnlimited(false);
      }

      // Fetch premium features
      const featuresData = await iapService.getPremiumFeatures();
      setFeatures(featuresData.features || {});

      console.log('[SubscriptionContext] Subscription status loaded:', status);
    } catch (error) {
      console.error('[SubscriptionContext] Error loading subscription:', error);
      // Set default values on error
      setIsPremium(false);
      setRemainingShakes(10);
      setMaxShakes(10);
      setIsUnlimited(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Load products from store
   */
  const loadProducts = useCallback(async () => {
    try {
      const availableProducts = await iapService.getAvailableProducts();
      setProducts(availableProducts);
      console.log('[SubscriptionContext] Products loaded:', availableProducts);
    } catch (error) {
      console.error('[SubscriptionContext] Error loading products:', error);
    }
  }, []);

  /**
   * Purchase subscription
   */
  const purchaseSubscription = async (productId) => {
    try {
      const success = await iapService.purchaseSubscription(productId);

      if (success) {
        // Reload subscription status after purchase
        await loadSubscriptionStatus();
      }

      return success;
    } catch (error) {
      console.error('[SubscriptionContext] Error purchasing subscription:', error);
      throw error;
    }
  };

  /**
   * Restore purchases
   */
  const restorePurchases = async () => {
    try {
      const success = await iapService.restorePurchases();

      if (success) {
        await loadSubscriptionStatus();
      }

      return success;
    } catch (error) {
      console.error('[SubscriptionContext] Error restoring purchases:', error);
      throw error;
    }
  };

  /**
   * Redeem promo code
   */
  const redeemPromoCode = async (code) => {
    try {
      const result = await iapService.redeemPromoCode(code);

      if (result.success) {
        await loadSubscriptionStatus();
      }

      return result;
    } catch (error) {
      console.error('[SubscriptionContext] Error redeeming promo code:', error);
      throw error;
    }
  };

  /**
   * Refresh shake limit
   */
  const refreshShakeLimit = useCallback(async () => {
    try {
      const limitData = await iapService.getShakeLimit();

      if (limitData.isUnlimited) {
        setRemainingShakes(-1);
        setMaxShakes(-1);
        setIsUnlimited(true);
      } else {
        setRemainingShakes(limitData.remainingShakes);
        setMaxShakes(limitData.maxShakes || 10);
        setIsUnlimited(false);
      }

      console.log('[SubscriptionContext] Shake limit refreshed:', limitData);
    } catch (error) {
      console.error('[SubscriptionContext] Error refreshing shake limit:', error);
    }
  }, []);

  /**
   * Decrement shake count (optimistic update)
   */
  const decrementShakeCount = useCallback(() => {
    if (!isUnlimited && remainingShakes > 0) {
      setRemainingShakes(prev => Math.max(0, prev - 1));
    }
  }, [isUnlimited, remainingShakes]);

  /**
   * Check if user can shake
   */
  const canShake = useCallback(() => {
    if (isUnlimited || isPremium) {
      return true;
    }

    return remainingShakes > 0;
  }, [isUnlimited, isPremium, remainingShakes]);

  /**
   * Cancel subscription (redirect to store)
   */
  const cancelSubscription = () => {
    iapService.cancelSubscription();
  };

  /**
   * Load subscription status on mount and when user changes
   */
  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
      loadProducts();
    }
  }, [user, loadSubscriptionStatus, loadProducts]);

  /**
   * Refresh subscription when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user) {
        loadSubscriptionStatus();
        refreshShakeLimit();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [user, loadSubscriptionStatus, refreshShakeLimit]);

  const value = {
    // Subscription state
    subscription,
    isPremium,
    loading,
    products,

    // Shake limits
    remainingShakes,
    maxShakes,
    isUnlimited,
    canShake,
    decrementShakeCount,
    refreshShakeLimit,

    // Premium features
    features,

    // Actions
    purchaseSubscription,
    restorePurchases,
    redeemPromoCode,
    cancelSubscription,
    loadSubscriptionStatus,
    loadProducts,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
