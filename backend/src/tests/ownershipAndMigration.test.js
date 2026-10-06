const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Competition = require('../models/Competition');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { auditLegacyCompetitions, migrateLegacyCompetitions } = require('../utils/migrationHelper');

describe('Competition Ownership and Legacy Migration Test Suite', () => {
  let sampleOrganizer;
  let organizerToken;
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    await Competition.deleteMany({});
    await User.deleteMany({});

    sampleOrganizer = await User.create({
      name: 'Organizer Alex',
      email: `alex_${Date.now()}@example.com`,
      phoneNumber: '+91 9123456780',
      password: 'securePassword123',
      role: 'Organizer',
    });

    organizerToken = jwt.sign(
      {
        userId: sampleOrganizer._id.toString(),
        email: sampleOrganizer.email,
        role: sampleOrganizer.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('1. Model Validation & Ownership Persistence', () => {
    test('O1. Rejects competition creation without createdBy field', async () => {
      let validationError = null;
      try {
        await Competition.create({
          title: 'Missing Owner Event',
          description: 'This competition has no createdBy',
          category: 'Technology',
          registrationStartDate: subDays(now, 1),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 4),
          endDate: addDays(now, 6),
          totalSpots: 20,
          // createdBy is omitted
        });
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors).toBeDefined();
      expect(validationError.errors.createdBy).toBeDefined();
    });

    test('O2. Successfully persists createdBy when valid user ID is provided', async () => {
      const comp = await Competition.create({
        title: 'Owned Event',
        description: 'This competition has a valid createdBy owner',
        category: 'Technology',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 20,
        createdBy: sampleOrganizer._id,
      });

      expect(comp._id).toBeDefined();
      expect(comp.createdBy.toString()).toBe(sampleOrganizer._id.toString());
      expect(comp.isLegacy).toBe(false);

      const dbRecord = await Competition.findById(comp._id);
      expect(dbRecord.createdBy.toString()).toBe(sampleOrganizer._id.toString());
    });
  });

  describe('2. API Creation Flow Binds Authenticated User ID', () => {
    test('O3. POST /api/competitions assigns authenticated user ID as createdBy', async () => {
      const payload = {
        title: 'Web Security Hackathon 2026',
        description: 'Build safe and secure web applications.',
        category: 'Security',
        organizer: 'Security Council',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 3),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 50,
      };

      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Web Security Hackathon 2026');
      expect(res.body.data.createdBy.toString()).toBe(sampleOrganizer._id.toString());

      // Verify in MongoDB
      const dbComp = await Competition.findById(res.body.data._id || res.body.data.id);
      expect(dbComp.createdBy.toString()).toBe(sampleOrganizer._id.toString());
    });

    test('O4. Ignores client-forged createdBy and enforces authenticated user ID', async () => {
      const fakeOwnerId = new mongoose.Types.ObjectId();
      const payload = {
        title: 'Spoof Attempt Event',
        description: 'Attempting to forge ownership',
        category: 'Security',
        organizer: 'Security Council',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 3),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 50,
        createdBy: fakeOwnerId, // Client forged owner
      };

      const res = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      // Must NOT be the fakeOwnerId; must be the authenticated user's ID
      expect(res.body.data.createdBy.toString()).toBe(sampleOrganizer._id.toString());
      expect(res.body.data.createdBy.toString()).not.toBe(fakeOwnerId.toString());
    });
  });

  describe('3. Legacy Record Audit & Safe Migration', () => {
    test('M1. Audits legacy competition records missing createdBy', async () => {
      // Direct collection insert to simulate legacy records created before schema migration
      await Competition.collection.insertMany([
        {
          title: 'Legacy Hackathon 1',
          description: 'Created before createdBy field was added',
          category: 'General',
          organizer: 'Legacy Org',
          registrationStartDate: subDays(now, 5),
          registrationDeadline: subDays(now, 2),
          startDate: addDays(now, 1),
          endDate: addDays(now, 3),
          totalSpots: 30,
          registeredCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'Legacy Hackathon 2',
          description: 'Another legacy record without owner',
          category: 'General',
          organizer: 'Legacy Org',
          registrationStartDate: subDays(now, 5),
          registrationDeadline: subDays(now, 2),
          startDate: addDays(now, 1),
          endDate: addDays(now, 3),
          totalSpots: 40,
          registeredCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Also create 1 valid modern competition
      await Competition.create({
        title: 'Modern Event',
        description: 'Modern event with owner',
        category: 'Technology',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 20,
        createdBy: sampleOrganizer._id,
      });

      const audit = await auditLegacyCompetitions();
      expect(audit.totalRecords).toBe(3);
      expect(audit.legacyCount).toBe(2);
      expect(audit.validCount).toBe(1);
      expect(audit.legacyCompetitions.length).toBe(2);
    });

    test('M2. Safely migrates legacy records without inventing false owners', async () => {
      // Insert legacy record
      const insertResult = await Competition.collection.insertOne({
        title: 'Unclaimed Legacy Event',
        description: 'Legacy event awaiting migration',
        category: 'General',
        organizer: 'Original Organizer',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 25,
        registeredCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const legacyId = insertResult.insertedId;

      // Run migration
      const migrationResult = await migrateLegacyCompetitions();
      expect(migrationResult.migratedCount).toBe(1);

      // Verify the legacy record in DB
      const migratedComp = await Competition.findById(legacyId).lean();
      expect(migratedComp.isLegacy).toBe(true);
      expect(migratedComp.legacyOwnerUnassigned).toBe(true);
      // No fake owner was invented
      expect(migratedComp.createdBy).toBeUndefined();

      // Subsequent migration run detects database is already clean
      const secondRun = await migrateLegacyCompetitions();
      expect(secondRun.migratedCount).toBe(0);
    });

    test('M3. Handles legacy records explicitly via API without error', async () => {
      const insertResult = await Competition.collection.insertOne({
        title: 'Legacy Event for API Read',
        description: 'Testing API read for unmigrated record',
        category: 'Technology',
        organizer: 'Old Org',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 15,
        registeredCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const compId = insertResult.insertedId;

      // Fetch via GET /api/competitions/:id
      const res = await request(app).get(`/api/competitions/${compId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Legacy Event for API Read');
      // Handled explicitly: createdBy is null, isLegacy is true
      expect(res.body.data.createdBy).toBeNull();
      expect(res.body.data.isLegacy).toBe(true);
    });
  });
});
