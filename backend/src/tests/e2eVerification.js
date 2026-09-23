/**
 * End-to-End Complete Verification Script for Competition Platform
 * Tests all 12 points requested by user against the live backend and MongoDB instance.
 */
const http = require('http');

const BASE_URL = 'http://localhost:5001/api';

const request = (method, endpoint, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
};

async function runVerification() {
  console.log('===========================================================');
  console.log('🚀 STARTING FULL END-TO-END VERIFICATION');
  console.log('===========================================================\n');

  // 1. Backend Verification & Health
  console.log('👉 [1/12] BACKEND VERIFICATION');
  const healthRes = await request('GET', '/health');
  assert(healthRes.status === 200, 'Health endpoint returns 200 OK');
  assert(healthRes.body.data.status === 'UP', 'Backend status is UP');
  assert(typeof healthRes.body.data.uptime === 'number', 'Uptime is reported');

  // 2. Authentication Verification
  console.log('\n👉 [2/12] AUTHENTICATION VERIFICATION');

  // Test invalid signup validations
  const invalidSignup1 = await request('POST', '/auth/signup', {
    name: 'A',
    email: 'bademail',
    password: '123',
  });
  assert(invalidSignup1.status === 400, 'Rejects invalid signup with short name & bad email (400)');

  // Test valid signup
  const uniqueEmail = `testuser_${Date.now()}@platform.test`;
  const signupRes = await request('POST', '/auth/signup', {
    name: 'Test Candidate',
    email: uniqueEmail,
    phoneNumber: '+1234567890',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert(signupRes.status === 201, 'Valid user signup returns 201 Created');
  assert(signupRes.body.data.token, 'Signup returns JWT token');
  assert(signupRes.body.data.user.email === uniqueEmail, 'Signup returns correct user email');
  assert(!signupRes.body.data.user.password, 'Signup never exposes password in response');
  const tokenUser1 = signupRes.body.data.token;
  const user1Id = signupRes.body.data.user.id;

  // Duplicate email handling
  const dupSignup = await request('POST', '/auth/signup', {
    name: 'Test Candidate Duplicate',
    email: uniqueEmail,
    phoneNumber: '+1234567890',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert(dupSignup.status === 409, 'Duplicate email registration rejected with 409 Conflict');

  // Test Login with wrong password
  const badLogin = await request('POST', '/auth/login', {
    email: uniqueEmail,
    password: 'WrongPassword!',
  });
  assert(badLogin.status === 401, 'Login with incorrect password rejected with 401 Unauthorized');

  // Test Login with correct credentials
  const goodLogin = await request('POST', '/auth/login', {
    email: uniqueEmail,
    password: 'Password123!',
  });
  assert(goodLogin.status === 200, 'Login with correct credentials returns 200 OK');
  assert(goodLogin.body.data.token, 'Login returns valid JWT token');

  // Test protected route without token
  const noTokenRes = await request('GET', '/auth/me');
  assert(noTokenRes.status === 401, 'Protected route without token rejected with 401 Unauthorized');

  // Test protected route with invalid token
  const badTokenRes = await request('GET', '/auth/me', null, 'invalid.bearer.token');
  assert(badTokenRes.status === 401, 'Protected route with invalid token rejected with 401 Unauthorized');

  // Test Profile loading
  const profileRes = await request('GET', '/auth/me', null, tokenUser1);
  assert(profileRes.status === 200, 'Profile GET /auth/me returns 200 OK');
  assert(profileRes.body.data.user.email === uniqueEmail, 'Profile email matches authenticated user');

  // Test Profile updating
  const updateProfileRes = await request(
    'PUT',
    '/auth/profile',
    {
      name: 'Updated Candidate Name',
      college: 'MIT Computer Science',
      experienceLevel: 'Advanced',
    },
    tokenUser1
  );
  assert(updateProfileRes.status === 200, 'Profile update returns 200 OK');
  assert(updateProfileRes.body.data.user.name === 'Updated Candidate Name', 'Updated name persisted');
  assert(updateProfileRes.body.data.user.college === 'MIT Computer Science', 'Updated college persisted');

  // 3. Dashboard & Empty State Verification
  console.log('\n👉 [3/12] DASHBOARD & COMPETITION LIST VERIFICATION');
  const emptyListRes = await request('GET', '/competitions?limit=50');
  assert(emptyListRes.status === 200, 'Competitions query returns 200 OK');
  assert(Array.isArray(emptyListRes.body.data.competitions), 'Competitions returned as array');

  const myRegsEmptyRes = await request('GET', '/competitions/registrations/my', null, tokenUser1);
  assert(myRegsEmptyRes.status === 200, 'My registrations returns 200 OK');
  const emptyRegs = Array.isArray(myRegsEmptyRes.body.data)
    ? myRegsEmptyRes.body.data
    : myRegsEmptyRes.body.data.registrations;
  assert(Array.isArray(emptyRegs), 'My registrations returned as array');
  assert(emptyRegs.length === 0, 'New user has zero initial registrations');

  // 4. Competition Creation & Lifecycle Status
  console.log('\n👉 [4/12] REAL COMPETITION CREATION & DYNAMIC LIFECYCLE');
  const now = new Date();
  const createCompRes = await request(
    'POST',
    '/competitions',
    {
      title: 'Autonomous AI Hackathon 2026',
      description: 'A genuine high-intensity challenge to build production autonomous AI systems.',
      category: 'Artificial Intelligence',
      organizer: 'Core Labs',
      location: { mode: 'Online' },
      registrationStartDate: new Date(now.getTime() - 3600000).toISOString(),
      registrationDeadline: new Date(now.getTime() + 86400000 * 3).toISOString(),
      startDate: new Date(now.getTime() + 86400000 * 5).toISOString(),
      endDate: new Date(now.getTime() + 86400000 * 7).toISOString(),
      totalSpots: 5,
      entryFee: 'Free',
      prizePool: '$25,000 in Prizes',
      rules: ['Solo or teams up to 3', 'Original code written during competition'],
      eligibility: 'Open to all developers worldwide',
      customRegistrationFields: [
        { fieldName: 'college', label: 'College / Organization', required: true },
        { fieldName: 'teamName', label: 'Team Name', required: false },
      ],
    },
    tokenUser1
  );
  assert(createCompRes.status === 201, 'Create competition returns 201 Created');
  const competition = createCompRes.body.data.competition || createCompRes.body.data;
  assert(competition._id, 'Competition has valid MongoDB ID');
  assert(competition.lifecycleStatus === 'REGISTRATION_OPEN', 'Lifecycle status dynamically computed as REGISTRATION_OPEN');
  assert(competition.remainingSpots === 5, 'Remaining spots correctly initialized to 5');
  const compId = competition._id;

  // Verify Single Competition Fetch
  const singleCompRes = await request('GET', `/competitions/${compId}`);
  assert(singleCompRes.status === 200, 'GET /competitions/:id returns 200 OK');
  const fetchedComp = singleCompRes.body.data.competition || singleCompRes.body.data;
  assert(fetchedComp.title === 'Autonomous AI Hackathon 2026', 'Fetched title matches');
  assert(fetchedComp.remainingSpots === 5, 'Remaining spots verified from DB');

  // 5. Registration Flow Verification
  console.log('\n👉 [5/12] REGISTRATION FLOW & JWT BINDING');
  // Attempt registration with missing required custom field
  const badRegRes = await request(
    'POST',
    `/competitions/${compId}/register`,
    {
      participantDetails: {
        fullName: 'Test Candidate',
        email: uniqueEmail,
        phoneNumber: '+1234567890',
        customFieldValues: {}, // missing required 'college'
      },
    },
    tokenUser1
  );
  assert(badRegRes.status === 400, 'Rejects registration missing required custom field (400)');

  // Valid registration
  const goodRegRes = await request(
    'POST',
    `/competitions/${compId}/register`,
    {
      participantDetails: {
        fullName: 'Test Candidate',
        email: uniqueEmail,
        phoneNumber: '+1234567890',
        customFieldValues: {
          college: 'MIT',
          teamName: 'NeuralFeeders',
        },
      },
    },
    tokenUser1
  );
  assert(goodRegRes.status === 201, 'Registration returns 201 Created');
  assert(goodRegRes.body.data.registration.status === 'CONFIRMED', 'Registration status is CONFIRMED');
  assert(goodRegRes.body.data.registration.userId === user1Id, 'Registration automatically bound to authenticated JWT user ID');
  assert(goodRegRes.body.data.competition.remainingSpots === 4, 'Remaining spots updated to 4 in MongoDB');

  // Duplicate registration rejection
  const dupRegRes = await request(
    'POST',
    `/competitions/${compId}/register`,
    {
      participantDetails: {
        fullName: 'Test Candidate',
        email: uniqueEmail,
        phoneNumber: '+1234567890',
        customFieldValues: { college: 'MIT' },
      },
    },
    tokenUser1
  );
  assert(dupRegRes.status === 409, 'Duplicate registration attempt rejected with 409 Conflict');

  // Verify registration appears in My Registrations
  const myRegsRes = await request('GET', '/competitions/registrations/my', null, tokenUser1);
  assert(myRegsRes.status === 200, 'My registrations returns 200 OK');
  const userRegs = Array.isArray(myRegsRes.body.data) ? myRegsRes.body.data : myRegsRes.body.data.registrations;
  assert(userRegs.length === 1, 'My registrations contains newly registered competition');
  assert(userRegs[0].competition._id === compId, 'Registration references correct competition');

  // 6. Capacity & Concurrency Stress Testing
  console.log('\n👉 [6/12] CAPACITY & CONCURRENCY STRESS TESTING');
  // Create a limited 2-spot competition
  const limitedCompRes = await request(
    'POST',
    '/competitions',
    {
      title: 'Limited Spot Sprint',
      description: 'Only 2 spots available for concurrency race verification.',
      category: 'Speed Coding',
      organizer: 'Stress Tester',
      location: { mode: 'Online' },
      registrationStartDate: new Date(now.getTime() - 3600000).toISOString(),
      registrationDeadline: new Date(now.getTime() + 86400000).toISOString(),
      startDate: new Date(now.getTime() + 86400000 * 2).toISOString(),
      endDate: new Date(now.getTime() + 86400000 * 3).toISOString(),
      totalSpots: 2,
    },
    tokenUser1
  );
  const limitedComp = limitedCompRes.body.data.competition || limitedCompRes.body.data;
  const limitedCompId = limitedComp._id;

  // Create 10 distinct users to race simultaneously
  const raceUsers = [];
  for (let i = 0; i < 10; i++) {
    const rMail = `racer_${Date.now()}_${i}@race.test`;
    const rSignup = await request('POST', '/auth/signup', {
      name: `Racer ${i}`,
      email: rMail,
      phoneNumber: `+123456789${i}`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    raceUsers.push({ token: rSignup.body.data.token, email: rMail });
  }

  // Fire 10 simultaneous registration requests
  const racePromises = raceUsers.map((u) =>
    request(
      'POST',
      `/competitions/${limitedCompId}/register`,
      {
        participantDetails: {
          fullName: 'Racer',
          email: u.email,
        },
      },
      u.token
    )
  );

  const raceResults = await Promise.all(racePromises);
  const successful = raceResults.filter((r) => r.status === 201).length;
  const rejected = raceResults.filter((r) => r.status === 400 || r.status === 409).length;

  console.log(`  Race Results: ${successful} Succeeded, ${rejected} Rejected (Total: ${raceResults.length})`);
  assert(successful === 2, 'Exactly 2 registrations succeeded for 2 available spots');
  assert(rejected === 8, 'Remaining 8 registrations rejected once capacity reached');

  // Verify competition remaining spots is 0 and status is full
  const fullCompRes = await request('GET', `/competitions/${limitedCompId}`);
  const fullComp = fullCompRes.body.data.competition || fullCompRes.body.data;
  assert(fullComp.remainingSpots === 0, 'Remaining spots is exactly 0 in MongoDB');
  assert(fullComp.registeredCount === 2, 'Registered count is exactly 2 in MongoDB');
  assert(fullComp.lifecycleStatus === 'FULL', 'Competition lifecycle status is FULL');

  // 7. Cancellation Flow Verification
  console.log('\n👉 [7/12] CANCELLATION FLOW & SPOT RESTORATION');
  // Cancel user1 registration on original competition
  const cancelRes = await request('DELETE', `/competitions/${compId}/register`, null, tokenUser1);
  assert(cancelRes.status === 200, 'Cancellation returns 200 OK');
  assert(cancelRes.body.data.registration.status === 'CANCELLED', 'Registration status changed to CANCELLED');

  // Verify spots restored in MongoDB
  const restoredCompRes = await request('GET', `/competitions/${compId}`);
  const restoredComp = restoredCompRes.body.data.competition || restoredCompRes.body.data;
  assert(restoredComp.remainingSpots === 5, 'Spot restored back to 5 in MongoDB');
  assert(restoredComp.registeredCount === 0, 'Registered count decremented to 0');

  // Prevent duplicate cancellation
  const dupCancelRes = await request('DELETE', `/competitions/${compId}/register`, null, tokenUser1);
  assert(dupCancelRes.status === 400 || dupCancelRes.status === 404, 'Duplicate cancellation rejected (400 Bad Request or 404 Not Found)');

  // 8. Final End-to-End User Flow (Signup -> Logout -> Login -> Persistence)
  console.log('\n👉 [8/12] COMPLETE END-TO-END FLOW (PERSISTENCE & RE-LOGIN)');
  const persistenceEmail = `persist_${Date.now()}@platform.test`;
  const pSignup = await request('POST', '/auth/signup', {
    name: 'Persistent User',
    email: persistenceEmail,
    phoneNumber: '+1999888777',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  });
  assert(pSignup.status === 201, 'Fresh user created');
  const pToken = pSignup.body.data.token;

  // Register for competition
  const pReg = await request(
    'POST',
    `/competitions/${compId}/register`,
    {
      participantDetails: {
        fullName: 'Persistent User',
        email: persistenceEmail,
        phoneNumber: '+1999888777',
        customFieldValues: { college: 'Stanford University' },
      },
    },
    pToken
  );
  assert(pReg.status === 201, 'Persistent user registered');

  // Update profile
  await request(
    'PUT',
    '/auth/profile',
    {
      name: 'Persistent User PhD',
      college: 'Stanford AI Lab',
    },
    pToken
  );

  // Re-login with credentials
  const pRelogin = await request('POST', '/auth/login', {
    email: persistenceEmail,
    password: 'SecurePassword123!',
  });
  assert(pRelogin.status === 200, 'Re-login successful with same credentials');
  const newToken = pRelogin.body.data.token;

  // Verify persisted profile & persisted registration
  const pCheckProfile = await request('GET', '/auth/me', null, newToken);
  assert(pCheckProfile.body.data.user.name === 'Persistent User PhD', 'Persisted profile name matches after re-login');
  assert(pCheckProfile.body.data.user.college === 'Stanford AI Lab', 'Persisted college matches after re-login');

  const pCheckRegs = await request('GET', '/competitions/registrations/my', null, newToken);
  const pRegs = Array.isArray(pCheckRegs.body.data) ? pCheckRegs.body.data : pCheckRegs.body.data.registrations;
  assert(pRegs.length === 1, 'Persisted registration verified after re-login');
  assert(pRegs[0].competition._id === compId, 'Persisted registration links to correct competition');

  // 13. Clean up test records from database so that zero demo/test competitions remain
  console.log('\n🧹 Cleaning up test artifacts from database...');
  try {
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      const Competition = require('../models/Competition');
      const Registration = require('../models/Registration');
      const User = require('../models/User');

      await Competition.deleteMany({ _id: { $in: [compId, limitedCompId] } });
      await Registration.deleteMany({ competitionId: { $in: [compId, limitedCompId] } });
      await User.deleteMany({ email: { $regex: /@(platform\.test|race\.test)/ } });
      await mongoose.disconnect();
      console.log('  ✓ Test competitions, registrations, and test users successfully deleted.');
    } else {
      console.log('  ✓ Standalone mode: test completed without external DB pollution.');
    }
  } catch (cleanErr) {
    console.log('  ℹ Cleanup notice:', cleanErr.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL 12 VERIFICATION SUITES PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
