const rateLimit = require('express-rate-limit');

/**
 * Factory to create custom rate limiters with standardized JSON response
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    limit,
    max,
    message = 'Too many requests. Please try again later.',
    ...rest
  } = options;

  return rateLimit({
    windowMs,
    limit: limit !== undefined ? limit : (max !== undefined ? max : 100),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        status: 'fail',
        message,
      });
    },
    ...rest,
  });
};

/**
 * General API Rate Limiter
 * Applied across all /api endpoints.
 * Standard: 200 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => {
    if (process.env.RATE_LIMIT_API_MAX) {
      return parseInt(process.env.RATE_LIMIT_API_MAX, 10);
    }
    return process.env.NODE_ENV === 'test' ? 2000 : 200;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      status: 'fail',
      message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    });
  },
});

/**
 * Strict Authentication Rate Limiter
 * Applied specifically to sensitive auth endpoints (/api/auth/signup, /api/auth/login).
 * Standard: 15 requests per 15-minute window per IP to prevent brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => {
    if (process.env.RATE_LIMIT_AUTH_MAX) {
      return parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10);
    }
    return process.env.NODE_ENV === 'test' ? 100 : 15;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      status: 'fail',
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  createRateLimiter,
};
