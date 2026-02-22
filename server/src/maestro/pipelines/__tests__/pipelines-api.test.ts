import express from 'express';
import request from 'supertest';
import router from '../../pipelines-api';
import { describe, it, expect } from '@jest/globals';

describe('Pipelines API', () => {
  const app = express();
  app.use('/api/maestro/v1', router);

  it('lists pipelines (empty)', async () => {
    const res = await request(app).get('/api/maestro/v1/pipelines').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
