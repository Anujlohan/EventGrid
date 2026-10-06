const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const AppError = require('../utils/appError');
const { enrichCompetition } = require('../utils/lifecycleHelper');
const { REGISTRATION_STATUS, LIFECYCLE_STATUS } = require('../constants/competitionStatus');
const {
  EVENT_CATEGORIES,
  SPORTS_GAMES_EXAMPLES,
  CATEGORY_NAMES,
  getCategoryMeta,
} = require('../constants/eventCategories');
const { createNotification } = require('./notificationService');

/**
 * Normalizes input status to match standard LIFECYCLE_STATUS constants
 */
const normalizeLifecycleStatus = (statusStr) => {
  if (!statusStr || typeof statusStr !== 'string') return null;
  const s = statusStr.trim().toUpperCase();
  if (s === 'OPEN') return LIFECYCLE_STATUS.REGISTRATION_OPEN;
  if (s === 'CLOSED') return LIFECYCLE_STATUS.REGISTRATION_CLOSED;
  return s;
};

/**
 * Builds MongoDB query condition corresponding to dynamic lifecycle status
 * Evaluates all lifecycle conditions at the database query level
 */
const buildLifecycleMongoFilter = (status, now = new Date()) => {
  const normalized = normalizeLifecycleStatus(status);

  switch (normalized) {
    case LIFECYCLE_STATUS.COMPLETED:
      return { endDate: { $lte: now } };

    case LIFECYCLE_STATUS.LIVE:
      return { startDate: { $lte: now }, endDate: { $gt: now } };

    case LIFECYCLE_STATUS.UPCOMING:
      return { registrationStartDate: { $gt: now }, startDate: { $gt: now } };

    case LIFECYCLE_STATUS.REGISTRATION_CLOSED:
      return {
        registrationDeadline: { $lt: now },
        startDate: { $gt: now },
      };

    case LIFECYCLE_STATUS.FULL:
      return {
        registrationStartDate: { $lte: now },
        registrationDeadline: { $gte: now },
        startDate: { $gt: now },
        $expr: { $gte: ['$registeredCount', '$totalSpots'] },
      };

    case LIFECYCLE_STATUS.REGISTRATION_OPEN:
      return {
        registrationStartDate: { $lte: now },
        registrationDeadline: { $gte: now },
        startDate: { $gt: now },
        $expr: { $lt: ['$registeredCount', '$totalSpots'] },
      };

    default:
      // If unknown status string is passed, query by the stored status field
      return { status: status.trim() };
  }
};

/**
 * Builds sort object based on query parameters, supporting sortBy/order and sort string formats
 */
const buildSortOptions = (query = {}) => {
  const { sortBy, order, sort } = query;
  const allowedSortFields = [
    'startDate',
    'endDate',
    'registrationStartDate',
    'registrationDeadline',
    'createdAt',
    'title',
    'registeredCount',
    'totalSpots',
    'category',
    'sportType',
  ];

  // Support sort="-startDate" or sort="+startDate" or sort="startDate"
  if (sort && typeof sort === 'string') {
    const trimmed = sort.trim();
    const isDesc = trimmed.startsWith('-');
    const field = isDesc || trimmed.startsWith('+') ? trimmed.slice(1).trim() : trimmed;
    if (allowedSortFields.includes(field)) {
      return { [field]: isDesc ? -1 : 1 };
    }
  }

  // Support sortBy="startDate" & order="desc"|"asc"
  if (sortBy && typeof sortBy === 'string' && allowedSortFields.includes(sortBy.trim())) {
    const field = sortBy.trim();
    const isDesc = order && (String(order).toLowerCase() === 'desc' || String(order) === '-1');
    return { [field]: isDesc ? -1 : 1 };
  }

  // Default chronological sort by startDate ascending
  return { startDate: 1 };
};

/**
 * Get all competitions with database-level pagination, filtering, and sorting
 *
 * @param {Object} query - Query parameters (page, limit, category, status, search, sortBy, order, sort)
 * @returns {Promise<Object>} { competitions, total, page, limit, totalPages }
 */
