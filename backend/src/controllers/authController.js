const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const signup = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, password, confirmPassword, role } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim() || name.trim().length < 2) {
      return next(new AppError('Full name is required (minimum 2 characters).', 400));
    }
    if (!email || !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return next(new AppError('A valid email address is required.', 400));
    }
    if (!phoneNumber || !phoneNumber.trim() || phoneNumber.trim().length < 7) {
      return next(new AppError('A valid phone number is required (minimum 7 digits).', 400));
    }
    if (!password || password.length < 6) {
      return next(new AppError('Password is required (minimum 6 characters).', 400));
    }
    if (password !== confirmPassword) {
      return next(new AppError('Passwords do not match.', 400));
    }

    // Role-based validation
    let userRole = 'Participant';
    if (role !== undefined && role !== null && String(role).trim() !== '') {
      const cleanRole = String(role).trim();
      const lower = cleanRole.toLowerCase();

      // Never allow public signup to assign the Admin role
      if (lower === 'admin') {
        return next(
          new AppError(
            'The Admin role cannot be assigned through public registration. Admin accounts must be provisioned through a trusted administrative process.',
            403
          )
        );
      }

      if (lower === 'organizer') {
        userRole = 'Organizer';
      } else if (lower === 'participant') {
        userRole = 'Participant';
      } else {
        return next(
          new AppError(
            `Invalid role "${cleanRole}". Public registration permits "Participant" or "Organizer".`,
            400
          )
        );
      }
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Prevent duplicate accounts
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return next(new AppError('An account with this email address already exists. Please log in.', 409));
    }

    // 3. Create user (password is automatically hashed by pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phoneNumber: phoneNumber.trim(),
      password,
      role: userRole,
    });

    const token = generateToken(user);

    return successResponse(
      res,
      201,
      {
        token,
        user: user.toJSON(),
      },
      'Account created successfully.'
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email address and password are required.', 400));
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Select password explicitly since select: false in schema
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const isMatch = await user.comparePassword(String(password));
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = generateToken(user);

    return successResponse(
      res,
      200,
      {
        token,
        user: user.toJSON(),
      },
      'Logged in successfully.'
    );
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User profile not found.', 404));
    }

    return successResponse(res, 200, { user: user.toJSON() }, 'Profile retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phoneNumber, college, organization, experienceLevel } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User profile not found.', 404));
    }

    if (name && name.trim()) {
      if (name.trim().length < 2) {
        return next(new AppError('Full name must be at least 2 characters.', 400));
      }
      user.name = name.trim();
    }

    if (phoneNumber && phoneNumber.trim()) {
      if (phoneNumber.trim().length < 7) {
        return next(new AppError('Phone number must be at least 7 digits.', 400));
      }
      user.phoneNumber = phoneNumber.trim();
    }

    if (college !== undefined) {
      user.college = (college || '').trim();
    }

    if (organization !== undefined) {
      user.organization = (organization || '').trim();
    }

    if (experienceLevel !== undefined) {
      user.experienceLevel = (experienceLevel || '').trim();
    }

    await user.save();

    return successResponse(res, 200, { user: user.toJSON() }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
};
