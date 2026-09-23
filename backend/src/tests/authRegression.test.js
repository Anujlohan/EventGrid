const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Full Authentication Flow & Regression Test Suite', () => {
  const testAccount = {
    name: 'Anuj Lohan',
    email: 'anuj.regression@example.com',
    phoneNumber: '+91 9876543210',
    password: 'MyVerySecurePassword2026!',
    confirmPassword: 'MyVerySecurePassword2026!',
  };

  test('Complete E2E Auth Flow: Signup -> Confirm in DB -> Me -> Logout -> Login -> Me -> Second Login -> Me', async () => {
    // 1. Signup with new account
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(testAccount);

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.success).toBe(true);
    expect(signupRes.body.data.token).toBeDefined();
    expect(signupRes.body.data.user.email).toBe(testAccount.email);
    expect(signupRes.body.data.user.name).toBe(testAccount.name);
    expect(signupRes.body.data.user.password).toBeUndefined();
    const signupToken = signupRes.body.data.token;

    // 2. Confirm user exists in MongoDB and password is valid bcrypt hash
    const userInDb = await User.findOne({ email: testAccount.email }).select('+password');
    expect(userInDb).not.toBeNull();
    expect(userInDb.email).toBe(testAccount.email);
    expect(userInDb.name).toBe(testAccount.name);
    expect(userInDb.phoneNumber).toBe(testAccount.phoneNumber);
    expect(userInDb.password).not.toBe(testAccount.password);
    expect(userInDb.password.startsWith('$2')).toBe(true);
    expect(userInDb.password.length).toBe(60);

    // 3. Call /api/auth/me with signup JWT
    const meRes1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signupToken}`);

    expect(meRes1.status).toBe(200);
    expect(meRes1.body.success).toBe(true);
    expect(meRes1.body.data.user.email).toBe(testAccount.email);
    expect(meRes1.body.data.user.name).toBe(testAccount.name);

    // 4. Logout (clear session) & Login with EXACT same email and password
    const loginRes1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAccount.email,
        password: testAccount.password,
      });

    expect(loginRes1.status).toBe(200);
    expect(loginRes1.body.success).toBe(true);
    expect(loginRes1.body.data.token).toBeDefined();
    expect(loginRes1.body.data.user.email).toBe(testAccount.email);
    expect(loginRes1.body.data.user.password).toBeUndefined();
    const loginToken1 = loginRes1.body.data.token;

    // 5. Call /api/auth/me with login JWT to verify profile loads
    const meRes2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginToken1}`);

    expect(meRes2.status).toBe(200);
    expect(meRes2.body.success).toBe(true);
    expect(meRes2.body.data.user.email).toBe(testAccount.email);
    expect(meRes2.body.data.user.name).toBe(testAccount.name);

    // 6. Logout & Login again with the same credentials
    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAccount.email,
        password: testAccount.password,
      });

    expect(loginRes2.status).toBe(200);
    expect(loginRes2.body.success).toBe(true);
    expect(loginRes2.body.data.token).toBeDefined();
    const loginToken2 = loginRes2.body.data.token;

    // 7. Verify /api/auth/me loads correctly with second login JWT
    const meRes3 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginToken2}`);

    expect(meRes3.status).toBe(200);
    expect(meRes3.body.success).toBe(true);
    expect(meRes3.body.data.user.email).toBe(testAccount.email);

    // 8. Wrong password rejected with 401
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAccount.email,
        password: 'WrongPassword!',
      });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.success).toBe(false);
    expect(wrongPassRes.body.message).toContain('Invalid email or password');

    // 9. Wrong email rejected with 401
    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong.' + testAccount.email,
        password: testAccount.password,
      });
    expect(wrongEmailRes.status).toBe(401);
    expect(wrongEmailRes.body.success).toBe(false);
    expect(wrongEmailRes.body.message).toContain('Invalid email or password');

    // 10. Duplicate signup rejected with 409
    const dupRes = await request(app)
      .post('/api/auth/signup')
      .send(testAccount);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toContain('already exists');

    // 11. Empty fields validation error (400)
    const emptyLogin = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    expect(emptyLogin.status).toBe(400);

    const emptySignup = await request(app).post('/api/auth/signup').send({
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    });
    expect(emptySignup.status).toBe(400);

    // 12. Invalid email format validation error (400)
    const invalidEmailRes = await request(app).post('/api/auth/signup').send({
      name: 'Valid Name',
      email: 'not-an-email',
      phoneNumber: '+1234567890',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    expect(invalidEmailRes.status).toBe(400);
    expect(invalidEmailRes.body.message).toContain('valid email address');

    // 13. Protected API without JWT returns 401
    const noTokenRes = await request(app).get('/api/auth/me');
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.message).toContain('Authentication required');

    // 14. Protected API with valid JWT succeeds (200)
    const validTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginToken1}`);
    expect(validTokenRes.status).toBe(200);
    expect(validTokenRes.body.success).toBe(true);
    expect(validTokenRes.body.data.user.email).toBe(testAccount.email);
  });
});
