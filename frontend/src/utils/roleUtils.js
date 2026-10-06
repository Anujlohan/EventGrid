/**
 * Role-Based Access Control (RBAC) helpers for EventGrid Frontend
 */
export const ROLES = Object.freeze({
  PARTICIPANT: 'Participant',
  ORGANIZER: 'Organizer',
  ADMIN: 'Admin',
});

/**
 * Checks whether an authenticated user has permission to create competitions.
 * Restricted strictly to database-verified Organizer and Admin roles.
 * Returns false for unauthenticated users, null/undefined users, or Participant accounts.
 *
 * @param {Object|null|undefined} user - The currently authenticated user object
 * @returns {boolean} True if user is an Organizer or Admin
 */
export const canCreateCompetition = (user) => {
  if (!user || typeof user !== 'object') return false;
  const role = user.role;
  return role === ROLES.ORGANIZER || role === ROLES.ADMIN;
};

/**
 * Checks whether a user can access the organizer management portal for a competition.
 * Allowed only for the competition creator or an Admin.
 *
 * @param {Object} competition - The competition object
 * @param {Object} user - The currently authenticated user
 * @returns {boolean} True if creator or Admin
 */
export const isAuthorizedOrganizer = (competition, user) => {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (!competition) return false;

  const creatorId =
    competition.createdBy?._id ||
    competition.createdBy?.id ||
    competition.createdBy;
  const userId = user._id || user.id || user.userId;

  return Boolean(creatorId && userId && String(creatorId) === String(userId));
};