const getAllCompetitions = async (query = {}) => {
  const { category, status, search, page, limit } = query;
  const now = new Date();

  // 1. Sanitize & validate pagination parameters
  const parsedPage = parseInt(page, 10);
  const safePage = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = parseInt(limit, 10);
  const safeLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(100, parsedLimit) : 20;

  const skip = (safePage - 1) * safeLimit;

  // 2. Build MongoDB query filter
  const mongoFilter = {};

  // Category filter
  if (category && category !== 'All' && typeof category === 'string' && category.trim()) {
    mongoFilter.category = category.trim();
  }

  // Subcategory / Sport Type filter
  if (query.sportType && query.sportType !== 'All' && typeof query.sportType === 'string' && query.sportType.trim()) {
    mongoFilter.sportType = query.sportType.trim();
  } else if (query.subcategory && query.subcategory !== 'All' && typeof query.subcategory === 'string' && query.subcategory.trim()) {
    mongoFilter.subcategory = query.subcategory.trim();
  }

  // Search filter across title, description, organizer, category, subcategory, sportType, and tags
  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    mongoFilter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { organizer: searchRegex },
      { category: searchRegex },
      { subcategory: searchRegex },
      { sportType: searchRegex },
      { tags: searchRegex },
    ];
  }

  // Dynamic lifecycle status filter
  if (status && status !== 'All' && typeof status === 'string' && status.trim()) {
    const lifecycleFilter = buildLifecycleMongoFilter(status, now);
    Object.assign(mongoFilter, lifecycleFilter);
  }

  // 3. Determine sorting
  const sortOptions = buildSortOptions(query);

  // 4. Execute database-level count and paginated query in parallel
  const [total, competitions] = await Promise.all([
    Competition.countDocuments(mongoFilter),
    Competition.find(mongoFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  // 5. Enrich paginated documents with dynamic lifecycle metadata
  const enrichedCompetitions = competitions.map((comp) => enrichCompetition(comp, now));

  // 6. Calculate total pages
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  return {
    competitions: enrichedCompetitions,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
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
 * Explicitly binds the competition to the authenticated creator
 */
const createCompetition = async (data, creatorId = null) => {
  const createdBy = creatorId || data.createdBy;
  const competition = await Competition.create({
    ...data,
    ...(createdBy ? { createdBy } : {}),
  });
  return enrichCompetition(competition);
};

/**
 * Update an existing competition
 * Allowed only for creator or Admin
 */
const updateCompetition = async (id, updateData, user) => {
  const competition = await Competition.findById(id);
  if (!competition) {
    throw new AppError('Competition not found with the requested ID.', 404);
  }

  const isCreator =
    competition.createdBy && competition.createdBy.toString() === user.userId;
  const isAdmin = user.role === 'Admin';
  if (!isCreator && !isAdmin) {
    throw new AppError(
      'Access denied. Only the competition creator or an Admin can edit this competition.',
      403
    );
  }

  if (competition.isCancelled || competition.status === LIFECYCLE_STATUS.CANCELLED) {
    throw new AppError('Cannot update a cancelled competition.', 400);
  }

  // Validate spots vs current registrations
  if (updateData.totalSpots !== undefined) {
    const newSpots = parseInt(updateData.totalSpots, 10);
    if (newSpots < competition.registeredCount) {
      throw new AppError(
        `totalSpots cannot be less than current registered count (${competition.registeredCount}).`,
        400
      );
    }
  }

  // Validate merged dates
  const regStart = new Date(
    updateData.registrationStartDate !== undefined
      ? updateData.registrationStartDate
      : competition.registrationStartDate
  );
  const regDeadline = new Date(
    updateData.registrationDeadline !== undefined
      ? updateData.registrationDeadline
      : competition.registrationDeadline
  );
  const start = new Date(
    updateData.startDate !== undefined ? updateData.startDate : competition.startDate
  );
  const end = new Date(
    updateData.endDate !== undefined ? updateData.endDate : competition.endDate
  );

  if (regStart > regDeadline) {
    throw new AppError(
      'registrationStartDate must be less than or equal to registrationDeadline.',
      400
    );
  }
  if (regDeadline >= start) {
    throw new AppError(
      'registrationDeadline must be strictly before startDate.',
      400
    );
  }
  if (start > end) {
    throw new AppError('startDate must be less than or equal to endDate.', 400);
  }

  // Sanitize immutable / system fields
  const allowedFields = [
    'title',
    'description',
    'shortDescription',
    'image',
    'category',
    'subcategory',
    'sportType',
    'organizer',
    'location',
    'registrationStartDate',
    'registrationDeadline',
    'startDate',
    'endDate',
    'totalSpots',
    'entryFee',
    'prizePool',
    'rules',
    'eligibility',
    'tags',
    'customRegistrationFields',
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      competition[field] = updateData[field];
    }
  });

  await competition.save();
  return enrichCompetition(competition);
};

/**
 * Delete a competition with safe cancellation/archival policy
 * If registrations exist, preserves participant audit records by archiving and cancelling
 * Allowed only for creator or Admin
 */
const deleteCompetition = async (id, user, options = {}) => {
  const competition = await Competition.findById(id);
  if (!competition) {
    throw new AppError('Competition not found with the requested ID.', 404);
  }

  const isCreator =
    competition.createdBy && competition.createdBy.toString() === user.userId;
  const isAdmin = user.role === 'Admin';
  if (!isCreator && !isAdmin) {
    throw new AppError(
      'Access denied. Only the competition creator or an Admin can delete this competition.',
      403
    );
  }

  const totalRegistrations = await Registration.countDocuments({
    competitionId: competition._id,
  });

  // Apply cancellation / archival policy if registrations exist
  if (totalRegistrations > 0 || competition.registeredCount > 0) {
    competition.status = LIFECYCLE_STATUS.CANCELLED;
    competition.isCancelled = true;
    competition.isArchived = true;
    competition.cancelledAt = new Date();
    if (options.cancellationReason || options.reason) {
      competition.cancellationReason = options.cancellationReason || options.reason;
    }
    await competition.save();

    // Find all affected participants
    const affectedRegistrations = await Registration.find({
      competitionId: competition._id,
      status: { $in: [REGISTRATION_STATUS.CONFIRMED, REGISTRATION_STATUS.WAITLISTED] },
    }).lean();

    // Cancel active and waitlisted registrations to release user spots
    await Registration.updateMany(
      {
        competitionId: competition._id,
        status: { $in: [REGISTRATION_STATUS.CONFIRMED, REGISTRATION_STATUS.WAITLISTED] },
      },
      { status: REGISTRATION_STATUS.CANCELLED, cancelledAt: new Date() }
    );

    // Send persistent in-app notifications to each affected user
    const uniqueUserIds = [...new Set(affectedRegistrations.map((r) => r.userId.toString()))];
    for (const uid of uniqueUserIds) {
      await createNotification({
        userId: uid,
        type: 'COMPETITION_CANCELLATION',
        title: 'Competition Cancelled',
        message: `The competition "${competition.title}" has been cancelled by the organizer.`,
        competitionId: competition._id,
      });
    }

    return {
      action: 'CANCELLED',
      archived: true,
      competition: enrichCompetition(competition),
      message:
        'Competition has active registrations and cannot be permanently deleted. It has been safely cancelled and archived to preserve participant records.',
    };
  }

  // Hard delete if no registrations ever existed
  await Registration.deleteMany({ competitionId: competition._id });
  await Competition.findByIdAndDelete(competition._id);

  return {
    action: 'DELETED',
    deleted: true,
    competitionId: competition._id,
    message: 'Competition deleted successfully.',
  };
};

/**
 * Get participant roster for a competition
 * Allowed only for creator or Admin
 */
const getCompetitionParticipants = async (id, user, query = {}) => {
  const competition = await Competition.findById(id).lean();
  if (!competition) {
    throw new AppError('Competition not found with the requested ID.', 404);
  }

  const isCreator =
    competition.createdBy && competition.createdBy.toString() === user.userId;
  const isAdmin = user.role === 'Admin';
  if (!isCreator && !isAdmin) {
    throw new AppError(
      'Access denied. Only the competition creator or an Admin can view participant roster.',
      403
    );
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const filter = { competitionId: competition._id };
  if (query.status && typeof query.status === 'string') {
    const s = query.status.trim().toUpperCase();
    if (Object.values(REGISTRATION_STATUS).includes(s)) {
      filter.status = s;
    }
  }

  const [total, registrations] = await Promise.all([
    Registration.countDocuments(filter),
    Registration.find(filter)
      .populate('userId', 'name email phoneNumber college organization experienceLevel role avatar')
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const participants = registrations.map((reg) => ({
    registrationId: reg._id,
    registeredAt: reg.registeredAt,
    status: reg.status,
    cancelledAt: reg.cancelledAt,
    participantDetails: reg.participantDetails,
    user: reg.userId
      ? {
          id: reg.userId._id,
          name: reg.userId.name,
          email: reg.userId.email,
          phoneNumber: reg.userId.phoneNumber,
          college: reg.userId.college,
          organization: reg.userId.organization,
          experienceLevel: reg.userId.experienceLevel,
          role: reg.userId.role,
          avatar: reg.userId.avatar,
        }
      : null,
  }));

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    competitionId: competition._id,
    competitionTitle: competition.title,
    total,
    page,
    limit,
    totalPages,
    participants,
  };
};

/**
 * Returns available event categories and sports subcategories
 */
const getEventCategories = () => {
  return {
    categories: EVENT_CATEGORIES,
    sportsExamples: SPORTS_GAMES_EXAMPLES,
    categoryNames: CATEGORY_NAMES,
  };
};

module.exports = {
  getAllCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitionParticipants,
  getEventCategories,
  buildLifecycleMongoFilter,
  buildSortOptions,
};
