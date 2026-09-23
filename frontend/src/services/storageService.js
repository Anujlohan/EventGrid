import { Platform } from 'react-native';

const memoryStorage = {};

export const storageService = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        memoryStorage[key] = value;
      }
    } catch (e) {
      memoryStorage[key] = value;
    }
  },

  async getItem(key) {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStorage[key] || null;
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },

  async removeItem(key) {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete memoryStorage[key];
    } catch (e) {
      delete memoryStorage[key];
    }
  },
};
