import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import SocketService from '../services/SocketService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notification, setNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const currentChatMatchIdRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      setupSocketListeners();
    } else {
      cleanupSocketListeners();
    }

    return () => {
      cleanupSocketListeners();
    };
  }, [user?.id]);

  const setupSocketListeners = () => {
    console.log('🔌 [NotificationContext] Setting up socket listeners');

    // Listen for online/offline events
    SocketService.on('user_online', ({ userId }) => {
      console.log('🟢 [NotificationContext] User online:', userId);
      setOnlineUsers((prev) => new Set([...prev, userId]));
    }, 'notification');

    SocketService.on('user_offline', ({ userId }) => {
      console.log('🔴 [NotificationContext] User offline:', userId);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }, 'notification');

    // Listen for new messages
    SocketService.on('new_message', (message) => {
      console.log('📬 [NotificationContext] New message notification:', message);

      // Don't show notification if user is currently in the chat with this match
      if (currentChatMatchIdRef.current === message.match_id) {
        console.log('⏭️ [NotificationContext] User is in this chat, skipping notification');
        return;
      }

      // Show in-app notification
      setNotification({
        type: 'message',
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        content: message.content,
        match_id: message.match_id,
        photo_urls: message.photo_urls,
      });
      setShowNotification(true);
    }, 'notification');

    // Listen for like notifications
    SocketService.on('like_received', (data) => {
      console.log('💖 [NotificationContext] Like received notification:', JSON.stringify(data, null, 2));

      // Show in-app notification
      const likeNotification = {
        type: 'like',
        user_id: data.user_id,
        name: data.name,
        photo_urls: data.photo_urls,
      };
      console.log('📱 [NotificationContext] Setting like notification:', likeNotification);
      setNotification(likeNotification);
      setShowNotification(true);
      console.log('✅ [NotificationContext] Like notification state updated');
    }, 'notification');
  };

  const cleanupSocketListeners = () => {
    console.log('🧹 [NotificationContext] Cleaning up socket listeners');
    SocketService.off('user_online', 'notification');
    SocketService.off('user_offline', 'notification');
    SocketService.off('new_message', 'notification');
    SocketService.off('like_received', 'notification');
  };

  const setCurrentChatMatchId = (matchId) => {
    currentChatMatchIdRef.current = matchId;
    console.log('📍 Current chat match ID set to:', matchId);
  };

  const hideNotification = () => {
    setShowNotification(false);
  };

  const showCustomNotification = (notificationData) => {
    setNotification(notificationData);
    setShowNotification(true);
  };

  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification,
        hideNotification,
        showCustomNotification,
        setCurrentChatMatchId,
        onlineUsers,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
