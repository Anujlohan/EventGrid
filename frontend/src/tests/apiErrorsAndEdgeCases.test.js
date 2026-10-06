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

describe('API Errors & Edge Cases Test Suite (400, 401, 403, 404, 500, Network Failure)', () => {
  let apiClient;
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('https://api.example.com', 5000);
    apiClient.setAuthToken('mock-user-token');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('1. HTTP 400 Bad Request extracts descriptive validation message from response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Password must be at least 8 characters long.',
      }),
    });

    let thrownError = null;
    try {
      await apiClient.post('/auth/signup', { password: 'short' });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(400);
    expect(thrownError.message).toBe('Password must be at least 8 characters long.');
    expect(storageService.clearAuth).not.toHaveBeenCalled();
    expect(apiClient.getAuthToken()).toBe('mock-user-token');
  });

  test('2. HTTP 403 Forbidden throws without wiping authentication token', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Access denied. Only the competition creator or an Admin can view participant roster.',
      }),
    });

    let thrownError = null;
    try {
      await apiClient.get('/competitions/comp_1/participants');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(403);
    expect(thrownError.message).toContain('Access denied');

    // CRITICAL: Token must NOT be cleared on 403 authorization failures
    expect(storageService.clearAuth).not.toHaveBeenCalled();
    expect(apiClient.getAuthToken()).toBe('mock-user-token');
  });

  test('3. HTTP 404 Not Found returns resource-missing error without logging out user', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Competition not found with ID 64aef1234567890123456789.',
      }),
    });

    let thrownError = null;
    try {
      await apiClient.get('/competitions/64aef1234567890123456789');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(404);
    expect(thrownError.message).toContain('Competition not found');
    expect(storageService.clearAuth).not.toHaveBeenCalled();
    expect(apiClient.getAuthToken()).toBe('mock-user-token');
  });

  test('4. HTTP 500 Internal Server Error returns server error message', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Internal server error occurred.',
      }),
    });

    let thrownError = null;
    try {
      await apiClient.get('/competitions');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(500);
    expect(thrownError.message).toBe('Internal server error occurred.');
    expect(storageService.clearAuth).not.toHaveBeenCalled();
  });

  test('5. Non-JSON server error response (e.g. HTML gateway crash) falls back to status text', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: { get: () => 'text/html' },
      text: async () => '<html><body>502 Bad Gateway</body></html>',
    });

    let thrownError = null;
    try {
      await apiClient.get('/competitions');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(502);
    expect(thrownError.message).toContain('Bad Gateway');
  });

  test('6. Network connection failure throws connection error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(
      new TypeError('Failed to fetch (net::ERR_CONNECTION_REFUSED)')
    );

    let thrownError = null;
    try {
      await apiClient.get('/competitions');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toContain('Unable to connect to server');
  });

  test('7. Network timeout triggers abort signal and timeout error', async () => {
    const quickTimeoutClient = new ApiClient('https://api.example.com', 50);

    global.fetch = jest.fn().mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    let thrownError = null;
    try {
      await quickTimeoutClient.get('/competitions');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toContain('timed out');
  });
});
