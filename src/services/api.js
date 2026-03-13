import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// Token memory cache — her request'te disk okuma yapılmasın
let _cachedToken = null;

export const setTokenCache = (token) => { _cachedToken = token; };
export const clearTokenCache = () => { _cachedToken = null; };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for all requests
});

api.interceptors.request.use(async (config) => {
  // Önce memory'den bak, yoksa disk'ten oku ve cache'le
  if (!_cachedToken) {
    _cachedToken = await AsyncStorage.getItem('token');
  }
  if (_cachedToken) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
  }
  return config;
});

// Refresh token işlemi sırasında birden fazla istek aynı anda yenilenmesini önle
let _isRefreshing = false;
let _refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
  _refreshQueue.forEach((cb) => cb(error, token));
  _refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 ve daha önce retry yapılmamışsa refresh token dene
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (_isRefreshing) {
        // Başka bir refresh devam ediyorsa kuyruğa ekle
        return new Promise((resolve, reject) => {
          _refreshQueue.push((err, token) => {
            if (err) return reject(err);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { token: newToken } = response.data;
        await AsyncStorage.setItem('token', newToken);
        setTokenCache(newToken);

        processRefreshQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh de başarısız — kullanıcıyı çıkart
        processRefreshQueue(refreshError, null);
        await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
        clearTokenCache();
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    // User-friendly error messages
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (error.message === 'Network Error') {
        error.message = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin veya backend sunucusunun çalıştığından emin olun.';
      } else {
        error.message = 'Bağlantı hatası. Lütfen tekrar deneyin.';
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  loginWithGoogle: (idToken, additionalData = {}) => api.post('/auth/google', { idToken, ...additionalData }),
  loginWithApple: (identityToken, additionalData = {}) => api.post('/auth/apple', { identityToken, ...additionalData }),
  signup: (data) => api.post('/auth/signup', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for signup (includes photo upload)
  }),
  logout: () => api.post('/auth/logout'),
  checkUsername: (username) => api.get(`/auth/check-username/${username}`),
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  getUserProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (data) => api.patch('/users/me', data),
  toggleProfileVisibility: (profile_active) => api.patch('/users/me/profile-visibility', { profile_active }),
  deleteAccount: () => api.delete('/users/me'),
  updateLocation: (latitude, longitude, city) =>
    api.post('/users/me/location', { latitude, longitude, city }),
  uploadPhoto: (photoUri) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    return api.post('/users/me/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for photo upload
    });
  },
  deletePhoto: (index) => api.delete(`/users/me/photos/${index}`),
  notifyProfileView: (viewedUserId) => api.post('/users/profile-view', { viewed_user_id: viewedUserId }),
  blockUser: (userId, reason) => api.post(`/users/${userId}/block`, { reason }),
  unblockUser: (userId) => api.delete(`/users/${userId}/block`),
  getBlockStatus: (userId) => api.get(`/users/${userId}/block-status`),
  getBlockedUsers: () => api.get('/users/blocked'),
  hideUser: (userId) => api.post(`/users/${userId}/hide`),
  unhideUser: (userId) => api.delete(`/users/${userId}/hide`),
  getHiddenUsers: () => api.get('/users/hidden'),
  reportUser: (userId, reason, description) => api.post(`/users/${userId}/report`, { reason, description }),
  submitVerification: (formData) => api.post('/users/me/verification', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for photo upload
  }),
};

export const discoveryAPI = {
  getQueue: (filters = {}) => {
    const params = new URLSearchParams();

    // Add all filter parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/discovery/queue?${params.toString()}`);
  },
};

export const nearbyAPI = {
  getNearbyUsers: (filters = {}) => {
    const params = new URLSearchParams();

    // Add all filter parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/nearby?${params.toString()}`);
  },
};

export const swipeAPI = {
  swipe: (swiped_user_id, direction) =>
    api.post('/swipes', { swiped_user_id, direction }),
  getMatches: () => api.get('/swipes/matches'),
  getOrCreateMatch: (other_user_id) =>
    api.post('/swipes/get-or-create-match', { other_user_id }),
  unmatch: (match_id) => api.delete(`/swipes/matches/${match_id}`),
};

export const messageAPI = {
  send: (match_id, content) => api.post('/messages', { match_id, content }),
  getMessages: (match_id, limit = 50, offset = 0) =>
    api.get(`/messages/${match_id}?limit=${limit}&offset=${offset}`),
  markAsRead: (match_id) => api.post(`/messages/${match_id}/read`),
};

export const interactionsAPI = {
  getMatches: () => api.get('/interactions/matches'),
  getVisitedMe: () => api.get('/interactions/visited-me'),
  getLikedMe: () => api.get('/interactions/liked-me'),
  getMyFavorites: () => api.get('/interactions/my-favorites'),
  getFavoriteMe: () => api.get('/interactions/favorite-me'),
  getMyVisits: () => api.get('/interactions/my-visits'),
  getMyLikes: () => api.get('/interactions/my-likes'),
  toggleFavorite: (userId) => api.post(`/interactions/favorite/${userId}`),
  getUnreadCount: () => api.get('/interactions/unread-count'),
  getBadgeCounts: () => api.get('/interactions/badge-counts'),
  markRead: () => api.post('/interactions/mark-read'),
};

export const notificationAPI = {
  registerPushToken: (pushToken, platform, language) => api.post('/users/push-token', {
    push_token: pushToken,
    platform,
    language,
  }),
  unregisterPushToken: (pushToken) => api.delete('/users/push-token', {
    data: { push_token: pushToken },
  }),
};

export default api;
