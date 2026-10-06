import { Platform } from 'react-native';
import { ROUTES } from './routes';

/**
 * Parse an incoming URL or hash into a route name and params
 * @param {string} [urlString]
 * @returns {{ name: string, params: object } | null}
 */
export const parseUrlToRoute = (urlString) => {
  let path = '';

  if (urlString) {
    try {
      const parsed = new URL(urlString, 'http://localhost');
      path = parsed.hash ? parsed.hash.replace(/^#\/?/, '') : parsed.pathname.replace(/^\//, '');
    } catch {
      path = urlString.replace(/^#\/?/, '').replace(/^\//, '');
    }
  } else if (typeof window !== 'undefined' && window.location) {
    const hash = window.location.hash ? window.location.hash.replace(/^#\/?/, '') : '';
    const pathname = window.location.pathname ? window.location.pathname.replace(/^\//, '') : '';
    path = hash || pathname;
  }

  // Clean trailing slashes
  path = path.replace(/\/+$/, '');

  if (!path) {
    return null;
  }

  // Match /competitions/:id/organizer
  const organizerMatch = path.match(/^competitions\/([a-zA-Z0-9_-]+)\/organizer$/);
  if (organizerMatch) {
    return {
      name: ROUTES.ORGANIZER,
      params: { competitionId: organizerMatch[1] },
    };
  }

  // Match /competitions/:id
  const competitionMatch = path.match(/^competitions\/([a-zA-Z0-9_-]+)$/);
  if (competitionMatch) {
    return {
      name: ROUTES.DETAILS,
      params: { competitionId: competitionMatch[1] },
    };
  }

  if (path === 'profile') {
    return { name: ROUTES.PROFILE, params: {} };
  }

  if (path === 'dashboard') {
    return { name: ROUTES.DASHBOARD, params: {} };
  }

  if (path === 'signup') {
    return { name: ROUTES.SIGNUP, params: {} };
  }

  if (path === 'login') {
    return { name: ROUTES.LOGIN, params: {} };
  }

  return null;
};

/**
 * Format route name and params into a web URL hash
 * @param {string} routeName
 * @param {object} [params]
 * @returns {string}
 */
export const formatRouteToUrl = (routeName, params = {}) => {
  switch (routeName) {
    case ROUTES.ORGANIZER:
      return params.competitionId
        ? `#/competitions/${params.competitionId}/organizer`
        : '#/dashboard';
    case ROUTES.DETAILS:
      return params.competitionId ? `#/competitions/${params.competitionId}` : '#/dashboard';
    case ROUTES.PROFILE:
      return '#/profile';
    case ROUTES.SIGNUP:
      return '#/signup';
    case ROUTES.LOGIN:
      return '#/login';
    case ROUTES.DASHBOARD:
    default:
      return '#/dashboard';
  }
};

/**
 * Sync current route to browser history/URL if in Web environment
 * @param {string} routeName
 * @param {object} [params]
 * @param {boolean} [replace=false]
 */
export const syncBrowserUrl = (routeName, params = {}, replace = false) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history) {
    return;
  }

  const hashUrl = formatRouteToUrl(routeName, params);
  try {
    if (replace) {
      window.history.replaceState({ routeName, params }, '', hashUrl);
    } else {
      window.history.pushState({ routeName, params }, '', hashUrl);
    }
  } catch {
    // Fallback to location.hash
    window.location.hash = hashUrl;
  }
};
