const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const { LIFECYCLE_STATUS, REGISTRATION_STATUS } = require('../constants/competitionStatus');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { provisionAdminUser } = require('../utils/adminProvisioner');

describe('Organizer Management APIs Test Suite', () => {
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  let creatorUser, creatorToken;
  let otherOrganizer, otherOrganizerToken;
  let participantUser, participantToken;
  let adminUser, adminToken;
  let testCompetition;

  const createTestCompetition = async (creatorId, overrides = {}) => {
    return Competition.create({
      title: 'DevOps Grand Championship 2026',
      description: 'Global infrastructure and cloud automation challenge.',
      category: 'Cloud',
      organizer: 'Cloud Engineering Alliance',
      createdBy: creatorId,
      registrationStartDate: subDays(now, 2),
      registrationDeadline: addDays(now, 5),
      startDate: addDays(now, 10),
      endDate: addDays(now, 15),
      totalSpots: 20,
      registeredCount: 0,
      ...overrides,
    });
  };

  beforeEach(async () => {
    // 1. Creator Organizer
    creatorUser = await User.create({
      name: 'Organizer Creator',
      email: `creator_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500001',
      password: 'password123',
      role: 'Organizer',
    });
    creatorToken = jwt.sign(
      { userId: creatorUser._id.toString(), email: creatorUser.email, role: 'Organizer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 2. Different Organizer (Not Owner)
    otherOrganizer = await User.create({
      name: 'Other Organizer',
      email: `other_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500002',
      password: 'password123',
      role: 'Organizer',
    });
    otherOrganizerToken = jwt.sign(
      { userId: otherOrganizer._id.toString(), email: otherOrganizer.email, role: 'Organizer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 3. Regular Participant
    participantUser = await User.create({
      name: 'Participant Sam',
      email: `participant_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500003',
      password: 'password123',
      role: 'Participant',
    });
    participantToken = jwt.sign(
      { userId: participantUser._id.toString(), email: participantUser.email, role: 'Participant' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Admin
    adminUser = await provisionAdminUser({
      name: 'Admin Supervisor',
      email: `admin_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500004',
      password: 'password123',
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), email: adminUser.email, role: 'Admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Base competition created by creatorUser
    testCompetition = await createTestCompetition(creatorUser._id);
  });

  // ==========================================
  // 1. AUTHENTICATION & OBJECTID VALIDATION
  // ==========================================
  describe('Authentication & ObjectId Validation', () => {
    test('M1. Rejects unauthenticated requests with 401 Unauthorized', async () => {
      const putRes = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .send({ title: 'New Title' });
      expect(putRes.status).toBe(401);

      const delRes = await request(app).delete(`/api/competitions/${testCompetition._id}`);
      expect(delRes.status).toBe(401);

      const rosterRes = await request(app).get(`/api/competitions/${testCompetition._id}/participants`);
      expect(rosterRes.status).toBe(401);
    });

    test('M2. Rejects invalid MongoDB ObjectId with 400 Bad Request', async () => {
      const putRes = await request(app)
        .put('/api/competitions/invalid-id-xyz')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'New Title' });
      expect(putRes.status).toBe(400);
      expect(putRes.body.message).toContain('Invalid id parameter');

      const delRes = await request(app)
        .delete('/api/competitions/invalid-id-xyz')
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(delRes.status).toBe(400);

      const rosterRes = await request(app)
        .get('/api/competitions/invalid-id-xyz/participants')
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(rosterRes.status).toBe(400);
    });

    test('M3. Returns 404 Not Found for non-existent competition ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const putRes = await request(app)
        .put(`/api/competitions/${nonExistentId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'Updated Title' });
      expect(putRes.status).toBe(404);

      const delRes = await request(app)
        .delete(`/api/competitions/${nonExistentId}`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(delRes.status).toBe(404);

      const rosterRes = await request(app)
        .get(`/api/competitions/${nonExistentId}/participants`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(rosterRes.status).toBe(404);
    });
  });

  // ==========================================
  // 2. AUTHORIZATION & OWNERSHIP ENFORCEMENT
  // ==========================================
  describe('Authorization & Ownership Enforcement', () => {
    test('M4. Denies (403) Participant from updating, deleting, or viewing roster', async () => {
      const putRes = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Hacked Title' });
      expect(putRes.status).toBe(403);
      expect(putRes.body.message).toContain('Access denied');

      const delRes = await request(app)
        .delete(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${participantToken}`);
      expect(delRes.status).toBe(403);

      const rosterRes = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants`)
        .set('Authorization', `Bearer ${participantToken}`);
      expect(rosterRes.status).toBe(403);
    });

    test('M5. Denies (403) a different Organizer who is not the creator', async () => {
      const putRes = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .send({ title: 'Stolen Event' });
      expect(putRes.status).toBe(403);
      expect(putRes.body.message).toContain('Access denied');

      const delRes = await request(app)
        .delete(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`);
      expect(delRes.status).toBe(403);

      const rosterRes = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`);
      expect(rosterRes.status).toBe(403);
    });

    test('M6. Allows Creator to update competition', async () => {
      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'DevOps Grand Championship 2026 - Updated',
          prizePool: '₹2,50,000 INR',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('DevOps Grand Championship 2026 - Updated');
      expect(res.body.data.prizePool).toBe('₹2,50,000 INR');
    });

    test('M7. Allows Admin to update any competition', async () => {
      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Overridden Title',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Overridden Title');
    });
  });

  // ==========================================
  // 3. UPDATE VALIDATION & IMMUTABILITY
  // ==========================================
  describe('PUT /api/competitions/:id Validation', () => {
    test('M8. Rejects empty payload with 400 Bad Request', async () => {
      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Update payload cannot be empty');
    });

    test('M9. Rejects invalid field lengths and invalid totalSpots', async () => {
      const shortTitle = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'ab' });
      expect(shortTitle.status).toBe(400);

      const invalidSpots = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ totalSpots: -10 });
      expect(invalidSpots.status).toBe(400);
    });

    test('M10. Rejects setting totalSpots lower than registeredCount', async () => {
      // Simulate 5 registrations
      testCompetition.registeredCount = 5;
      await testCompetition.save();

      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ totalSpots: 3 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be less than current registered count');
    });

    test('M11. Rejects chronologically invalid date updates', async () => {
      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          registrationDeadline: addDays(now, 12), // Deadline after startDate (day 10)
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('strictly before startDate');
    });

    test('M12. Preserves createdBy and ignores client attempts to reassign ownership', async () => {
      const forgedOwnerId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Legitimate Title Update',
          createdBy: forgedOwnerId, // Attacker tries to transfer ownership
        });

      expect(res.status).toBe(200);
      const dbComp = await Competition.findById(testCompetition._id);
      expect(dbComp.createdBy.toString()).toBe(creatorUser._id.toString());
      expect(dbComp.createdBy.toString()).not.toBe(forgedOwnerId.toString());
    });
  });

  // ==========================================
  // 4. DELETION & SAFE ARCHIVAL/CANCELLATION POLICY
  // ==========================================
  describe('DELETE /api/competitions/:id Deletion & Cancellation Policy', () => {
    test('M13. Hard deletes competition when zero registrations exist', async () => {
      const res = await request(app)
        .delete(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('DELETED');
      expect(res.body.data.deleted).toBe(true);

      const dbCheck = await Competition.findById(testCompetition._id);
      expect(dbCheck).toBeNull();
    });

    test('M14. Prevents hard deletion when active registrations exist; safely cancels & archives', async () => {
      // 1. Create a confirmed registration
      await Registration.create({
        userId: participantUser._id,
        competitionId: testCompetition._id,
        status: REGISTRATION_STATUS.CONFIRMED,
        participantDetails: {
          fullName: 'Participant Sam',
          email: participantUser.email,
          phone: participantUser.phoneNumber,
        },
      });
      testCompetition.registeredCount = 1;
      await testCompetition.save();

      // 2. Call DELETE endpoint
      const res = await request(app)
        .delete(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ cancellationReason: 'Unexpected scheduling conflict.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('CANCELLED');
      expect(res.body.data.archived).toBe(true);
      expect(res.body.message).toContain('safely cancelled and archived');

      // 3. Verify competition was NOT destroyed in MongoDB
      const dbComp = await Competition.findById(testCompetition._id);
      expect(dbComp).not.toBeNull();
      expect(dbComp.status).toBe(LIFECYCLE_STATUS.CANCELLED);
      expect(dbComp.isCancelled).toBe(true);
      expect(dbComp.isArchived).toBe(true);
      expect(dbComp.cancellationReason).toBe('Unexpected scheduling conflict.');

      // 4. Verify existing registrations were safely marked CANCELLED
      const dbReg = await Registration.findOne({
        userId: participantUser._id,
        competitionId: testCompetition._id,
      });
      expect(dbReg.status).toBe(REGISTRATION_STATUS.CANCELLED);
      expect(dbReg.cancelledAt).not.toBeNull();
    });

    test('M15. Rejects subsequent updates on cancelled competitions', async () => {
      testCompetition.isCancelled = true;
      testCompetition.status = LIFECYCLE_STATUS.CANCELLED;
      await testCompetition.save();

      const res = await request(app)
        .put(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ title: 'Trying to update cancelled event' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot update a cancelled competition');
    });

    test('M16. Allows Admin to safely delete/cancel competition with registrations', async () => {
      await Registration.create({
        userId: participantUser._id,
        competitionId: testCompetition._id,
        status: REGISTRATION_STATUS.CONFIRMED,
      });

      const res = await request(app)
        .delete(`/api/competitions/${testCompetition._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe('CANCELLED');
    });
  });

  // ==========================================
  // 5. PARTICIPANT ROSTER API (GET /api/competitions/:id/participants)
  // ==========================================
  describe('GET /api/competitions/:id/participants Roster', () => {
    beforeEach(async () => {
      // Register participantUser
      await Registration.create({
        userId: participantUser._id,
        competitionId: testCompetition._id,
        status: REGISTRATION_STATUS.CONFIRMED,
        participantDetails: {
          fullName: 'Participant Sam',
          email: participantUser.email,
          phone: participantUser.phoneNumber,
        },
      });
    });

    test('M17. Allows Creator to view participant roster with populated user data', async () => {
      const res = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.participants.length).toBe(1);

      const p = res.body.data.participants[0];
      expect(p.status).toBe(REGISTRATION_STATUS.CONFIRMED);
      expect(p.user.name).toBe('Participant Sam');
      expect(p.user.email).toBe(participantUser.email);
      expect(p.user.role).toBe('Participant');
    });

    test('M18. Allows Admin to view participant roster', async () => {
      const res = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    test('M19. Supports status filter on participant roster', async () => {
      // Query CONFIRMED
      const resConfirmed = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants?status=CONFIRMED`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(resConfirmed.body.data.total).toBe(1);

      // Query CANCELLED
      const resCancelled = await request(app)
        .get(`/api/competitions/${testCompetition._id}/participants?status=CANCELLED`)
        .set('Authorization', `Bearer ${creatorToken}`);
      expect(resCancelled.body.data.total).toBe(0);
    });
  });
});
