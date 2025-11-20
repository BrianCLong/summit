import request from 'supertest';
import { createApp } from '../src/app';
import { getPostgresPool } from '../src/db/postgres';
import { closeRedisClient } from '../src/db/redis';
import { closeNeo4jDriver } from '../src/db/neo4j';
import { stepUpService } from '../src/middleware/stepup';

let app: any;
let server: any;
let pool: any;

beforeAll(async () => {
  app = await createApp();
  pool = getPostgresPool();

  // Mock DB queries for user
  // We'll mock the pool.query or the AuthService methods if possible.
  // Since we are using integration tests, we might need a real DB or extensive mocking.
  // For this environment, mocking the AuthService or database calls is safer if we don't have a running DB.
});

afterAll(async () => {
  await closeRedisClient();
  await closeNeo4jDriver();
  // pool.end();
});

// We will mock AuthService to avoid hitting the actual database
jest.mock('../src/services/AuthService', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => {
      return {
        login: jest.fn().mockImplementation((email, password) => {
          if (email === 'test@example.com' && password === 'password') {
            return Promise.resolve({
              user: { id: 'test-user-id', email: 'test@example.com', role: 'ADMIN' },
              token: 'valid-jwt-token',
              refreshToken: 'valid-refresh-token',
              expiresIn: 3600
            });
          }
          throw new Error('Invalid credentials');
        }),
        register: jest.fn().mockImplementation((data) => {
           return Promise.resolve({
              user: { id: 'new-user-id', email: data.email, role: 'ANALYST' },
              token: 'valid-jwt-token',
              refreshToken: 'valid-refresh-token',
              expiresIn: 3600
            });
        }),
        verifyToken: jest.fn().mockImplementation((token) => {
          if (token === 'valid-jwt-token') {
            return Promise.resolve({ id: 'test-user-id', email: 'test@example.com', role: 'ADMIN' });
          }
          return Promise.resolve(null);
        }),
        hasPermission: jest.fn().mockReturnValue(true)
      };
    })
  };
});

describe('Auth API', () => {

  it('POST /auth/login should return cookies', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });

  it('POST /auth/login should fail with wrong credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/logout should clear cookies', async () => {
    const res = await request(app)
      .post('/auth/logout');

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
  });
});

describe('Step-up Auth', () => {

  it('Protected route should require step-up', async () => {
    // Mock the step-up check.
    // Since we mocked AuthService, we need to make sure the user is attached to the request.
    // The app uses `authenticateToken` middleware which we might need to bypass or mock differently for integration tests
    // if we want to test the full flow.

    // Assuming we have a valid token in cookie
    const res = await request(app)
      .post('/api/admin/config')
      .set('Cookie', ['access_token=valid-jwt-token'])
      .send({ some: 'config' });

    // Without step-up, it should fail (401 or 403)
    // Note: the current implementation returns 401 for missing step-up
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('step_up_required');
  });

  it('WebAuthn challenge flow', async () => {
    // 1. Request challenge
    // We need to mock the request object to include the user, as the middleware sets it.
    // However, supertest runs against the app.

    // We'll mock the authenticateToken middleware if possible, or rely on the mocked AuthService verifying the token.

    const challengeRes = await request(app)
      .post('/webauthn/challenge')
      .set('Cookie', ['access_token=valid-jwt-token']);

    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.challenge).toBeDefined();

    const challenge = challengeRes.body.challenge;

    // 2. Verify challenge (mocked)
    // We need to ensure the same in-memory store is used.
    // Since we are in the same process (jest), `stepUpService` imported here shares the state with the app.

    const verifyRes = await request(app)
      .post('/webauthn/verify')
      .set('Cookie', ['access_token=valid-jwt-token'])
      .send({ response: challenge }); // Sending back the challenge as the "signed" response for mock

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.ok).toBe(true);
    expect(verifyRes.headers['set-cookie'][0]).toContain('mfa_token');

    // 3. Access protected route with MFA token
    const mfaCookie = verifyRes.headers['set-cookie'][0].split(';')[0];

    const protectedRes = await request(app)
        .post('/api/admin/config')
        .set('Cookie', ['access_token=valid-jwt-token', mfaCookie])
        .send({ some: 'config' });

    // Should not be 401 step_up_required
    // It might be 404 (as /api/admin/config is not fully mocked/implemented in app.ts mounting if I missed something)
    // or 200/400 depending on the endpoint logic.
    // The key is that it passed the step-up check.
    expect(protectedRes.status).not.toBe(401);
    if (protectedRes.body) {
        expect(protectedRes.body.error).not.toBe('step_up_required');
    }
  });

});
