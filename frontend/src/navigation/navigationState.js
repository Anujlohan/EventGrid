import { ROUTES, isProtectedRoute } from './routes';
import { parseUrlToRoute, syncBrowserUrl } from './deepLinking';

/**
 * Pure Native Stack Navigation Engine
 * Manages route transitions, protected guards, stack history, back-handling, and deep-link resolution.
 */
export class NavigationState {
  constructor({
    isAuthenticated = false,
    initialRoute = null,
    onUnauthorizedAttempt = null,
    onStateChange = null,
  } = {}) {
    this.isAuthenticated = Boolean(isAuthenticated);
    this.onUnauthorizedAttempt = onUnauthorizedAttempt;
    this.onStateChange = onStateChange;
    this.pendingRedirect = null;

    // Resolve initial stack from deep-link or defaults
    const deepLink = parseUrlToRoute();
    if (deepLink) {
      if (isProtectedRoute(deepLink.name)) {
        if (this.isAuthenticated) {
          this.stack = [{ name: deepLink.name, params: deepLink.params || {} }];
        } else {
          this.pendingRedirect = deepLink;
          this.stack = [{ name: ROUTES.LOGIN, params: { redirectAfter: deepLink } }];
        }
      } else {
        this.stack = [{ name: deepLink.name, params: deepLink.params || {} }];
      }
    } else if (initialRoute) {
      this.stack = [{ name: initialRoute, params: {} }];
    } else {
      this.stack = [{ name: ROUTES.DASHBOARD, params: {} }];
    }

    this._notify();
  }

  getCurrentRoute() {
    return this.stack[this.stack.length - 1] || {
      name: ROUTES.DASHBOARD,
      params: {},
    };
  }

  getStack() {
    return [...this.stack];
  }

  canGoBack() {
    return this.stack.length > 1;
  }

  push(routeName, params = {}) {
    // Route Protection Guard
    if (isProtectedRoute(routeName) && !this.isAuthenticated) {
      this.pendingRedirect = { name: routeName, params };
      if (this.onUnauthorizedAttempt) {
        this.onUnauthorizedAttempt(routeName);
      }
      this.stack = [{ name: ROUTES.LOGIN, params: { redirectAfter: { name: routeName, params } } }];
      syncBrowserUrl(ROUTES.LOGIN, {}, true);
      this._notify();
      return;
    }

    this.stack = [...this.stack, { name: routeName, params }];
    syncBrowserUrl(routeName, params, false);
    this._notify();
  }

  pop() {
    if (this.stack.length <= 1) {
      return false;
    }
    this.stack = this.stack.slice(0, -1);
    const top = this.getCurrentRoute();
    syncBrowserUrl(top.name, top.params, true);
    this._notify();
    return true;
  }

  goBack() {
    return this.pop();
  }

  navigate(routeName, params = {}) {
    if (isProtectedRoute(routeName) && !this.isAuthenticated) {
      return this.push(routeName, params);
    }

    const top = this.getCurrentRoute();
    if (top && top.name === routeName) {
      this.stack = [
        ...this.stack.slice(0, -1),
        { name: routeName, params: { ...top.params, ...params } },
      ];
      syncBrowserUrl(routeName, params, true);
      this._notify();
      return;
    }

    this.push(routeName, params);
  }

  replace(routeName, params = {}) {
    if (isProtectedRoute(routeName) && !this.isAuthenticated) {
      return this.push(routeName, params);
    }
    this.stack = [...this.stack.slice(0, -1), { name: routeName, params }];
    syncBrowserUrl(routeName, params, true);
    this._notify();
  }

  reset(newRoutes) {
    const safeRoutes = Array.isArray(newRoutes) && newRoutes.length > 0
      ? newRoutes
      : [{ name: this.isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN, params: {} }];

    this.stack = safeRoutes;
    const top = safeRoutes[safeRoutes.length - 1];
    syncBrowserUrl(top.name, top.params, true);
    this._notify();
  }

  handleAuthChange(newIsAuthenticated) {
    const prevAuth = this.isAuthenticated;
    this.isAuthenticated = Boolean(newIsAuthenticated);

    if (!this.isAuthenticated) {
      // User logged out: strictly wipe protected routes and force LOGIN
      const hasProtected = this.stack.some((r) => isProtectedRoute(r.name));
      if (hasProtected || this.stack.length === 0) {
        this.stack = [{ name: ROUTES.LOGIN, params: {} }];
        syncBrowserUrl(ROUTES.LOGIN, {}, true);
        this._notify();
      }
    } else if (!prevAuth && this.isAuthenticated) {
      // User just logged in
      const top = this.getCurrentRoute();
      if (top.name === ROUTES.LOGIN || top.name === ROUTES.SIGNUP) {
        const target = this.pendingRedirect || { name: ROUTES.DASHBOARD, params: {} };
        this.pendingRedirect = null;
        this.stack = [target];
        syncBrowserUrl(target.name, target.params, true);
        this._notify();
      }
    }
  }

  handleHardwareBack() {
    if (this.canGoBack()) {
      this.pop();
      return true; // handled by app navigation
    }
    return false; // let Android OS exit
  }

  _notify() {
    if (this.onStateChange) {
      this.onStateChange(this.getCurrentRoute(), this.getStack());
    }
  }
}
