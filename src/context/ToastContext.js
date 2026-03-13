import React, { createContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ToastContext = createContext({});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastIdCounter = useRef(0);

  const showToast = useCallback((message, duration = 3000, icon = null) => {
    const id = toastIdCounter.current++;
    const toast = {
      id,
      message,
      duration,
      icon,
      translateY: new Animated.Value(-100),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.85),
    };

    setToasts((prev) => [...prev, toast]);

    // Animate in with spring effect
    Animated.parallel([
      Animated.spring(toast.translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(toast.opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(toast.scale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    setTimeout(() => {
      hideToast(id);
    }, duration);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (!toast) return prev;

      // Animate out with bounce effect
      Animated.parallel([
        Animated.spring(toast.translateY, {
          toValue: -100,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(toast.opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(toast.scale, {
          toValue: 0.85,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Remove from array after animation
        setToasts((current) => current.filter((t) => t.id !== id));
      });

      return prev;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { top: insets.top + 24 }]} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              opacity: toast.opacity,
              transform: [
                {
                  translateY: Animated.add(
                    toast.translateY,
                    new Animated.Value(index * 64)
                  ),
                },
                { scale: toast.scale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.toastContent}
            onPress={() => onDismiss(toast.id)}
            activeOpacity={0.9}
          >
            {toast.icon && (
              <View style={styles.iconCircle}>
                <Text style={styles.toastIcon}>{toast.icon}</Text>
              </View>
            )}
            <Text style={styles.toastText} numberOfLines={2}>
              {toast.message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    position: 'absolute',
    borderRadius: 36,
  },
  toastContent: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 36,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 1,
  },
});
