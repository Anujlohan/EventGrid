const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const AppError = require('../utils/appError');
const { enrichCompetition, deriveCompetitionLifecycle } = require('../utils/lifecycleHelper');
const { REGISTRATION_STATUS } = require('../constants/competitionStatus');

/**
 * Get all competitions with pagination, filtering, and computed lifecycle status
 */
const getAllCompetitions = async (query = {}) => {
  const { category, status, page = 1, limit = 20 } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));

  const mongoFilter = {};
  if (category && category !== 'All') {
    mongoFilter.category = category;
  }

  const competitions = await Competition.find(mongoFilter)
    .sort({ startDate: 1 })
    .lean();

  // Dynamically enrich competitions with derived lifecycle
  const enrichedCompetitions = competitions.map((comp) => enrichCompetition(comp));

  // Apply dynamic lifecycle status filter if specified
  const filtered = status
    ? enrichedCompetitions.filter((comp) => comp.lifecycleStatus === status)
    : enrichedCompetitions;

  const paginated = filtered.slice(skip, skip + parseInt(limit, 10));

  return {
    competitions: paginated,
    total: filtered.length,
    page: parseInt(page, 10),
    totalPages: Math.ceil(filtered.length / parseInt(limit, 10)),
  };
};

/**
 * Get single competition details with dynamic lifecycle and optional user registration state
 */
const getCompetitionById = async (id, userId = null) => {
  const competition = await Competition.findById(id).lean();

  if (!competition) {
    throw new AppError('Competition not found with the requested ID.', 404);
  }

  const enriched = enrichCompetition(competition);

  let userRegistration = null;
  if (userId) {
    const reg = await Registration.findOne({
      userId,
      competitionId: id,
      status: REGISTRATION_STATUS.CONFIRMED,
    }).lean();

    userRegistration = reg
      ? { isRegistered: true, registration: reg }
      : { isRegistered: false, registration: null };
  }

  return {
    ...enriched,
    userRegistration,
  };
};

/**
 * Create a new competition (used in organizer/admin flows)
 */
const createCompetition = async (data) => {
  const competition = await Competition.create(data);
  return enrichCompetition(competition);
};

module.exports = {
  getAllCompetitions,
  getCompetitionById,
  createCompetition,
};
