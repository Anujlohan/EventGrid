import { CONFIG } from '../constants/config';
import { storageService } from './storageService';

export class ApiClient {
  constructor(baseUrl = CONFIG.API_BASE_URL, timeout = CONFIG.DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.authToken = null;
    this.authListeners = new Set();
    this.isHandling401 = false;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthToken() {
    return this.authToken;
  }

  /**
   * Subscribe to global unauthorized / session-expired events.
   *
   * @param {Function} listener - Callback invoked on authenticated 401
   * @returns {Function} Unsubscribe function
   */
  onUnauthorized(listener) {
    if (typeof listener === 'function') {
      this.authListeners.add(listener);
      return () => {
        this.authListeners.delete(listener);
      };
    }
    return () => {};
  }

  /**
   * Dispatches the session expired event to all subscribers and the window object (web)
   */
  notifyUnauthorized(data = {}) {
    this.authListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('[ApiClient] Error in unauthorized listener:', err);
      }
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        const event = new CustomEvent('auth:session_expired', { detail: data });
        window.dispatchEvent(event);
      } catch {}
    }
  }

  /**
   * Determines if a 401 response represents an expired authenticated session
   * vs a public/unauthenticated request or credential check.
   */
  isAuthExpired401(endpoint, status) {
    if (status !== 401) {
      return false;
    }

    const cleanEndpoint = String(endpoint).toLowerCase();

    // Public login or signup attempts returning 401 (e.g. wrong credentials)
    // are standard validation errors, not expired sessions.
    if (cleanEndpoint.includes('/auth/login') || cleanEndpoint.includes('/auth/signup')) {
      return false;
    }

    // Only requests that were dispatched with an active auth token qualify
    return !!this.authToken;
  }

  /**
   * Handles 401 Unauthorized responses globally:
   * - Deduplicates concurrent 401s to prevent multiple logout events
   * - Clears stored tokens and user data via storageService.clearAuth()
   * - Dispatches centralized notification
   */
  async handleUnauthorized(endpoint, errorData) {
    if (this.isHandling401) {
      return; // Already processing or deduplicated
    }

    this.isHandling401 = true;
    const previousToken = this.authToken;
    this.authToken = null;

    try {
      if (storageService && typeof storageService.clearAuth === 'function') {
        await storageService.clearAuth();
      }
    } catch (storageErr) {
      console.warn('[ApiClient] Failed to clear auth storage on 401:', storageErr);
    }

    try {
      this.notifyUnauthorized({
        endpoint,
        message: errorData?.message || 'Your session has expired. Please sign in again.',
        token: previousToken,
      });
    } finally {
      // Reset concurrency lock after microtask queue finishes
      setTimeout(() => {
        this.isHandling401 = false;
      }, 50);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers ? response.headers.get('content-type') : null;
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (typeof response.text === 'function') {
        const text = await response.text();
        data = text ? { message: text } : {};
      } else {
        data = {};
      }

      if (!response.ok) {
        // Check for authenticated 401 session expiration
        if (this.isAuthExpired401(endpoint, response.status)) {
          await this.handleUnauthorized(endpoint, data);
        }

        const errorMessage =
          (data && data.message) || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = data && data.details;
        throw error;
      }

      return data.data !== undefined ? data.data : data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Network request timed out. Please check your connection.');
        timeoutError.status = 408;
        throw timeoutError;
      }
      if (
        (err instanceof TypeError || err.name === 'TypeError') &&
        err.message.toLowerCase().includes('fetch')
      ) {
        const netErr = new Error('Unable to connect to server. Please check your internet connection.');
        netErr.status = 0;
        throw netErr;
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient();
