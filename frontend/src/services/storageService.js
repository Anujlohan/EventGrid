import { Platform } from 'react-native';

let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  // Fallback for test/mock environments where expo-modules-core native bridge is unavailable
  SecureStore = null;
}

// In-memory fallback if native SecureStore or Web Storage are unavailable
const memoryFallback = {};

/**
 * Key sanitizer: SecureStore keys must contain only alphanumeric characters, '.', '-', and '_'
 */
const sanitizeKey = (key) => {
  if (typeof key !== 'string') return '';
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Checks whether native SecureStore is available on the current device
 */
let isSecureStoreAvailableCache = null;
const isSecureStoreAvailable = async () => {
  if (Platform.OS === 'web') {
    return false;
  }
  if (isSecureStoreAvailableCache !== null) {
    return isSecureStoreAvailableCache;
  }
  try {
    if (SecureStore && typeof SecureStore.isAvailableAsync === 'function') {
      isSecureStoreAvailableCache = await SecureStore.isAvailableAsync();
      return isSecureStoreAvailableCache;
    }
  } catch (err) {
    console.warn('[StorageService] Error checking SecureStore availability:', err);
  }
  isSecureStoreAvailableCache = false;
  return false;
};

/**
 * Web Persistent Storage Adapter
 * Primary: window.localStorage
 * Secondary: window.sessionStorage (e.g. private browsing or storage partitioning)
 * Fallback: in-memory dictionary
 */
const webStorageAdapter = {
  setItem(key, value) {
    const stringVal = value === null || value === undefined ? '' : String(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringVal);
        return;
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, stringVal);
          return;
        }
      } catch {
        // Fall through to memory fallback
      }
    }
    memoryFallback[key] = stringVal;
  },

  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const val = window.sessionStorage.getItem(key);
          if (val !== null) return val;
        }
      } catch {
        // Fall through to memory fallback
      }
    }
    return memoryFallback[key] !== undefined ? memoryFallback[key] : null;
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
    delete memoryFallback[key];
  },
};

export const storageService = {
  /**
   * Persistently stores a key-value pair.
   * Uses expo-secure-store on iOS/Android and localStorage/sessionStorage on Web.
   *
   * @param {string} key
   * @param {string|any} value
   */
  async setItem(key, value) {
    if (!key) return;
    const cleanKey = sanitizeKey(key);
    const stringValue = value === null || value === undefined ? '' : String(value);

    if (Platform.OS === 'web') {
      webStorageAdapter.setItem(cleanKey, stringValue);
      return;
    }

    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.setItemAsync(cleanKey, stringValue);
        return;
      }
    } catch (err) {
      console.warn(`[StorageService] SecureStore.setItemAsync failed for key "${cleanKey}":`, err?.message);
    }

    // Fallback for native devices without SecureStore support
    memoryFallback[cleanKey] = stringValue;
  },

  /**
   * Retrieves a persistently stored value by key.
   *
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    if (!key) return null;
    const cleanKey = sanitizeKey(key);

    if (Platform.OS === 'web') {
      return webStorageAdapter.getItem(cleanKey);
    }

    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        const val = await SecureStore.getItemAsync(cleanKey);
        return val !== undefined ? val : null;
      }
    } catch (err) {
      console.warn(`[StorageService] SecureStore.getItemAsync failed for key "${cleanKey}":`, err?.message);
    }

    return memoryFallback[cleanKey] !== undefined ? memoryFallback[cleanKey] : null;
  },

  /**
   * Removes a persistently stored key-value pair.
   *
   * @param {string} key
   */
  async removeItem(key) {
    if (!key) return;
    const cleanKey = sanitizeKey(key);

    if (Platform.OS === 'web') {
      webStorageAdapter.removeItem(cleanKey);
      return;
    }

    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.deleteItemAsync(cleanKey);
      }
    } catch (err) {
      console.warn(`[StorageService] SecureStore.deleteItemAsync failed for key "${cleanKey}":`, err?.message);
    }

    delete memoryFallback[cleanKey];
  },

  // ==========================================
  // Dedicated Auth Token & User Helpers
  // ==========================================

  async setToken(token) {
    return this.setItem('auth_token', token);
  },

  async getToken() {
    return this.getItem('auth_token');
  },

  async removeToken() {
    return this.removeItem('auth_token');
  },

  async setUser(user) {
    return this.setItem('auth_user', typeof user === 'string' ? user : JSON.stringify(user));
  },

  async getUser() {
    const raw = await this.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async removeUser() {
    return this.removeItem('auth_user');
  },

  async clearAuth() {
    await Promise.all([this.removeToken(), this.removeUser()]);
  },

  // ==========================================
  // Bookmarks / Saved Events Persistence
  // ==========================================

  async getBookmarks() {
    const raw = await this.getItem('eventgrid_bookmarks');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async isBookmarked(competitionId) {
    if (!competitionId) return false;
    const bookmarks = await this.getBookmarks();
    return bookmarks.includes(String(competitionId));
  },

  async toggleBookmark(competitionId) {
    if (!competitionId) return false;
    const compIdStr = String(competitionId);
    const bookmarks = await this.getBookmarks();
    let updated;
    let isNowSaved;
    if (bookmarks.includes(compIdStr)) {
      updated = bookmarks.filter((id) => id !== compIdStr);
      isNowSaved = false;
    } else {
      updated = [...bookmarks, compIdStr];
      isNowSaved = true;
    }
    await this.setItem('eventgrid_bookmarks', JSON.stringify(updated));
    return isNowSaved;
  },
};
