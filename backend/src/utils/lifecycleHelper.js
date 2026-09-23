const { LIFECYCLE_STATUS } = require('../constants/competitionStatus');

/**
 * Derives the real-time dynamic lifecycle status and metadata for a competition.
 * Stored statuses are never treated as authoritative over UTC timestamps and capacity.
 *
 * Evaluation Order:
 * 1. now >= endDate                              -> COMPLETED
 * 2. now >= startDate && now < endDate          -> LIVE
 * 3. now < registrationStartDate                 -> UPCOMING
 * 4. now > registrationDeadline && now < startDate -> REGISTRATION_CLOSED
 * 5. registeredCount >= totalSpots && now < startDate -> FULL
 * 6. registrationStartDate <= now <= registrationDeadline -> REGISTRATION_OPEN
 *
 * @param {Object} competition - Competition plain object or Mongoose doc
 * @param {Date} [currentTime] - Current UTC reference time (defaults to Date.now())
 * @returns {Object} Derived lifecycle metadata
 */
const deriveCompetitionLifecycle = (competition, currentTime = new Date()) => {
  const now = new Date(currentTime);
  const regStart = new Date(competition.registrationStartDate);
  const regDeadline = new Date(competition.registrationDeadline);
  const start = new Date(competition.startDate);
  const end = new Date(competition.endDate);

  const totalSpots = Number(competition.totalSpots) || 0;
  const registeredCount = Number(competition.registeredCount) || 0;
  const remainingSpots = Math.max(0, totalSpots - registeredCount);
  const isFull = registeredCount >= totalSpots;

  let lifecycleStatus;

  if (now >= end) {
    lifecycleStatus = LIFECYCLE_STATUS.COMPLETED;
  } else if (now >= start && now < end) {
    lifecycleStatus = LIFECYCLE_STATUS.LIVE;
  } else if (now < regStart) {
    lifecycleStatus = LIFECYCLE_STATUS.UPCOMING;
  } else if (now > regDeadline && now < start) {
    lifecycleStatus = LIFECYCLE_STATUS.REGISTRATION_CLOSED;
  } else if (isFull && now < start) {
    lifecycleStatus = LIFECYCLE_STATUS.FULL;
  } else {
    lifecycleStatus = LIFECYCLE_STATUS.REGISTRATION_OPEN;
  }

  const isRegistrationOpen = lifecycleStatus === LIFECYCLE_STATUS.REGISTRATION_OPEN;
  const hasStarted = now >= start;
  const hasEnded = now >= end;
  const isLive = now >= start && now < end;
  const timeRemainingToDeadline = Math.max(0, regDeadline.getTime() - now.getTime());

  return {
    lifecycleStatus,
    remainingSpots,
    totalSpots,
    registeredCount,
    isRegistrationOpen,
    isFull,
    hasStarted,
    hasEnded,
    isLive,
    timeRemainingToDeadline,
  };
};

/**
 * Enriches a competition document/object with dynamic lifecycle metadata
 * @param {Object} competition
 * @param {Date} [currentTime]
 * @returns {Object} Enriched competition
 */
const enrichCompetition = (competition, currentTime = new Date()) => {
  const compObj = competition.toObject ? competition.toObject() : { ...competition };
  const lifecycle = deriveCompetitionLifecycle(compObj, currentTime);
  return {
    ...compObj,
    status: lifecycle.lifecycleStatus,
    ...lifecycle,
  };
};

module.exports = {
  deriveCompetitionLifecycle,
  enrichCompetition,
};
