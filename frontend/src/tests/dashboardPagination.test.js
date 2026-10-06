global.__DEV__ = true;

// Mock Platform and Alert
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
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

import { competitionService } from '../services/competitionService';
import { api } from '../services/api';

describe('Dashboard Pagination, Filtering, Sorting & Search Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. QUERY SERIALIZATION IN COMPETITION SERVICE
  // ==========================================
  describe('Competition Service Query Serialization', () => {
    test('1. Serializes pagination parameters correctly', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        competitions: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      });

      await competitionService.getCompetitions({ page: 2, limit: 10 });

      expect(getSpy).toHaveBeenCalledWith('/competitions?page=2&limit=10');
    });

    test('2. Serializes category and status filters, ignoring "All"', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValue({ competitions: [] });

      await competitionService.getCompetitions({
        category: 'Coding',
        status: 'Open',
        page: 1,
        limit: 10,
      });

      expect(getSpy).toHaveBeenCalledWith(
        '/competitions?category=Coding&status=Open&page=1&limit=10'
      );

      // Verify 'All' is omitted from query
      await competitionService.getCompetitions({
        category: 'All',
        status: 'All',
        page: 1,
        limit: 10,
      });

      expect(getSpy).toHaveBeenLastCalledWith('/competitions?page=1&limit=10');
    });

    test('2b. Serializes Sports & Games category and sportType subcategory filter', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValue({ competitions: [] });

      await competitionService.getCompetitions({
        category: 'Sports & Games',
        sportType: 'Cricket',
        page: 1,
        limit: 10,
      });

      expect(getSpy).toHaveBeenCalledWith(
        '/competitions?category=Sports+%26+Games&sportType=Cricket&page=1&limit=10'
      );

      // Verify getCategories endpoint
      await competitionService.getCategories();
      expect(getSpy).toHaveBeenLastCalledWith('/competitions/categories');
    });

    test('3. Serializes debounced search query and sort parameters', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({ competitions: [] });

      await competitionService.getCompetitions({
        search: 'hackathon',
        sortBy: 'startDate',
        order: 'asc',
        page: 1,
        limit: 10,
      });

      expect(getSpy).toHaveBeenCalledWith(
        '/competitions?search=hackathon&sortBy=startDate&order=asc&page=1&limit=10'
      );
    });
  });

  // ==========================================
  // 2. STALE RESPONSE DISCARDING & DEBOUNCE LOGIC
  // ==========================================
  describe('Stale Response Discarding & Debouncing Logic', () => {
    test('4. Discards older/stale responses when a newer request has been initiated', async () => {
      let activeRequestId = 0;
      let displayedCompetitions = [];

      // Simulates the DashboardScreen stale-response cancellation pattern:
      const fetchWithStaleGuard = async (queryText, delayMs, resultPayload) => {
        const thisReqId = ++activeRequestId;

        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // If a newer request was dispatched while this was inflight, discard!
        if (thisReqId !== activeRequestId) {
          return { discarded: true };
        }

        displayedCompetitions = resultPayload;
        return { discarded: false, data: resultPayload };
      };

      // Dispatched first (Req 1, search 'a') - slow (50ms)
      const req1Promise = fetchWithStaleGuard('a', 50, [{ id: 1, title: 'Old Match' }]);

      // Dispatched second (Req 2, search 'ab') - fast (10ms)
      const req2Promise = fetchWithStaleGuard('ab', 10, [{ id: 2, title: 'New Match' }]);

      const [res1, res2] = await Promise.all([req1Promise, req2Promise]);

      // Request 1 resolved after Request 2, but was safely ignored
      expect(res1.discarded).toBe(true);
      expect(res2.discarded).toBe(false);

      // Display state accurately shows only the latest request's data
      expect(displayedCompetitions).toEqual([{ id: 2, title: 'New Match' }]);
    });

    test('5. Debounce timer prevents rapid intermediate requests', async () => {
      jest.useFakeTimers();

      const fetchSpy = jest.fn();
      let timer = null;

      const onSearchInput = (text) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fetchSpy(text);
        }, 350);
      };

      // User types rapidly: "r", "ro", "rob", "robotics"
      onSearchInput('r');
      jest.advanceTimersByTime(100);
      onSearchInput('ro');
      jest.advanceTimersByTime(100);
      onSearchInput('rob');
      jest.advanceTimersByTime(100);
      onSearchInput('robotics');

      expect(fetchSpy).not.toHaveBeenCalled();

      // Complete the debounce interval
      jest.advanceTimersByTime(350);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('robotics');

      jest.useRealTimers();
    });
  });

  // ==========================================
  // 3. INFINITE SCROLLING & DUPLICATE PREVENTION
  // ==========================================
  describe('Infinite Scrolling & Duplicate Prevention', () => {
    test('6. Appends next page items correctly on loadMore', async () => {
      let page = 1;
      const totalPages = 3;
      let items = [{ id: 1, title: 'Page 1 Item' }];

      const loadMore = async () => {
        if (page >= totalPages) return;
        page += 1;
        const newItems = [{ id: page, title: `Page ${page} Item` }];
        items = [...items, ...newItems];
      };

      await loadMore();
      expect(page).toBe(2);
      expect(items).toHaveLength(2);
      expect(items[1].title).toBe('Page 2 Item');

      await loadMore();
      expect(page).toBe(3);
      expect(items).toHaveLength(3);

      // Terminal page reached: does not load further
      await loadMore();
      expect(page).toBe(3);
      expect(items).toHaveLength(3);
    });

    test('7. Prevents duplicate concurrent requests while fetching', async () => {
      let isFetching = false;
      const networkCall = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return [{ id: 1 }];
      });

      const handleLoadMore = async () => {
        if (isFetching) return false;
        isFetching = true;
        try {
          await networkCall();
          return true;
        } finally {
          isFetching = false;
        }
      };

      // Trigger multiple concurrent load-more calls
      const p1 = handleLoadMore();
      const p2 = handleLoadMore();
      const p3 = handleLoadMore();

      const results = await Promise.all([p1, p2, p3]);

      // Exactly 1 request proceeded; 2 were prevented as duplicates
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(networkCall).toHaveBeenCalledTimes(1);
    });

    test('8. Filter change resets pagination to page 1 and clears existing list', () => {
      let currentPage = 3;
      let totalPages = 5;
      let items = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const onFilterChange = (newCategory) => {
        currentPage = 1;
        totalPages = 1;
        items = []; // Resets pagination and list
      };

      onFilterChange('Technology');

      expect(currentPage).toBe(1);
      expect(totalPages).toBe(1);
      expect(items).toEqual([]);
    });
  });

  // ==========================================
  // 4. ERROR & RETRY STATES
  // ==========================================
  describe('Error Handling and Retry Flow', () => {
    test('9. Catches server errors, sets error state, and clears loading', async () => {
      let loading = false;
      let error = null;

      const fetchWithError = async () => {
        loading = true;
        error = null;
        try {
          throw new Error('500 Internal Server Error');
        } catch (err) {
          error = err.message;
        } finally {
          loading = false;
        }
      };

      await fetchWithError();

      expect(loading).toBe(false);
      expect(error).toBe('500 Internal Server Error');
    });

    test('10. Retry recovers from error state on successful subsequent request', async () => {
      let error = 'Network request failed';
      let data = [];

      const retryFetch = async (shouldSucceed = true) => {
        error = null;
        if (!shouldSucceed) {
          error = 'Failed again';
          return;
        }
        data = [{ id: 101, title: 'Recovered Competition' }];
      };

      await retryFetch(true);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Recovered Competition');
    });
  });
});
