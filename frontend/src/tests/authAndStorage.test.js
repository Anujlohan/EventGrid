global.__DEV__ = true;

// Mock Platform and Native SecureStore
let mockPlatformOS = 'web';

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
    select: (obj) => (obj ? (obj.web ?? obj.default ?? obj.ios ?? obj.android) : undefined),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as SecureStore from 'expo-secure-store';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { api } from '../services/api';

describe('Authentication & Secure Token Storage Test Suite', () => {
  let mockLocalStorage = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatformOS = 'web';
    mockLocalStorage = {};

    global.window = {
      localStorage: {
        getItem: jest.fn((k) => mockLocalStorage[k] ?? null),
        setItem: jest.fn((k, v) => {
          mockLocalStorage[k] = String(v);
        }),
        removeItem: jest.fn((k) => {
          delete mockLocalStorage[k];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
    };
  });

  afterEach(() => {
    delete global.window;
  });

  // ==========================================
  // 1. AUTH SERVICE: SIGNUP & LOGIN
  // ==========================================
  describe('authService: Signup & Login Flow', () => {
    test('1. Successful signup stores token, user session, and configures API client', async () => {
      const mockUser = {
        _id: 'user_101',
        name: 'Alex Johnson',
        email: 'alex@example.com',
        role: 'Participant',
      };
      const mockToken = 'mock-jwt-token-alex';

      const postSpy = jest.spyOn(api, 'post').mockResolvedValueOnce({
        token: mockToken,
        user: mockUser,
      });
      const setAuthSpy = jest.spyOn(api, 'setAuthToken');

      const result = await authService.signup({
        name: 'Alex Johnson',
        email: 'alex@example.com',
        phoneNumber: '+15551234',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(postSpy).toHaveBeenCalledWith('/auth/signup', {
        name: 'Alex Johnson',
        email: 'alex@example.com',
        phoneNumber: '+15551234',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(setAuthSpy).toHaveBeenCalledWith(mockToken);
      expect(result.token).toBe(mockToken);
      expect(result.user).toEqual(mockUser);

      // Verify persisted in storage
      const storedToken = await authService.getStoredToken();
      expect(storedToken).toBe(mockToken);
    });

    test('2. Successful login stores session and handles credentials', async () => {
      const mockUser = {
        _id: 'user_202',
        name: 'Sam Organizer',
        email: 'sam@example.com',
        role: 'Organizer',
      };
      const mockToken = 'mock-jwt-token-sam';

      jest.spyOn(api, 'post').mockResolvedValueOnce({
        token: mockToken,
        user: mockUser,
      });

      const result = await authService.login({
        email: 'sam@example.com',
        password: 'SecretPassword123',
      });

      expect(result.token).toBe(mockToken);
      expect(result.user.role).toBe('Organizer');

      // Verify token retrieved from storage
      const storedToken = await authService.getStoredToken();
      expect(storedToken).toBe(mockToken);
    });

    test('3. Failed login propagates API error without corrupting storage', async () => {
      jest.spyOn(api, 'post').mockRejectedValueOnce({
        status: 401,
        message: 'Invalid email or password.',
      });

      await expect(
        authService.login({ email: 'bad@example.com', password: 'wrong' })
      ).rejects.toEqual(
        expect.objectContaining({
          status: 401,
          message: 'Invalid email or password.',
        })
      );

      const storedToken = await authService.getStoredToken();
      expect(storedToken).toBeNull();
    });
  });

  // ==========================================
  // 2. SESSION BOOTSTRAP, PROFILE & LOGOUT
  // ==========================================
  describe('Session Bootstrap, Profile, and Logout', () => {
    test('4. loadStoredSession restores valid token and user session on app launch', async () => {
      const mockUser = { _id: 'user_launch', name: 'Launch User' };
      mockLocalStorage['auth_token'] = 'restored-token-launch';
      mockLocalStorage['auth_user'] = JSON.stringify(mockUser);

      const session = await authService.loadStoredSession();

      expect(session.token).toBe('restored-token-launch');
      expect(session.user).toEqual(mockUser);
    });

    test('5. loadStoredSession gracefully handles corrupted user JSON in storage', async () => {
      mockLocalStorage['auth_token'] = 'valid-token';
      mockLocalStorage['auth_user'] = '{ corrupted json ... ';

      const session = await authService.loadStoredSession();

      expect(session.token).toBe('valid-token');
      expect(session.user).toBeNull(); // Graceful fallback
    });

    test('6. logout clears storage and resets API client token', async () => {
      mockLocalStorage['auth_token'] = 'token-to-delete';
      mockLocalStorage['auth_user'] = JSON.stringify({ name: 'User' });

      const setAuthSpy = jest.spyOn(api, 'setAuthToken');

      await authService.logout();

      expect(setAuthSpy).toHaveBeenCalledWith(null);
      expect(mockLocalStorage['auth_token']).toBeUndefined();
      expect(mockLocalStorage['auth_user']).toBeUndefined();
    });

    test('7. updateProfile updates user session in storage', async () => {
      const updatedUser = { _id: 'u1', name: 'Updated Name', college: 'Tech University' };
      jest.spyOn(api, 'put').mockResolvedValueOnce({ user: updatedUser });

      const result = await authService.updateProfile({ name: 'Updated Name', college: 'Tech University' });

      expect(result.name).toBe('Updated Name');
      expect(mockLocalStorage['auth_user']).toBe(JSON.stringify(updatedUser));
    });
  });

  // ==========================================
  // 3. SECURE TOKEN STORAGE (NATIVE & WEB)
  // ==========================================
  describe('storageService: Native & Web Storage Adapters', () => {
    test('8. Web storage adapter correctly sets, gets, and removes values', async () => {
      await storageService.setItem('test_key', 'test_value');
      const val = await storageService.getItem('test_key');
      expect(val).toBe('test_value');

      await storageService.removeItem('test_key');
      const removed = await storageService.getItem('test_key');
      expect(removed).toBeNull();
    });

    test('9. Native storage adapter uses SecureStore when running on native platforms', async () => {
      mockPlatformOS = 'ios';

      SecureStore.getItemAsync.mockResolvedValueOnce('secure_native_token');

      const token = await storageService.getItem('auth_token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('secure_native_token');

      await storageService.setItem('auth_token', 'new_native_token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        'new_native_token'
      );

      await storageService.removeItem('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });

    test('10. clearAuth wipes all authentication-related keys across platforms', async () => {
      await storageService.clearAuth();

      // On web: localStorage.removeItem called for auth keys
      expect(global.window.localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(global.window.localStorage.removeItem).toHaveBeenCalledWith('auth_user');
    });

    test('11. Gracefully falls back when window storage throws exceptions', async () => {
      global.window.localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError or private browsing mode');
      });

      // Does not throw unhandled exception
      await expect(
        storageService.setItem('fallback_key', 'fallback_val')
      ).resolves.not.toThrow();

      const val = await storageService.getItem('fallback_key');
      expect(val).toBe('fallback_val');
    });
  });
});
