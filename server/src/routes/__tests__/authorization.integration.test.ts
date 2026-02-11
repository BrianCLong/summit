import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import authorize from '../../middleware/authorization.js';

const app = express();

app.use(express.json());
app.use((req: any, _res, next) => {
  // In tests, we mock the authentication by populating req.user based on a test-only header
  // that doesn't conflict with the ones we just hardened in the application.
  const role = req.headers['x-test-role'];
  if (role) {
    req.user = { role: String(role).toUpperCase() };
  }
  next();
});

app.post('/entities', authorize('write_graph'), (_req, res) => {
  res.status(201).json({ ok: true });
});

app.post('/maestro/runs', authorize('run_maestro'), (_req, res) => {
  res.status(202).json({ runId: 'run-123' });
});

app.get('/admin/users', authorize('manage_users'), (_req, res) => {
  res.json({ users: [] });
});

describe('authorization guard integration', () => {
  it('blocks IntelGraph writes when unauthenticated or unauthorized', async () => {
    await request(app).post('/entities').expect(401);

    await request(app)
      .post('/entities')
      .set('x-test-role', 'viewer')
      .expect(403);
  });

  it('allows analysts to create IntelGraph entities', async () => {
    await request(app)
      .post('/entities')
      .set('x-test-role', 'analyst')
      .expect(201);
  });

  it('gates Maestro run operations to operators', async () => {
    await request(app)
      .post('/maestro/runs')
      .set('x-test-role', 'viewer')
      .expect(403);

    await request(app)
      .post('/maestro/runs')
      .set('x-test-role', 'operator')
      .expect(202);
  });

  it('protects admin endpoints', async () => {
    await request(app).get('/admin/users').expect(401);

    await request(app)
      .get('/admin/users')
      .set('x-test-role', 'analyst')
      .expect(403);

    await request(app)
      .get('/admin/users')
      .set('x-test-role', 'admin')
      .expect(200);
  });
});
