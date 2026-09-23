const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const config = require('../config/env');

const JWT_SECRET = config.JWT_SECRET;

/**
 * Middleware: Strictly enforce JWT authentication.
 * Rejects requests without valid Bearer token with 401 Unauthorized.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Authentication token missing.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your session has expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid or corrupted authentication token.', 401));
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return next(new AppError('User account associated with this token no longer exists.', 401));
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Optional authentication.
 * If token is present, populates req.user; otherwise leaves req.user = null.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).lean();
      if (user) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        };
      } else {
        req.user = null;
      }
    } catch {
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Role-based authorization.
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access denied. Insufficient permissions.', 403));
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET,
};
