const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { REGISTRATION_STATUS, LIFECYCLE_STATUS } = require('../constants/competitionStatus');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { provisionAdminUser } = require('../utils/adminProvisioner');

describe('Waitlists & In-App Notifications Test Suite', () => {
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  let organizerUser, organizerToken;
  let participant1, token1;
  let participant2, token2;
  let participant3, token3;
  let competition;

  beforeEach(async () => {
    // 1. Organizer
    organizerUser = await User.create({
      name: 'Organizer Priya',
      email: `organizer_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500010',
      password: 'password123',
      role: 'Organizer',
    });
    organizerToken = jwt.sign(
      { userId: organizerUser._id.toString(), email: organizerUser.email, role: 'Organizer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 2. Participant 1
    participant1 = await User.create({
      name: 'Participant One',
      email: `part1_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500011',
      password: 'password123',
      role: 'Participant',
    });
    token1 = jwt.sign(
      { userId: participant1._id.toString(), email: participant1.email, role: 'Participant' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 3. Participant 2
    participant2 = await User.create({
      name: 'Participant Two',
      email: `part2_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500012',
      password: 'password123',
      role: 'Participant',
    });
    token2 = jwt.sign(
      { userId: participant2._id.toString(), email: participant2.email, role: 'Participant' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Participant 3
    participant3 = await User.create({
      name: 'Participant Three',
      email: `part3_${Date.now()}@example.com`,
      phoneNumber: '+91 9876500013',
      password: 'password123',
      role: 'Participant',
    });
    token3 = jwt.sign(
      { userId: participant3._id.toString(), email: participant3.email, role: 'Participant' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Competition with capacity 1
    competition = await Competition.create({
      title: 'Limited Capacity AI Challenge',
      description: 'Exclusive competition with single spot.',
      category: 'AI',
      organizer: 'AI Labs',
      createdBy: organizerUser._id,
      registrationStartDate: subDays(now, 1),
      registrationDeadline: addDays(now, 3),
      startDate: addDays(now, 5),
      endDate: addDays(now, 10),
      totalSpots: 1,
      registeredCount: 0,
    });
  });

  // ==========================================
  // 1. WAITLIST JOINING & VALIDATION
  // ==========================================
  describe('Waitlist Joining & Capacity Guard', () => {
    test('W1. Rejects waitlist joining if competition still has open spots', async () => {
      const res = await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('still has open spots');
    });

    test('W2. Allows eligible user to join waitlist when competition is full', async () => {
      // 1. Participant 1 takes the 1 spot
      const regRes = await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });
      expect(regRes.status).toBe(201);

      // Verify notification for registration confirmation
      const notifs1 = await Notification.find({ userId: participant1._id });
      expect(notifs1.length).toBe(1);
      expect(notifs1[0].type).toBe(NOTIFICATION_TYPES.REGISTRATION_CONFIRMATION);

      // 2. Participant 2 joins waitlist
      const waitRes = await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });

      expect(waitRes.status).toBe(201);
      expect(waitRes.body.data.waitlisted).toBe(true);
      expect(waitRes.body.data.waitlistPosition).toBe(1);
      expect(waitRes.body.data.registration.status).toBe(REGISTRATION_STATUS.WAITLISTED);

      // Verify notification for waitlist joined
      const notifs2 = await Notification.find({ userId: participant2._id });
      expect(notifs2.length).toBe(1);
      expect(notifs2[0].type).toBe(NOTIFICATION_TYPES.WAITLIST_JOINED);
      expect(notifs2[0].metadata.waitlistPosition).toBe(1);

      // 3. Participant 3 joins waitlist -> gets position 2
      const waitRes3 = await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token3}`)
        .send({ participantDetails: { fullName: participant3.name, email: participant3.email } });

      expect(waitRes3.status).toBe(201);
      expect(waitRes3.body.data.waitlistPosition).toBe(2);
    });

    test('W3. Prevents duplicate registrations and duplicate waitlist entries', async () => {
      // Participant 1 registers
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // Participant 1 tries to join waitlist -> 409 Conflict
      const dupWait = await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });
      expect(dupWait.status).toBe(409);
      expect(dupWait.body.message).toContain('already registered with a confirmed spot');

      // Participant 2 joins waitlist
      await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });

      // Participant 2 tries to join waitlist again -> 409 Conflict
      const dupWait2 = await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });
      expect(dupWait2.status).toBe(409);
      expect(dupWait2.body.message).toContain('already on the waitlist');
    });
  });

  // ==========================================
  // 2. ATOMIC PROMOTION ON CANCELLATION
  // ==========================================
  describe('Atomic Waitlist Promotion on Cancellation', () => {
    test('W4. Confirmed cancellation promotes next eligible waitlisted user in FIFO order', async () => {
      // 1. Participant 1 registers
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // 2. Participant 2 joins waitlist
      await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });

      // 3. Participant 3 joins waitlist
      await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token3}`)
        .send({ participantDetails: { fullName: participant3.name, email: participant3.email } });

      // 4. Participant 1 cancels confirmed registration
      const cancelRes = await request(app)
        .delete(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`);

      expect(cancelRes.status).toBe(200);

      // Verify Participant 1 is CANCELLED and has cancellation notification
      const reg1 = await Registration.findOne({ userId: participant1._id, competitionId: competition._id });
      expect(reg1.status).toBe(REGISTRATION_STATUS.CANCELLED);
      const notifs1 = await Notification.find({ userId: participant1._id, type: NOTIFICATION_TYPES.REGISTRATION_CANCELLATION });
      expect(notifs1.length).toBe(1);

      // Verify Participant 2 was PROMOTED to CONFIRMED (FIFO order: 2 was ahead of 3)
      const reg2 = await Registration.findOne({ userId: participant2._id, competitionId: competition._id });
      expect(reg2.status).toBe(REGISTRATION_STATUS.CONFIRMED);
      expect(reg2.promotedAt).not.toBeNull();
      expect(reg2.waitlistPosition).toBeNull();

      // Verify Participant 2 received WAITLIST_PROMOTION notification
      const notifs2 = await Notification.find({ userId: participant2._id, type: NOTIFICATION_TYPES.WAITLIST_PROMOTION });
      expect(notifs2.length).toBe(1);
      expect(notifs2[0].title).toContain('Promoted');

      // Verify Participant 3 is STILL WAITLISTED
      const reg3 = await Registration.findOne({ userId: participant3._id, competitionId: competition._id });
      expect(reg3.status).toBe(REGISTRATION_STATUS.WAITLISTED);

      // Verify registeredCount remained at 1 (no overbooking or premature decrement)
      const updatedComp = await Competition.findById(competition._id);
      expect(updatedComp.registeredCount).toBe(1);
    });

    test('W5. Cancellation with no waitlist decrements registeredCount properly', async () => {
      // Participant 1 registers
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // Participant 1 cancels without anyone on waitlist
      const cancelRes = await request(app)
        .delete(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`);

      expect(cancelRes.status).toBe(200);
      const updatedComp = await Competition.findById(competition._id);
      expect(updatedComp.registeredCount).toBe(0);
    });

    test('W6. Allows waitlisted user to cancel their own waitlist spot', async () => {
      // Fill spot
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // Join waitlist
      await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });

      // Cancel waitlist entry
      const cancelRes = await request(app)
        .delete(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`);

      expect(cancelRes.status).toBe(200);

      const reg2 = await Registration.findOne({ userId: participant2._id, competitionId: competition._id });
      expect(reg2.status).toBe(REGISTRATION_STATUS.CANCELLED);

      // registeredCount was 1 and should stay 1
      const compCheck = await Competition.findById(competition._id);
      expect(compCheck.registeredCount).toBe(1);
    });
  });

  // ==========================================
  // 3. COMPETITION CANCELLATION NOTIFICATIONS
  // ==========================================
  describe('Competition Cancellation Notifications', () => {
    test('W7. Deleting/cancelling competition notifies all confirmed and waitlisted participants', async () => {
      // 1. Participant 1 registers
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // 2. Participant 2 waitlists
      await request(app)
        .post(`/api/competitions/${competition._id}/waitlist`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ participantDetails: { fullName: participant2.name, email: participant2.email } });

      // 3. Organizer deletes/cancels the competition
      const delRes = await request(app)
        .delete(`/api/competitions/${competition._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.action).toBe('CANCELLED');

      // Verify Participant 1 received COMPETITION_CANCELLATION
      const notifs1 = await Notification.find({
        userId: participant1._id,
        type: NOTIFICATION_TYPES.COMPETITION_CANCELLATION,
      });
      expect(notifs1.length).toBe(1);
      expect(notifs1[0].message).toContain('has been cancelled by the organizer');

      // Verify Participant 2 received COMPETITION_CANCELLATION
      const notifs2 = await Notification.find({
        userId: participant2._id,
        type: NOTIFICATION_TYPES.COMPETITION_CANCELLATION,
      });
      expect(notifs2.length).toBe(1);
      expect(notifs2[0].message).toContain('has been cancelled by the organizer');
    });
  });

  // ==========================================
  // 4. NOTIFICATION APIS & USER OWNERSHIP
  // ==========================================
  describe('Notification APIs & User Ownership (/api/notifications)', () => {
    let notif1, notif2;

    beforeEach(async () => {
      // Seed notifications for participant 1
      notif1 = await Notification.create({
        userId: participant1._id,
        type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMATION,
        title: 'Welcome',
        message: 'Welcome to the platform',
        isRead: false,
      });
      notif2 = await Notification.create({
        userId: participant1._id,
        type: NOTIFICATION_TYPES.WAITLIST_PROMOTION,
        title: 'Spot Opened',
        message: 'You have been promoted',
        isRead: false,
      });

      // Seed notification for participant 2
      await Notification.create({
        userId: participant2._id,
        type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMATION,
        title: 'Participant 2 Welcome',
        message: 'Welcome P2',
        isRead: false,
      });
    });

    test('N1. GET /api/notifications requires authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    test('N2. GET /api/notifications returns only the authenticated user\'s notifications with pagination', async () => {
      const res = await request(app)
        .get('/api/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.unreadCount).toBe(2);
      expect(res.body.data.notifications.length).toBe(2);
      // Ensure none belong to participant 2
      res.body.data.notifications.forEach((n) => {
        expect(n.userId.toString()).toBe(participant1._id.toString());
      });
    });

    test('N3. PATCH /api/notifications/:id/read marks single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif1._id}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).not.toBeNull();

      const dbCheck = await Notification.findById(notif1._id);
      expect(dbCheck.isRead).toBe(true);
    });

    test('N4. Enforces strict user ownership: User cannot mark another user\'s notification as read (403)', async () => {
      // Participant 2 attempts to mark Participant 1's notification as read
      const res = await request(app)
        .patch(`/api/notifications/${notif1._id}/read`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    test('N5. PATCH /api/notifications/read-all marks all unread notifications for user as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.modifiedCount).toBe(2);

      const unreadCount = await Notification.countDocuments({ userId: participant1._id, isRead: false });
      expect(unreadCount).toBe(0);

      // Verify Participant 2's notification remains unread
      const p2Unread = await Notification.countDocuments({ userId: participant2._id, isRead: false });
      expect(p2Unread).toBe(1);
    });

    test('N6. Handles invalid ObjectId and 404 for missing notification', async () => {
      // Invalid ObjectId
      const invalidRes = await request(app)
        .patch('/api/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${token1}`);
      expect(invalidRes.status).toBe(400);

      // Missing notification
      const missingId = new mongoose.Types.ObjectId();
      const missingRes = await request(app)
        .patch(`/api/notifications/${missingId}/read`)
        .set('Authorization', `Bearer ${token1}`);
      expect(missingRes.status).toBe(404);
    });
  });

  // ==========================================
  // 5. CONCURRENT CANCELLATION & PROMOTION
  // ==========================================
  describe('Concurrency & Race-Condition Safe Promotions', () => {
    test('C1. Concurrent waitlist joins safely assign unique sequential positions', async () => {
      // 1. Fill spot
      await request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ participantDetails: { fullName: participant1.name, email: participant1.email } });

      // 2. Create 5 additional users
      const users = [];
      for (let i = 0; i < 5; i++) {
        const u = await User.create({
          name: `Concurrent Waitlist User ${i}`,
          email: `c_waitlist_${i}_${Date.now()}@test.com`,
          phoneNumber: `+91 910000000${i}`,
          password: 'password123',
          role: 'Participant',
        });
        const t = jwt.sign(
          { userId: u._id.toString(), email: u.email, role: 'Participant' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        users.push({ u, t });
      }

      // 3. Fire concurrent join waitlist requests
      const promises = users.map(({ t, u }) =>
        request(app)
          .post(`/api/competitions/${competition._id}/waitlist`)
          .set('Authorization', `Bearer ${t}`)
          .send({ participantDetails: { fullName: u.name, email: u.email } })
      );

      const results = await Promise.all(promises);

      // Verify all 5 joined successfully with status 201
      results.forEach((r) => {
        expect(r.status).toBe(201);
        expect(r.body.data.waitlisted).toBe(true);
      });

      // Verify 5 waitlist registrations in DB
      const waitlistedDocs = await Registration.find({
        competitionId: competition._id,
        status: REGISTRATION_STATUS.WAITLISTED,
      }).sort({ registeredAt: 1, _id: 1 });

      expect(waitlistedDocs.length).toBe(5);
    });
  });
});
