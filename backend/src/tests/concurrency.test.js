const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const { JWT_SECRET } = require('../middleware/authMiddleware');

describe('High-Concurrency Multi-User Registration Stress Test with JWT Auth', () => {
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  test('20 simultaneous authenticated users compete for 2 spots -> Exactly 2 succeed, 18 fail, registeredCount === 2', async () => {
    // 0. Create an organizer user to own the competition
    const organizer = await User.create({
      name: 'Stress Organizer',
      email: 'organizer@stress.test',
      phoneNumber: '+91 9800000999',
      password: 'securePassword123',
      role: 'Organizer',
    });

    // 1. Create a competition with exactly 2 spots
    const competition = await Competition.create({
      title: 'High-Concurrency Stress Test Hackathon',
      description: 'Testing race conditions under 20 simultaneous registrations',
      image: 'https://example.com/stress.jpg',
      registrationStartDate: subDays(now, 2),
      registrationDeadline: addDays(now, 3),
      startDate: addDays(now, 5),
      endDate: addDays(now, 7),
      totalSpots: 2,
      registeredCount: 0,
      createdBy: organizer._id,
    });

    // 2. Create 20 distinct authenticated users and their JWT tokens
    const userTokens = [];
    for (let i = 1; i <= 20; i++) {
      const user = await User.create({
        name: `Stress User ${i}`,
        email: `stress.user${i}@example.com`,
        phoneNumber: `+91 98000000${i.toString().padStart(2, '0')}`,
        password: 'securePassword123',
      });

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      userTokens.push({ user, token });
    }

    // 3. Dispatch 20 simultaneous registration requests via Promise.all with JWT Bearer headers
    const registrationPromises = userTokens.map(({ user, token }) =>
      request(app)
        .post(`/api/competitions/${competition._id}/register`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          participantDetails: {
            fullName: user.name,
            email: user.email,
            phone: user.phoneNumber,
          },
        })
    );

    const responses = await Promise.all(registrationPromises);

    // 4. Categorize responses
    const successfulResponses = responses.filter((r) => r.status === 201);
    const failedResponses = responses.filter((r) => r.status !== 201);

    console.log(`\n[Concurrency Test Results with JWT Auth]`);
    console.log(`✓ Successful registrations (201): ${successfulResponses.length}`);
    console.log(`✓ Failed / rejected attempts:    ${failedResponses.length}`);
    console.log(`  - Status breakdown: ${JSON.stringify(
      responses.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {})
    )}`);

    // 5. Assertions
    // Exactly 2 requests must succeed
    expect(successfulResponses.length).toBe(2);

    // Exactly 18 requests must fail
    expect(failedResponses.length).toBe(18);

    // Non-succeeding requests must be valid failure status codes (409 Conflict for full or 503 for transient lock exhaustion)
    failedResponses.forEach((res) => {
      expect([409, 503]).toContain(res.status);
    });

    // 6. Database Verification
    const dbComp = await Competition.findById(competition._id);
    expect(dbComp.registeredCount).toBe(2);
    expect(dbComp.registeredCount).toBeLessThanOrEqual(dbComp.totalSpots);

    const confirmedRegistrations = await Registration.find({
      competitionId: competition._id,
      status: 'CONFIRMED',
    });

    expect(confirmedRegistrations.length).toBe(2);

    // Ensure there are no duplicate registrations for the same user
    const registeredUserIds = confirmedRegistrations.map((r) => r.userId.toString());
    const uniqueUserIds = new Set(registeredUserIds);
    expect(uniqueUserIds.size).toBe(2);
  }, 45000);
});
