const request = require('supertest');
const express = require('express');
const app = require('../app');
const { validateJwtSecret } = require('../config/env');
const { createRateLimiter, authLimiter, apiLimiter } = require('../middleware/rateLimiter');

describe('Backend Security Hardening Test Suite', () => {
  // ==========================================
  // 1. HELMET SECURITY HEADERS TESTS
  // ==========================================
  describe('1. Helmet Security Headers', () => {
    test('H1. Responses include standard HTTP security headers set by Helmet', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);

      // Verify essential Helmet security headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-download-options']).toBe('noopen');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');

      // Ensure X-Powered-By is hidden/removed
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('H2. Security headers are present on 404 and error responses as well', async () => {
      const res = await request(app).get('/api/non-existent-endpoint');

      expect(res.status).toBe(404);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ==========================================
  // 2. RATE LIMITING TESTS
  // ==========================================
  describe('2. Rate Limiting Middleware', () => {
    test('R1. API requests include standard RateLimit headers', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    test('R2. General Rate Limiter blocks excessive requests with 429 status', async () => {
      const testApp = express();
      const strictLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        limit: 3,
        message: 'Rate limit exceeded for test.',
      });

      testApp.use(strictLimiter);
      testApp.get('/test-limit', (req, res) => res.json({ ok: true }));

      // 3 successful requests
      for (let i = 0; i < 3; i++) {
        const res = await request(testApp).get('/test-limit');
        expect(res.status).toBe(200);
      }

      // 4th request must be rejected with 429 Too Many Requests
      const resBlocked = await request(testApp).get('/test-limit');
      expect(resBlocked.status).toBe(429);
      expect(resBlocked.body.success).toBe(false);
      expect(resBlocked.body.message).toContain('Rate limit exceeded');
    });

    test('R3. Strict Auth Rate Limiter blocks brute-force login attempts with 429 status', async () => {
      const testApp = express();
      testApp.use(express.json());

      const strictAuthLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        limit: 2,
        message: 'Too many authentication attempts. Please try again later.',
      });

      testApp.post('/login', strictAuthLimiter, (req, res) => res.json({ success: true }));

      // Request 1 & 2 succeed
      const res1 = await request(testApp).post('/login').send({ email: 'test@example.com' });
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).post('/login').send({ email: 'test@example.com' });
      expect(res2.status).toBe(200);

      // Request 3 is blocked by strict auth rate limiter
      const res3 = await request(testApp).post('/login').send({ email: 'test@example.com' });
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.message).toContain('Too many authentication attempts');
    });

    test('R4. Live /api/auth routes are wired with strict auth rate limiting headers', async () => {
      // Temporarily set auth limit to 2 for testing live route
      process.env.RATE_LIMIT_AUTH_MAX = '2';

      try {
        const testEmail = `ratelimit_${Date.now()}@example.com`;

        // Attempt 1: bad credentials (401, but passes rate limiter)
        const res1 = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'wrongpassword' });
        expect(res1.status).toBe(401);

        // Attempt 2: bad credentials (401)
        const res2 = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'wrongpassword' });
        expect(res2.status).toBe(401);

        // Attempt 3: blocked by auth rate limiter (429)
        const res3 = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'wrongpassword' });
        expect(res3.status).toBe(429);
        expect(res3.body.success).toBe(false);
        expect(res3.body.message).toContain('Too many authentication attempts');
      } finally {
        delete process.env.RATE_LIMIT_AUTH_MAX;
      }
    });
  });

  // ==========================================
  // 3. JWT_SECRET STARTUP VALIDATION TESTS
  // ==========================================
  describe('3. JWT_SECRET Environment Validation', () => {
    test('J1. Fails immediately in production when JWT_SECRET is missing or empty', () => {
      expect(() => validateJwtSecret(undefined, 'production')).toThrow(
        /JWT_SECRET environment variable is missing or empty/
      );
      expect(() => validateJwtSecret('', 'production')).toThrow(
        /JWT_SECRET environment variable is missing or empty/
      );
      expect(() => validateJwtSecret('    ', 'production')).toThrow(
        /JWT_SECRET environment variable is missing or empty/
      );
    });

    test('J2. Fails immediately in production when JWT_SECRET uses known insecure default', () => {
      expect(() =>
        validateJwtSecret('development-secret-key-change-in-production', 'production')
      ).toThrow(/Insecure default JWT_SECRET configured in production/);

      expect(() => validateJwtSecret('secret', 'production')).toThrow(
        /Insecure default JWT_SECRET configured in production/
      );

      expect(() => validateJwtSecret('changeme', 'production')).toThrow(
        /Insecure default JWT_SECRET configured in production/
      );
    });

    test('J3. Fails immediately in production when JWT_SECRET is too short (< 32 characters)', () => {
      expect(() => validateJwtSecret('short-secret-key-12345', 'production')).toThrow(
        /JWT_SECRET must be at least 32 characters long in production/
      );
    });

    test('J4. Accepts cryptographically secure JWT_SECRET (>= 32 characters) in production', () => {
      const secureSecret = 'a-very-long-and-secure-random-secret-key-for-prod-2026!';
      expect(validateJwtSecret(secureSecret, 'production')).toBe(true);
    });

    test('J5. Permits development and test environments to run without production constraints', () => {
      expect(validateJwtSecret('dev-secret', 'development')).toBe(true);
      expect(validateJwtSecret('test-secret', 'test')).toBe(true);
      expect(validateJwtSecret(undefined, 'development')).toBe(true);
    });
  });
});
