const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  CLIENT_URL: process.env.CLIENT_URL || '*',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000'],
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret-key-for-testing' : 'development-secret-key-change-in-production'),
};

// Fail fast in production or normal development if MONGODB_URI is missing
if (config.NODE_ENV !== 'test') {
  if (!config.MONGODB_URI) {
    console.warn(
      '[Config Warning] MONGODB_URI is not set. The standard server requires a valid MongoDB connection.\n' +
      'For standalone zero-config local development, run: npm run dev:standalone\n' +
      'For production, please set MONGODB_URI in your .env or platform environment variables.'
    );
  }
  if (config.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'development-secret-key-change-in-production')) {
    console.warn('[Config Warning] JWT_SECRET must be set to a secure secret in production via environment variables.');
  }
}

module.exports = config;
