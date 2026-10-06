global.__DEV__ = true;

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock storageService
jest.mock('../services/storageService', () => ({
  storageService: {
    clearAuth: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import { ApiClient } from '../services/api';
import { storageService } from '../services/storageService';

describe('Frontend ApiClient Global 401 Interceptor Test Suite', () => {
  let apiClient;
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('https://api.example.com', 5000);
    apiClient.setAuthToken('valid-mock-jwt-token');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('1. Clears stored tokens and dispatches logout event on authenticated 401 response', async () => {
    const unauthorizedListener = jest.fn();
    const unsubscribe = apiClient.onUnauthorized(unauthorizedListener);

    // Mock 401 fetch response for authenticated endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Your session has expired. Please log in again.',
      }),
    });

    let errorThrown = null;
    try {
      await apiClient.get('/competitions/registrations/my');
    } catch (err) {
      errorThrown = err;
    }

    // 1. Must reject with status 401
    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(401);
    expect(errorThrown.message).toContain('Your session has expired');

    // 2. Must clear token on the ApiClient instance
    expect(apiClient.getAuthToken()).toBeNull();

    // 3. Must invoke storageService.clearAuth() to wipe persistent credentials
    expect(storageService.clearAuth).toHaveBeenCalledTimes(1);

    // 4. Must notify the centralized listener
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);
    expect(unauthorizedListener).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/competitions/registrations/my',
        message: 'Your session has expired. Please log in again.',
        token: 'valid-mock-jwt-token',
      })
    );

    unsubscribe();
  });

  test('2. Deduplicates concurrent 401 responses to prevent multiple logout events and loops', async () => {
    const unauthorizedListener = jest.fn();
    apiClient.onUnauthorized(unauthorizedListener);

    // Mock fetch returning 401 for all calls
    global.fetch = jest.fn().mockImplementation(async () => {
      // Small artificial delay to ensure concurrency overlap
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Session expired' }),
      };
    });

    // Fire 4 simultaneous authenticated requests
    const results = await Promise.allSettled([
      apiClient.get('/competitions/123/registration'),
      apiClient.get('/competitions/registrations/my'),
      apiClient.get('/auth/me'),
      apiClient.post('/competitions/123/register', {}),
    ]);

    // All requests must be rejected with 401
    results.forEach((r) => {
      expect(r.status).toBe('rejected');
      expect(r.reason.status).toBe(401);
    });

    // Exactly 1 clearAuth call and 1 event dispatch despite 4 parallel 401s
    expect(storageService.clearAuth).toHaveBeenCalledTimes(1);
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);
    expect(apiClient.getAuthToken()).toBeNull();
  });

  test('3. Does NOT log out users or trigger session expired events on failed public requests', async () => {
    const unauthorizedListener = jest.fn();
    apiClient.onUnauthorized(unauthorizedListener);

    // Clear authToken so it behaves as an unauthenticated request
    apiClient.setAuthToken(null);

    // Mock 401 for /auth/login (bad password)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Invalid email or password.',
      }),
    });

    let errorThrown = null;
    try {
      await apiClient.post('/auth/login', { email: 'user@example.com', password: 'bad' });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(401);
    expect(errorThrown.message).toBe('Invalid email or password.');

    // Must NOT call clearAuth or notify listeners
    expect(storageService.clearAuth).not.toHaveBeenCalled();
    expect(unauthorizedListener).not.toHaveBeenCalled();
  });

  test('4. Does NOT log out users on unrelated HTTP errors (400, 403, 404, 500)', async () => {
    const unauthorizedListener = jest.fn();
    apiClient.onUnauthorized(unauthorizedListener);

    const testErrors = [
      { status: 400, message: 'Bad Request' },
      { status: 403, message: 'Access Denied' },
      { status: 404, message: 'Resource Not Found' },
      { status: 500, message: 'Internal Server Error' },
    ];

    for (const { status, message } of testErrors) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status,
        headers: { get: () => 'application/json' },
        json: async () => ({ message }),
      });

      let err = null;
      try {
        await apiClient.get('/some-endpoint');
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.status).toBe(status);
      expect(err.message).toBe(message);

      // Token must remain intact
      expect(apiClient.getAuthToken()).toBe('valid-mock-jwt-token');
      expect(storageService.clearAuth).not.toHaveBeenCalled();
      expect(unauthorizedListener).not.toHaveBeenCalled();
    }
  });

  test('5. Successfully handles normal authenticated requests and returns response data', async () => {
    const mockData = { id: 'c1', title: 'Code Jam 2026' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });

    const result = await apiClient.get('/competitions/c1');

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/competitions/c1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-mock-jwt-token',
        }),
      })
    );
  });

  test('6. Unsubscribe correctly removes listener', () => {
    const listener = jest.fn();
    const unsubscribe = apiClient.onUnauthorized(listener);

    apiClient.notifyUnauthorized({ test: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    apiClient.notifyUnauthorized({ test: true });
    expect(listener).toHaveBeenCalledTimes(1); // not called again
  });
});
