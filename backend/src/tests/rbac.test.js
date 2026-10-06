const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Competition = require('../models/Competition');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { provisionAdminUser } = require('../utils/adminProvisioner');

describe('Role-Based Access Control (RBAC) & Security Test Suite', () => {
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  const getValidCompetitionPayload = (overrides = {}) => ({
    title: 'RBAC Hackathon 2026',
    description: 'A competition demonstrating role authorization.',
    category: 'Cybersecurity',
    organizer: 'Security Team',
    location: { venue: 'Tech Hub', city: 'Bangalore', type: 'In-person' },
    registrationStartDate: subDays(now, 1),
    registrationDeadline: addDays(now, 3),
    startDate: addDays(now, 5),
    endDate: addDays(now, 7),
    totalSpots: 40,
    entryFee: 'Free',
    prizePool: '₹1,00,000',
    ...overrides,
  });

  // ==========================================
  // 1. PUBLIC SIGNUP & ROLE VALIDATION
  // ==========================================
  describe('Public Signup Role Validation (/api/auth/signup)', () => {
    test('R1. Signup defaults to Participant role when role is omitted', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Default User',
        email: 'default_role@example.com',
        phoneNumber: '+91 9000000001',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('Participant');

      const dbUser = await User.findOne({ email: 'default_role@example.com' });
      expect(dbUser.role).toBe('Participant');
    });

    test('R2. Signup accepts explicit Participant role', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Explicit Participant',
        email: 'participant_explicit@example.com',
        phoneNumber: '+91 9000000002',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'Participant',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('Participant');

      const dbUser = await User.findOne({ email: 'participant_explicit@example.com' });
      expect(dbUser.role).toBe('Participant');
    });

    test('R3. Signup accepts explicit Organizer role', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Organizer Maya',
        email: 'organizer_maya@example.com',
        phoneNumber: '+91 9000000003',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'Organizer',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('Organizer');

      const dbUser = await User.findOne({ email: 'organizer_maya@example.com' });
      expect(dbUser.role).toBe('Organizer');
    });

    test('R4. Rejects privilege escalation attempt to register as Admin with 403 Forbidden', async () => {
      const attempts = ['Admin', 'admin', 'ADMIN', ' Admin '];

      for (const roleAttempt of attempts) {
        const email = `attacker_${Math.random().toString(36).substring(7)}@example.com`;
        const res = await request(app).post('/api/auth/signup').send({
          name: 'Privilege Escalation Attacker',
          email,
          phoneNumber: '+91 9000000004',
          password: 'password123',
          confirmPassword: 'password123',
          role: roleAttempt,
        });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Admin role cannot be assigned through public registration');

        // Confirm user was NEVER created in the database
        const dbUser = await User.findOne({ email });
        expect(dbUser).toBeNull();
      }
    });

    test('R5. Rejects arbitrary/invalid role strings with 400 Bad Request', async () => {
      const invalidRoles = ['SuperUser', 'Root', 'Manager', 'Hacker', 'Moderator'];

      for (const invalidRole of invalidRoles) {
        const res = await request(app).post('/api/auth/signup').send({
          name: 'Invalid Role Tester',
          email: `invalid_${Math.random().toString(36).substring(7)}@example.com`,
          phoneNumber: '+91 9000000005',
          password: 'password123',
          confirmPassword: 'password123',
          role: invalidRole,
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Public registration permits "Participant" or "Organizer"');
      }
    });
  });

  // ==========================================
  // 2. TRUSTED ADMINISTRATIVE PROVISIONING
  // ==========================================
  describe('Trusted Admin Provisioning', () => {
    test('R6. Trusted administrative process successfully provisions Admin account', async () => {
      const adminData = {
        name: 'Chief Admin Officer',
        email: 'chief_admin@eventgrid.internal',
        phoneNumber: '+91 9999990001',
        password: 'SuperAdminSecretKey123!',
        organization: 'EventGrid Core Operations',
      };

      const adminUser = await provisionAdminUser(adminData);
      expect(adminUser._id).toBeDefined();
      expect(adminUser.role).toBe('Admin');
      expect(adminUser.name).toBe('Chief Admin Officer');
      expect(adminUser.email).toBe('chief_admin@eventgrid.internal');
      expect(adminUser.password).toBeUndefined();

      // Check DB persistence and password hashing
      const dbAdmin = await User.findById(adminUser._id).select('+password');
      expect(dbAdmin.role).toBe('Admin');
      expect(dbAdmin.password).not.toBe('SuperAdminSecretKey123!');
      expect(dbAdmin.password.startsWith('$2')).toBe(true);

      // Verify admin can log in normally via standard login endpoint
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'chief_admin@eventgrid.internal',
        password: 'SuperAdminSecretKey123!',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('Admin');
    });

    test('R7. Trusted administrative process validates input and rejects duplicate email', async () => {
      const adminData = {
        name: 'Duplicate Admin',
        email: 'duplicate_admin@eventgrid.internal',
        phoneNumber: '+91 9999990002',
        password: 'anotherPassword123',
      };

      await provisionAdminUser(adminData);
      await expect(provisionAdminUser(adminData)).rejects.toThrow('already exists');
    });
  });

  // ==========================================
  // 3. COMPETITION CREATION RBAC (POST /api/competitions)
  // ==========================================
  describe('Competition Creation RBAC (POST /api/competitions)', () => {
    let participantToken;
    let participantUser;
    let organizerToken;
    let organizerUser;
    let adminToken;
    let adminUser;

    beforeEach(async () => {
      // 1. Participant
      participantUser = await User.create({
        name: 'Regular Participant',
        email: `participant_${Date.now()}@test.com`,
        phoneNumber: '+91 9888800001',
        password: 'password123',
        role: 'Participant',
      });
      participantToken = jwt.sign(
        { userId: participantUser._id.toString(), email: participantUser.email, role: 'Participant' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 2. Organizer
      organizerUser = await User.create({
        name: 'Verified Organizer',
        email: `organizer_${Date.now()}@test.com`,
        phoneNumber: '+91 9888800002',
        password: 'password123',
        role: 'Organizer',
      });
      organizerToken = jwt.sign(
        { userId: organizerUser._id.toString(), email: organizerUser.email, role: 'Organizer' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 3. Admin (via provisioner)
      adminUser = await provisionAdminUser({
        name: 'System Admin',
        email: `admin_${Date.now()}@test.com`,
        phoneNumber: '+91 9888800003',
        password: 'adminPassword123',
      });
      adminToken = jwt.sign(
        { userId: adminUser._id.toString(), email: adminUser.email, role: 'Admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    test('R8. Unauthenticated requests to POST /api/competitions return 401', async () => {
      const res = await request(app)
        .post('/api/competitions')
        .send(getValidCompetitionPayload({ title: 'Unauth Event' }));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });

    test('R9. Requests with malformed or invalid JWT return 401', async () => {
      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', 'Bearer invalid.token.value')
        .send(getValidCompetitionPayload({ title: 'Bad Token Event' }));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('R10. Participant is forbidden (403) from creating a competition', async () => {
      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${participantToken}`)
        .send(getValidCompetitionPayload({ title: 'Participant Illegal Comp' }));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');

      // Confirm no competition was created
      const count = await Competition.countDocuments({ title: 'Participant Illegal Comp' });
      expect(count).toBe(0);
    });

    test('R11. Organizer is permitted (201) to create a competition with createdBy bound', async () => {
      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(getValidCompetitionPayload({ title: 'Organizer Comp 2026' }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Organizer Comp 2026');
      expect(res.body.data.createdBy.toString()).toBe(organizerUser._id.toString());

      const dbComp = await Competition.findById(res.body.data._id);
      expect(dbComp).not.toBeNull();
      expect(dbComp.createdBy.toString()).toBe(organizerUser._id.toString());
    });

    test('R12. Admin is permitted (201) to create a competition with createdBy bound', async () => {
      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(getValidCompetitionPayload({ title: 'Admin Master Comp 2026' }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Master Comp 2026');
      expect(res.body.data.createdBy.toString()).toBe(adminUser._id.toString());

      const dbComp = await Competition.findById(res.body.data._id);
      expect(dbComp).not.toBeNull();
      expect(dbComp.createdBy.toString()).toBe(adminUser._id.toString());
    });

    test('R13. Defends against JWT role tampering: DB role is source of truth', async () => {
      // Attacker has Participant account in DB, but creates forged JWT with role: 'Admin'
      const forgedToken = jwt.sign(
        { userId: participantUser._id.toString(), email: participantUser.email, role: 'Admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${forgedToken}`)
        .send(getValidCompetitionPayload({ title: 'Forged Role Exploit Event' }));

      // Because authenticateToken fetches the user from DB (where role is Participant),
      // requireRole('Organizer', 'Admin') rejects with 403 Forbidden!
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');

      const count = await Competition.countDocuments({ title: 'Forged Role Exploit Event' });
      expect(count).toBe(0);
    });
  });

  // ==========================================
  // 4. EXISTING AUTHENTICATION FLOWS PRESERVATION
  // ==========================================
  describe('Preservation of Existing Auth Flows', () => {
    test('R14. Standard login generates valid token and returns correct user payload', async () => {
      await User.create({
        name: 'Standard User',
        email: 'standard@example.com',
        phoneNumber: '+91 9777700001',
        password: 'validPassword123',
        role: 'Participant',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'standard@example.com',
        password: 'validPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('standard@example.com');
      expect(res.body.data.user.role).toBe('Participant');
    });

    test('R15. GET /api/auth/me returns current user profile with role', async () => {
      const user = await User.create({
        name: 'Profile Tester',
        email: 'profile_test@example.com',
        phoneNumber: '+91 9777700002',
        password: 'validPassword123',
        role: 'Organizer',
      });

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Profile Tester');
      expect(res.body.data.user.role).toBe('Organizer');
    });
  });
});
