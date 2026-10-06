const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

/**
 * Get all users with search, role filter, and pagination (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role && ['Participant', 'Organizer', 'Admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return successResponse(
      res,
      200,
      {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      'Users retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user's role (Admin only)
 * Cannot demote oneself if sole Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['Participant', 'Organizer', 'Admin'].includes(role)) {
      return next(
        new AppError('Valid role required: "Participant", "Organizer", or "Admin".', 400)
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // Prevent Admin from removing their own admin status if they are the only Admin
    if (user._id.toString() === req.user.userId && role !== 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin' });
      if (adminCount <= 1) {
        return next(
          new AppError('Cannot demote the only remaining Admin account.', 400)
        );
      }
    }

    user.role = role;
    await user.save();

    return successResponse(
      res,
      200,
      { user: user.toJSON() },
      `User role updated to ${role} successfully.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get platform-wide overview statistics (Admin only)
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      participantsCount,
      organizersCount,
      adminsCount,
      totalCompetitions,
      totalRegistrations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Participant' }),
      User.countDocuments({ role: 'Organizer' }),
      User.countDocuments({ role: 'Admin' }),
      Competition.countDocuments(),
      Registration.countDocuments(),
    ]);

    return successResponse(
      res,
      200,
      {
        users: {
          total: totalUsers,
          participants: participantsCount,
          organizers: organizersCount,
          admins: adminsCount,
        },
        competitions: {
          total: totalCompetitions,
        },
        registrations: {
          total: totalRegistrations,
        },
      },
      'Platform statistics retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * List all registrations across the platform (Admin only)
 */
const getAllRegistrations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [total, registrations] = await Promise.all([
      Registration.countDocuments(),
      Registration.find()
        .populate('userId', 'name email phoneNumber role')
        .populate('competitionId', 'title category lifecycleStatus organizer')
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return successResponse(
      res,
      200,
      {
        registrations,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      'All registrations retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  getPlatformStats,
  getAllRegistrations,
};
