/**
 * Navigation Route Constants & Protection Rules
 * EventGrid Competition Discovery Platform
 */

export const ROUTES = Object.freeze({
  LOGIN: 'LOGIN',
  SIGNUP: 'SIGNUP',
  DASHBOARD: 'DASHBOARD',
  DETAILS: 'DETAILS',
  PROFILE: 'PROFILE',
  ORGANIZER: 'ORGANIZER',
});

// Protected routes require authenticated user session
export const PROTECTED_ROUTES = Object.freeze([
  ROUTES.PROFILE,
  ROUTES.ORGANIZER,
]);

// Public routes allow open browsing for all visitors
export const PUBLIC_ROUTES = Object.freeze([
  ROUTES.DASHBOARD,
  ROUTES.DETAILS,
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
]);

export const isProtectedRoute = (route) => {
  return PROTECTED_ROUTES.includes(route);
};

export const isPublicRoute = (route) => {
  return PUBLIC_ROUTES.includes(route);
};
