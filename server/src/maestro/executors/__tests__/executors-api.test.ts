import express from 'express';
import request from 'supertest';
import router from '../../executors-api';
import { describe, it, expect } from '@jest/globals';

describe('Executors API', () => {
  const app = express();
  app.use('/api/maestro/v1', router);

  it('lists executors (empty)', async () => {
    const res = await request(app).get('/api/maestro/v1/executors').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
