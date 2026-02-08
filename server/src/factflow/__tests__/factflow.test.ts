import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { factFlowRouter } from '../index.js';

// Mock logger
jest.unstable_mockModule('../../config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FactFlow Module', () => {
  let app: any;

  beforeAll(async () => {
    // Re-import to ensure mocks are applied if needed, though mostly for the router to pick up the mocked logger
    const { factFlowRouter } = await import('../index.js');

    app = express();
    app.use(express.json());
    app.use('/api/factflow', factFlowRouter);
  });

  it('GET /api/factflow/status should return active status', async () => {
    const res = await request(app).get('/api/factflow/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'active', version: '0.1.0' });
  });

  it('POST /api/factflow/transcribe should return simulated text', async () => {
    const res = await request(app)
      .post('/api/factflow/transcribe')
      .send({ audioUrl: 'http://example.com/audio.mp3' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('text');
    expect(res.body.confidence).toBeGreaterThan(0);
  });

  it('POST /api/factflow/verify should return simulated verdict', async () => {
    const res = await request(app)
      .post('/api/factflow/verify')
      .send({ claim: 'Sky is blue' });

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBeDefined();
    expect(res.body.evidence).toBeInstanceOf(Array);
  });
});
