import React, { createContext, useState, useContext, useEffect } from 'react';
import { interactionsAPI } from '../services/api';
import SocketService from '../services/SocketService';
import { AuthContext } from './AuthContext';

const InteractionContext = createContext();

export const InteractionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [interactionCount, setInteractionCount] = useState(0);

  const loadInteractionCount = async () => {
    // Only load if user is logged in
    if (!user) {
      if (__DEV__) console.log('⚠️ [InteractionContext] No user logged in, skipping count load');
      return;
    }

    try {
      if (__DEV__) console.log('📊 [InteractionContext] Loading interaction count...');
      const { data } = await interactionsAPI.getUnreadCount();
      if (__DEV__) console.log(`✅ [InteractionContext] Count loaded: ${data.count} (hasMore: ${data.hasMore})`);
      setInteractionCount(data.count);
    } catch (error) {
      // Silently handle 401 errors (user not authenticated)
      if (error.response?.status === 401) {
        if (__DEV__) console.log('⚠️ [InteractionContext] 401 Unauthorized');
        setInteractionCount(0);
      } else {
        console.error('❌ [InteractionContext] Failed to load count:', error.message);
      }
    }
  };

  const markAsRead = async () => {
    if (interactionCount > 0) {
      try {
        await interactionsAPI.markRead();
        setInteractionCount(0);
      } catch (error) {
        console.error('Failed to mark interactions as read:', error);
      }
    }
  };

  useEffect(() => {
    // Only set up listeners if user is logged in
    if (!user) {
      setInteractionCount(0);
      return;
    }

    // Load initial count when user logs in or changes
    loadInteractionCount();

    // Listen for new interactions via socket
    // LikedMe - someone liked you
    SocketService.on('like_received', () => {
      if (__DEV__) console.log('📬 [InteractionContext] Like received - reloading');
      loadInteractionCount();
    }, 'interaction-context');

    // FavoriteMe - someone favorited you
    SocketService.on('favorite_received', () => {
      if (__DEV__) console.log('⭐ [InteractionContext] Favorite received - reloading');
      loadInteractionCount();
    }, 'interaction-context');

    // VisitedMe - someone viewed your profile
    SocketService.on('profile_viewed', () => {
      if (__DEV__) console.log('👀 [InteractionContext] Profile viewed - reloading');
      loadInteractionCount();
    }, 'interaction-context');

    // Matches - new match created
    SocketService.on('new_match', () => {
      if (__DEV__) console.log('💕 [InteractionContext] New match - reloading');
      loadInteractionCount();
    }, 'interaction-context');

    return () => {
      if (__DEV__) console.log('🧹 [InteractionContext] Cleaning up listeners');
      SocketService.off('like_received', 'interaction-context');
      SocketService.off('favorite_received', 'interaction-context');
      SocketService.off('profile_viewed', 'interaction-context');
      SocketService.off('new_match', 'interaction-context');
    };
  }, [user]); // Re-run when user changes (login/logout)

  return (
    <InteractionContext.Provider value={{ interactionCount, loadInteractionCount, markAsRead }}>
      {children}
    </InteractionContext.Provider>
  );
};

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within InteractionProvider');
  }
  return context;
};
