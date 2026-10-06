import { api } from './api';
import { storageService } from './storageService';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authService = {
  /**
   * Register a new user account
   */
  signup: async ({ name, email, phoneNumber, password, confirmPassword, role }) => {
    const data = await api.post('/auth/signup', {
      name,
      email,
      phoneNumber,
      password,
      confirmPassword,
      ...(role ? { role } : {}),
    });

    if (data && data.token) {
      await authService.setSession(data.token, data.user);
    }
    return data;
  },

  /**
   * Log in with email and password
   */
  login: async ({ email, password }) => {
    const data = await api.post('/auth/login', { email, password });
    if (data && data.token) {
      await authService.setSession(data.token, data.user);
    }
    return data;
  },

  /**
   * Get fresh profile data for authenticated user
   */
  getMe: async () => {
    const data = await api.get('/auth/me');
    if (data && data.user) {
      await storageService.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  },

  /**
   * Update profile fields (name, phoneNumber, college, organization, experienceLevel)
   */
  updateProfile: async (profileData) => {
    const data = await api.put('/auth/profile', profileData);
    if (data && data.user) {
      await storageService.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  },

  /**
   * Save session token and user into storage and api client
   */
  setSession: async (token, user) => {
    api.setAuthToken(token);
    await storageService.setItem(TOKEN_KEY, token);
    await storageService.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Clear session on logout
   */
  logout: async () => {
    api.setAuthToken(null);
    await storageService.removeItem(TOKEN_KEY);
    await storageService.removeItem(USER_KEY);
  },

  /**
   * Load saved session from storage on app launch
   */
  loadStoredSession: async () => {
    const token = await storageService.getItem(TOKEN_KEY);
    const userStr = await storageService.getItem(USER_KEY);

    if (token) {
      api.setAuthToken(token);
      let user = null;
      try {
        user = userStr ? JSON.parse(userStr) : null;
      } catch {
        user = null;
      }
      return { token, user };
    }
    return { token: null, user: null };
  },

  getStoredToken: async () => {
    return await storageService.getItem(TOKEN_KEY);
  },
};
