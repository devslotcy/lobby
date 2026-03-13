import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    // Map<event, Map<namespace, callback>> - namespace ile birden fazla listener
    this.listeners = new Map();
    this.isConnecting = false;
  }

  async connect() {
    // Bağlantı zaten varsa veya bağlanıyor ise, tekrar bağlanma
    if (this.socket?.connected) {
      console.log('✅ Socket already connected:', this.socket.id);
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ Socket connection already in progress...');
      return;
    }

    this.isConnecting = true;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No token found, skipping socket connection');
        this.isConnecting = false;
        return;
      }

      const socketUrl = SOCKET_URL;

      console.log('🔌 [SocketService] Connecting to:', socketUrl);

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 10, // Max 10 deneme (~90 saniye), sonra dur
      });

      this.socket.on('connect', () => {
        console.log('✅ [SocketService] Connected:', this.socket.id);
        this.isConnecting = false;
        // Re-attach tüm listener'ları
        this.reattachListeners();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ [SocketService] Disconnected:', reason);
        this.isConnecting = false;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 [SocketService] Reconnected after', attemptNumber, 'attempts');
        this.isConnecting = false;
        // Re-attach tüm listener'ları
        this.reattachListeners();
      });

      this.socket.on('error', (error) => {
        console.error('❌ [SocketService] Error:', error);
        this.isConnecting = false;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ [SocketService] Reconnect failed after max attempts, giving up');
        this.isConnecting = false;
        // Temizle — kullanıcı manuel reconnect isterse connect() tekrar çağrılabilir
        this.socket = null;
      });
    } catch (error) {
      console.error('❌ [SocketService] Connection failed:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Re-attach all registered listeners after reconnection
   */
  reattachListeners() {
    if (!this.socket) return;

    console.log('🔄 [SocketService] Re-attaching', this.listeners.size, 'event listeners');

    this.listeners.forEach((namespaceMap, event) => {
      // Her event için, önce tüm listener'ları temizle
      this.socket.off(event);

      // Sonra namespace'lere göre tekrar ekle
      namespaceMap.forEach((callback, namespace) => {
        this.socket.on(event, callback);
      });
    });
  }

  /**
   * Register event listener with namespace support
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   * @param {string} namespace - Optional namespace (default: 'default')
   */
  on(event, callback, namespace = 'default') {
    if (!this.socket && !this.isConnecting) {
      console.warn('⚠️ [SocketService] Socket not connected, listener will be registered when connected');
    }

    // Event için namespace map yoksa oluştur
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }

    const namespaceMap = this.listeners.get(event);

    // Duplicate listener kontrolü
    if (namespaceMap.has(namespace)) {
      console.warn(`⚠️ [SocketService] Listener already exists for event "${event}" in namespace "${namespace}", replacing...`);
      // Eski listener'ı kaldır
      if (this.socket) {
        this.socket.off(event, namespaceMap.get(namespace));
      }
    }

    // Yeni listener'ı kaydet
    namespaceMap.set(namespace, callback);

    // Socket hazırsa listener'ı ekle
    if (this.socket) {
      this.socket.on(event, callback);
      console.log(`✅ [SocketService] Listener registered: "${event}" (namespace: "${namespace}")`);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {string} namespace - Optional namespace (default: 'default')
   */
  off(event, namespace = 'default') {
    if (!this.listeners.has(event)) return;

    const namespaceMap = this.listeners.get(event);

    if (namespaceMap.has(namespace)) {
      const callback = namespaceMap.get(namespace);

      // Socket'ten listener'ı kaldır
      if (this.socket) {
        this.socket.off(event, callback);
      }

      // Map'ten kaldır
      namespaceMap.delete(namespace);

      console.log(`🗑️ [SocketService] Listener removed: "${event}" (namespace: "${namespace}")`);

      // Namespace map boşsa event'i tamamen kaldır
      if (namespaceMap.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log(`📤 [SocketService] Emitted: "${event}"`, data ? `(${JSON.stringify(data).substring(0, 50)}...)` : '');
    } else {
      console.warn(`⚠️ [SocketService] Cannot emit "${event}": Socket not connected`);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 [SocketService] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      console.log('✅ [SocketService] Disconnected');
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance (for advanced usage)
   * @returns {Socket|null}
   */
  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
