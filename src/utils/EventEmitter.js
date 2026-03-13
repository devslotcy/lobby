// Simple EventEmitter for React Native
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
  }

  emit(event, ...args) {
    if (!this.events[event]) return;

    this.events[event].forEach(listener => {
      listener(...args);
    });
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

const eventEmitter = new EventEmitter();

export const EVENTS = {
  FILTERS_CHANGED: 'filters_changed',
  LIKE_RECEIVED: 'like_received',
};

export default eventEmitter;
