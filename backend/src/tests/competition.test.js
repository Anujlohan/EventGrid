const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const { LIFECYCLE_STATUS } = require('../constants/competitionStatus');
const { JWT_SECRET } = require('../middleware/authMiddleware');

describe('Production Authentication & Competition Test Suite', () => {
  let sampleUser;
  let sampleToken;
  let sampleUser2;
  let sampleToken2;
  const now = new Date();

  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    sampleUser = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phoneNumber: '+91 9876543210',
      password: 'securePassword123',
    });

    sampleToken = jwt.sign(
      { userId: sampleUser._id.toString(), email: sampleUser.email, role: sampleUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    sampleUser2 = await User.create({
      name: 'Diya Patel',
      email: 'diya.patel@example.com',
      phoneNumber: '+91 9876543211',
      password: 'securePassword123',
    });

    sampleToken2 = jwt.sign(
      { userId: sampleUser2._id.toString(), email: sampleUser2.email, role: sampleUser2.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  // ==========================================
  // AUTHENTICATION & SECURITY TESTS
  // ==========================================
  describe('Authentication & Security (/api/auth)', () => {
    test('A1. POST /api/auth/signup creates account with hashed password and returns JWT', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Aarav Gupta',
        email: 'aarav.gupta@example.com',
        phoneNumber: '+91 9123456789',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.name).toBe('Aarav Gupta');
      expect(res.body.data.user.email).toBe('aarav.gupta@example.com');
      expect(res.body.data.user.password).toBeUndefined(); // Never expose password

      // Verify in DB that password was hashed with bcrypt
      const dbUser = await User.findOne({ email: 'aarav.gupta@example.com' }).select('+password');
      expect(dbUser.password).not.toBe('password123');
      expect(dbUser.password.startsWith('$2')).toBe(true);
    });

    test('A2. POST /api/auth/signup rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Duplicate Rohan',
        email: 'rohan.sharma@example.com', // Already registered in beforeEach
        phoneNumber: '+91 9999999999',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    test('A3. POST /api/auth/signup validates weak password and mismatched confirmPassword', async () => {
      // Weak password
      const res1 = await request(app).post('/api/auth/signup').send({
        name: 'Test Weak',
        email: 'weak@example.com',
        phoneNumber: '+91 9876543210',
        password: '123',
        confirmPassword: '123',
      });
      expect(res1.status).toBe(400);

      // Mismatched passwords
      const res2 = await request(app).post('/api/auth/signup').send({
        name: 'Test Mismatch',
        email: 'mismatch@example.com',
        phoneNumber: '+91 9876543210',
        password: 'password123',
        confirmPassword: 'differentPassword',
      });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('do not match');
    });

    test('A4. POST /api/auth/login authenticates valid credentials and returns JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'rohan.sharma@example.com',
        password: 'securePassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('rohan.sharma@example.com');
    });

    test('A5. POST /api/auth/login rejects wrong password with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'rohan.sharma@example.com',
        password: 'incorrectPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    test('A6. GET /api/auth/me returns authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Rohan Sharma');
      expect(res.body.data.user.email).toBe('rohan.sharma@example.com');
    });

    test('A7. Protected endpoints reject requests without token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    test('A8. PUT /api/auth/profile updates profile details', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({
          name: 'Rohan Updated',
          phoneNumber: '+91 9988776655',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Rohan Updated');
      expect(res.body.data.user.phoneNumber).toBe('+91 9988776655');

      const updatedDbUser = await User.findById(sampleUser._id);
      expect(updatedDbUser.name).toBe('Rohan Updated');
    });
  });

  // ==========================================
  // COMPETITION BROWSING & DETAILS
  // ==========================================
  describe('Competitions API (/api/competitions)', () => {
    test('1. GET /api/competitions returns 200 and paginated list with dynamic lifecycle', async () => {
      await Competition.create({
        title: 'AI Championship',
        description: 'Build scalable AI solutions',
        category: 'Hackathon',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 3),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 10,
        registeredCount: 0,
      });

      const res = await request(app).get('/api/competitions');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.competitions.length).toBe(1);
      expect(res.body.data.competitions[0].lifecycleStatus).toBe(LIFECYCLE_STATUS.REGISTRATION_OPEN);
      expect(res.body.data.competitions[0].remainingSpots).toBe(10);
    });

    test('2. GET /api/competitions/:id returns 200 and checks registration for authenticated user', async () => {
      const comp = await Competition.create({
        title: 'Cloud Sprint',
        description: 'System design sprint',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 5,
        registeredCount: 1,
      });

      const res = await request(app)
        .get(`/api/competitions/${comp._id}`)
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Cloud Sprint');
      expect(res.body.data.remainingSpots).toBe(4);
      expect(res.body.data.userRegistration).toEqual({ isRegistered: false, registration: null });
    });

    test('3. Invalid MongoDB ObjectId returns 400 Bad Request', async () => {
      const res = await request(app).get('/api/competitions/invalid-id-123');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid id parameter');
    });

    test('4. Nonexistent competition ID returns 404 Not Found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/competitions/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('5. POST /api/competitions requires authentication and creates genuine event', async () => {
      const newCompData = {
        title: 'Full-Stack Hackathon 2026',
        description: 'Engineering competition with real backend and mobile clients.',
        category: 'Development',
        organizer: 'Engineering Guild',
        location: { venue: 'Virtual Arena', city: 'Online', type: 'Online' },
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 3),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 30,
        entryFee: 'Free',
        prizePool: '$10,000 USD',
        rules: ['Original code only.'],
        customRegistrationFields: [
          { fieldName: 'collegeName', label: 'College / University', required: true, type: 'text' },
        ],
      };

      // Unauthenticated fails
      const unauthRes = await request(app).post('/api/competitions').send(newCompData);
      expect(unauthRes.status).toBe(401);

      // Authenticated succeeds
      const authRes = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${sampleToken}`)
        .send(newCompData);

      expect(authRes.status).toBe(201);
      expect(authRes.body.data.title).toBe('Full-Stack Hackathon 2026');
      expect(authRes.body.data.customRegistrationFields.length).toBe(1);
    });
  });

  // ==========================================
  // REGISTRATION & CONCURRENCY-SAFE TRANSACTIONS
  // ==========================================
  describe('Competition Registration & Cancellation (/api/competitions/:id/register)', () => {
    test('6. POST /api/competitions/:id/register automatically binds to JWT user and reserves spot', async () => {
      const comp = await Competition.create({
        title: 'React Native Summit',
        description: 'Mobile performance challenge',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 5,
        registeredCount: 0,
      });

      const res = await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({
          participantDetails: {
            fullName: 'Rohan Sharma',
            email: 'rohan.sharma@example.com',
            phone: '+91 9876543210',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.userId.toString()).toBe(sampleUser._id.toString());
      expect(res.body.data.registration.participantDetails.fullName).toBe('Rohan Sharma');

      // Verify spot count incremented in DB
      const updatedComp = await Competition.findById(comp._id);
      expect(updatedComp.registeredCount).toBe(1);
    });

    test('7. Duplicate registration attempt for same user is rejected with 409 Conflict', async () => {
      const comp = await Competition.create({
        title: 'Single Seat Test',
        description: 'Only once per user',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 5,
        registeredCount: 0,
      });

      // First registration succeeds
      await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({ participantDetails: { fullName: 'Rohan Sharma', email: 'rohan@example.com', phone: '9876543210' } });

      // Second registration fails
      const duplicateRes = await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({ participantDetails: { fullName: 'Rohan Sharma', email: 'rohan@example.com', phone: '9876543210' } });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.message).toContain('already registered');
    });

    test('8. Full competition returns 409 Conflict and rejects further registrations', async () => {
      const comp = await Competition.create({
        title: 'Full House Challenge',
        description: 'Zero spots remaining',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 1,
        registeredCount: 1, // Already full
      });

      const res = await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({ participantDetails: { fullName: 'Rohan Sharma', email: 'rohan@example.com', phone: '9876543210' } });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Competition is full');
    });

    test('9. Required custom registration fields are strictly enforced', async () => {
      const comp = await Competition.create({
        title: 'Custom Field Event',
        description: 'Requires university name',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 5,
        registeredCount: 0,
        customRegistrationFields: [
          { fieldName: 'university', label: 'University Name', required: true, type: 'text' },
        ],
      });

      // Missing custom field fails
      const resFail = await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({
          participantDetails: {
            fullName: 'Rohan Sharma',
            email: 'rohan@example.com',
            phone: '9876543210',
            customFields: {},
          },
        });

      expect(resFail.status).toBe(400);
      expect(resFail.body.message).toContain('University Name');

      // With custom field succeeds
      const resSuccess = await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({
          participantDetails: {
            fullName: 'Rohan Sharma',
            email: 'rohan@example.com',
            phone: '9876543210',
            customFields: { university: 'IIT Delhi' },
          },
        });

      expect(resSuccess.status).toBe(201);
    });

    test('10. Pre-start cancellation releases spot atomically; post-start cancellation rejected', async () => {
      const comp = await Competition.create({
        title: 'Cancellable Event',
        description: 'Spot can be cancelled before event starts',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 1),
        startDate: addDays(now, 3), // Starts in future
        endDate: addDays(now, 5),
        totalSpots: 5,
        registeredCount: 0,
      });

      // Register first
      await request(app)
        .post(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`)
        .send({ participantDetails: { fullName: 'Rohan Sharma', email: 'rohan@example.com', phone: '9876543210' } });

      let inDb = await Competition.findById(comp._id);
      expect(inDb.registeredCount).toBe(1);

      // Cancel registration
      const cancelRes = await request(app)
        .delete(`/api/competitions/${comp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      inDb = await Competition.findById(comp._id);
      expect(inDb.registeredCount).toBe(0); // Spot restored!

      // Post-start cancellation rejection
      const liveComp = await Competition.create({
        title: 'Live Event',
        description: 'Cannot cancel after start',
        registrationStartDate: subDays(now, 5),
        registrationDeadline: subDays(now, 2),
        startDate: subDays(now, 1), // Already started!
        endDate: addDays(now, 2),
        totalSpots: 5,
        registeredCount: 1,
      });

      await Registration.create({
        competitionId: liveComp._id,
        userId: sampleUser._id,
        status: 'CONFIRMED',
      });

      const liveCancelRes = await request(app)
        .delete(`/api/competitions/${liveComp._id}/register`)
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(liveCancelRes.status).toBe(400);
      expect(liveCancelRes.body.message).toContain('after the competition has started');
    });

    test('11. GET /api/competitions/registrations/my returns only authenticated user registrations', async () => {
      const comp1 = await Competition.create({
        title: 'User 1 Event',
        description: 'Test event 1',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 10,
        registeredCount: 1,
      });

      const comp2 = await Competition.create({
        title: 'User 2 Event',
        description: 'Test event 2',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 10,
        registeredCount: 1,
      });

      // Register user 1 for comp 1
      await Registration.create({
        competitionId: comp1._id,
        userId: sampleUser._id,
        status: 'CONFIRMED',
        participantDetails: { fullName: 'Rohan Sharma', email: 'rohan@example.com', phone: '9876543210' },
      });

      // Register user 2 for comp 2
      await Registration.create({
        competitionId: comp2._id,
        userId: sampleUser2._id,
        status: 'CONFIRMED',
        participantDetails: { fullName: 'Diya Patel', email: 'diya@example.com', phone: '9876543211' },
      });

      // Fetch registrations for user 1 via JWT
      const res = await request(app)
        .get('/api/competitions/registrations/my')
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].competitionTitle).toBe('User 1 Event');
    });
  });
});
