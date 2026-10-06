const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates JWT_SECRET security configuration.
 * Fails fast with descriptive Error in production if secret is missing, empty, or insecure.
 *
 * @param {string} secret - JWT secret candidate
 * @param {string} nodeEnv - Current NODE_ENV
 * @returns {boolean} true if valid
 * @throws {Error} if invalid in production
 */
const validateJwtSecret = (secret, nodeEnv = process.env.NODE_ENV) => {
  if (nodeEnv !== 'production') {
    return true;
  }

  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or empty in production.');
  }

  const trimmed = secret.trim();

  const INSECURE_DEFAULTS = [
    'development-secret-key-change-in-production',
    'test-jwt-secret-key-for-testing',
    'secret',
    'jwt_secret',
    'changeme',
    'your-secret-key',
    'password',
    '123456',
    'default',
  ];

  if (INSECURE_DEFAULTS.includes(trimmed.toLowerCase())) {
    throw new Error(
      'FATAL: Insecure default JWT_SECRET configured in production. You must set a unique, cryptographically secure secret.'
    );
  }

  if (trimmed.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be at least 32 characters long in production for HMAC-SHA256 security.'
    );
  }

  return true;
};

const config = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  CLIENT_URL: process.env.CLIENT_URL || '*',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000'],
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'test'
      ? 'test-jwt-secret-key-for-testing'
      : 'development-secret-key-change-in-production'),
};

// Application Startup Security Validations
validateJwtSecret(config.JWT_SECRET, config.NODE_ENV);

if (config.NODE_ENV !== 'test') {
  if (!config.MONGODB_URI) {
    console.warn(
      '[Config Warning] MONGODB_URI is not set. The standard server requires a valid MongoDB connection.\n' +
      'For standalone zero-config local development, run: npm run dev:standalone\n' +
      'For production, please set MONGODB_URI in your .env or platform environment variables.'
    );
  }
}

config.validateJwtSecret = validateJwtSecret;

module.exports = config;
