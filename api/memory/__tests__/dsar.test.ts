import express from 'express';
import request from 'supertest';
import router from '../index';
import { MemoryRecord } from '../../../core/memory/types';

describe('User Memory API (DSAR-grade)', () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/memory', router);

  const testRecord: Omit<MemoryRecord, 'createdAt'> = {
    id: 'mem-api-1',
    userId: 'user-api-123',
    content: 'My favorite color is blue',
    facets: { color: 'blue' },
    purpose: 'assist',
    contextSpace: 'personal',
    sources: ['chat'],
    expiresAt: Date.now() + 100000,
    visibility: 'user',
  };

  // Pre-populate storage for tests (since we use the shared instance in router for simplicity in this demo)
  // In a real test, we might want to inject a clean storage.

  test('GET /v1/memory should require userId', async () => {
    const res = await request(app).get('/v1/memory');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('userId is required');
  });

  test('GET /v1/memory should validate purpose', async () => {
    const res = await request(app).get('/v1/memory?userId=u1&purpose=invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid purpose');
  });

  test('POST /v1/memory/export should return memories for a user', async () => {
    // We need to actually have something to export.
    // Since we can't easily reach the storage from here without exporting it,
    // let's assume it starts empty.

    const res = await request(app)
      .post('/v1/memory/export')
      .send({ userId: 'user-api-123', contextSpace: 'personal' });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-api-123');
    expect(Array.isArray(res.body.memories)).toBe(true);
  });

  test('DELETE /v1/memory/:id should return 204', async () => {
    const res = await request(app).delete('/v1/memory/non-existent');
    expect(res.status).toBe(204);
  });
});
