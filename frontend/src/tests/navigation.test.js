global.__DEV__ = true;

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import {
  ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  isProtectedRoute,
  isPublicRoute,
} from '../navigation/routes';
import {
  parseUrlToRoute,
  formatRouteToUrl,
  syncBrowserUrl,
} from '../navigation/deepLinking';
import { NavigationState } from '../navigation/navigationState';

describe('Frontend Navigation & Protected Routes Test Suite', () => {
  let mockWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow = {
      location: { hash: '', pathname: '/', origin: 'http://localhost' },
      history: {
        pushState: jest.fn(),
        replaceState: jest.fn(),
      },
    };
    global.window = mockWindow;
  });

  afterEach(() => {
    delete global.window;
  });

  // ==========================================
  // 1. ROUTE CLASSIFICATION & DEFINITIONS
  // ==========================================
  describe('Route Definitions & Protection Rules', () => {
    test('1. Correctly classifies protected and public routes', () => {
      // Public discovery routes allowing guest exploration
      expect(isProtectedRoute(ROUTES.DASHBOARD)).toBe(false);
      expect(isProtectedRoute(ROUTES.DETAILS)).toBe(false);
      expect(isPublicRoute(ROUTES.DASHBOARD)).toBe(true);
      expect(isPublicRoute(ROUTES.DETAILS)).toBe(true);

      // Auth screens remain public
      expect(isProtectedRoute(ROUTES.LOGIN)).toBe(false);
      expect(isProtectedRoute(ROUTES.SIGNUP)).toBe(false);
      expect(isPublicRoute(ROUTES.LOGIN)).toBe(true);
      expect(isPublicRoute(ROUTES.SIGNUP)).toBe(true);

      // Protected user/organizer routes requiring authentication
      expect(isProtectedRoute(ROUTES.PROFILE)).toBe(true);
      expect(isProtectedRoute(ROUTES.ORGANIZER)).toBe(true);
      expect(isPublicRoute(ROUTES.PROFILE)).toBe(false);
      expect(isPublicRoute(ROUTES.ORGANIZER)).toBe(false);
    });
  });

  // ==========================================
  // 2. WEB DEEP LINKING & URL SYNC
  // ==========================================
  describe('Deep Linking & URL Parsing', () => {
    test('2. Parses hash-based deep links into valid route names and parameters', () => {
      expect(parseUrlToRoute('#/login')).toEqual({ name: ROUTES.LOGIN, params: {} });
      expect(parseUrlToRoute('#/signup')).toEqual({ name: ROUTES.SIGNUP, params: {} });
      expect(parseUrlToRoute('#/dashboard')).toEqual({ name: ROUTES.DASHBOARD, params: {} });
      expect(parseUrlToRoute('#/profile')).toEqual({ name: ROUTES.PROFILE, params: {} });
      expect(parseUrlToRoute('#/competitions/hackathon-2026')).toEqual({
        name: ROUTES.DETAILS,
        params: { competitionId: 'hackathon-2026' },
      });
    });

    test('3. Formats route names and parameters into URL hashes', () => {
      expect(formatRouteToUrl(ROUTES.LOGIN)).toBe('#/login');
      expect(formatRouteToUrl(ROUTES.SIGNUP)).toBe('#/signup');
      expect(formatRouteToUrl(ROUTES.DASHBOARD)).toBe('#/dashboard');
      expect(formatRouteToUrl(ROUTES.PROFILE)).toBe('#/profile');
      expect(formatRouteToUrl(ROUTES.DETAILS, { competitionId: 'comp-101' })).toBe(
        '#/competitions/comp-101'
      );
    });

    test('4. syncBrowserUrl pushes state to window.history in web environments', () => {
      syncBrowserUrl(ROUTES.DETAILS, { competitionId: '123' });
      expect(global.window.history.pushState).toHaveBeenCalledWith(
        { routeName: ROUTES.DETAILS, params: { competitionId: '123' } },
        '',
        '#/competitions/123'
      );
    });
  });

  // ==========================================
  // 3. UNAUTHENTICATED NAVIGATION & ROUTE GUARDING
  // ==========================================
  describe('Unauthenticated Flow & Route Guarding', () => {
    test('5. Unauthenticated user initializes on DASHBOARD for public discovery by default', () => {
      const nav = new NavigationState({
        isAuthenticated: false,
      });

      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.getStack().length).toBe(1);
      expect(nav.canGoBack()).toBe(false);
    });

    test('6. Unauthenticated deep link to a protected route redirects to LOGIN with redirectAfter', () => {
      global.window.location.hash = '#/profile';

      const nav = new NavigationState({
        isAuthenticated: false,
      });

      // Guard intercepts protected deep link and forces LOGIN
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
      expect(nav.getCurrentRoute().params.redirectAfter).toEqual({
        name: ROUTES.PROFILE,
        params: {},
      });
    });

    test('7. Route guard prevents unauthenticated push to protected routes (PROFILE, ORGANIZER)', () => {
      const onUnauthorizedAttempt = jest.fn();

      const nav = new NavigationState({
        isAuthenticated: false,
        onUnauthorizedAttempt,
      });

      // Public discovery route DASHBOARD is allowed for unauthenticated visitors
      nav.push(ROUTES.DETAILS, { competitionId: 'comp-101' });
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DETAILS);
      expect(onUnauthorizedAttempt).not.toHaveBeenCalled();

      // Attempt to push protected PROFILE without auth triggers guard
      nav.push(ROUTES.PROFILE);
      expect(onUnauthorizedAttempt).toHaveBeenCalledWith(ROUTES.PROFILE);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);

      // Attempt to push protected ORGANIZER without auth triggers guard
      nav.push(ROUTES.ORGANIZER);
      expect(onUnauthorizedAttempt).toHaveBeenCalledWith(ROUTES.ORGANIZER);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
    });

    test('8. Unauthenticated user can navigate between public routes (LOGIN <-> SIGNUP)', () => {
      const nav = new NavigationState({
        isAuthenticated: false,
        initialRoute: ROUTES.LOGIN,
      });

      nav.push(ROUTES.SIGNUP);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.SIGNUP);
      expect(nav.getStack().length).toBe(2);
      expect(nav.canGoBack()).toBe(true);

      // Pop back to LOGIN
      const popped = nav.goBack();
      expect(popped).toBe(true);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
      expect(nav.getStack().length).toBe(1);
    });
  });

  // ==========================================
  // 4. AUTHENTICATED NAVIGATION & STACK HISTORY
  // ==========================================
  describe('Authenticated Navigation & Native Stack Operations', () => {
    test('9. Authenticated user initializes on DASHBOARD by default', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.getStack().length).toBe(1);
    });

    test('10. Pushes and pops screens maintaining full stack history', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      // Push DETAILS
      nav.push(ROUTES.DETAILS, { competitionId: 'comp-1' });
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DETAILS);
      expect(nav.getCurrentRoute().params.competitionId).toBe('comp-1');
      expect(nav.getStack().length).toBe(2);
      expect(nav.canGoBack()).toBe(true);

      // Push PROFILE
      nav.push(ROUTES.PROFILE);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.PROFILE);
      expect(nav.getStack().length).toBe(3);

      // Pop back to DETAILS
      nav.goBack();
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DETAILS);
      expect(nav.getStack().length).toBe(2);

      // Pop back to DASHBOARD
      nav.goBack();
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.getStack().length).toBe(1);
      expect(nav.canGoBack()).toBe(false);
    });

    test('11. Replace updates the current screen without increasing stack depth', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      nav.push(ROUTES.DETAILS, { competitionId: 'comp-1' });
      expect(nav.getStack().length).toBe(2);

      nav.replace(ROUTES.PROFILE);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.PROFILE);
      expect(nav.getStack().length).toBe(2);
    });

    test('12. Reset replaces the entire stack history', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      nav.push(ROUTES.DETAILS, { competitionId: 'comp-1' });
      nav.push(ROUTES.PROFILE);
      expect(nav.getStack().length).toBe(3);

      nav.reset([{ name: ROUTES.DASHBOARD, params: {} }]);
      expect(nav.getStack().length).toBe(1);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.canGoBack()).toBe(false);
    });
  });

  // ==========================================
  // 5. LOGOUT PROTECTION & STACK WIPING
  // ==========================================
  describe('Logout Protection & Session Cleared', () => {
    test('13. Logout immediately wipes stack history and locks user to LOGIN', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      // Navigate deep into protected screens
      nav.push(ROUTES.DETAILS, { competitionId: 'comp-42' });
      nav.push(ROUTES.PROFILE);
      expect(nav.getStack().length).toBe(3);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.PROFILE);

      // Simulate user logout
      nav.handleAuthChange(false);

      // Verify stack is completely cleared and reset to LOGIN
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
      expect(nav.getStack().length).toBe(1);
      expect(nav.canGoBack()).toBe(false);

      // Verify that pressing back does not return to PROFILE or DETAILS
      const popped = nav.goBack();
      expect(popped).toBe(false);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
      expect(nav.getStack().length).toBe(1);
    });

    test('14. Login transitions user to pending deep link or DASHBOARD', () => {
      global.window.location.hash = '#/profile';

      // Unauthenticated deep link sets pending redirect to PROFILE
      const nav = new NavigationState({
        isAuthenticated: false,
      });
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);

      // User logs in
      nav.handleAuthChange(true);

      // Should automatically navigate to the intended target (PROFILE)
      expect(nav.getCurrentRoute().name).toBe(ROUTES.PROFILE);
    });
  });

  // ==========================================
  // 6. ANDROID HARDWARE BACK BUTTON
  // ==========================================
  describe('Android Hardware Back Button Handling', () => {
    test('15. Hardware back pops stack when canGoBack is true and consumes event', () => {
      const nav = new NavigationState({
        isAuthenticated: true,
      });

      nav.push(ROUTES.PROFILE);
      expect(nav.getStack().length).toBe(2);

      // When canGoBack is true, returns true (consumed) and pops
      const handled = nav.handleHardwareBack();
      expect(handled).toBe(true);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.getStack().length).toBe(1);

      // When at root, returns false so Android OS can exit app
      const handledAtRoot = nav.handleHardwareBack();
      expect(handledAtRoot).toBe(false);
    });
  });
});
