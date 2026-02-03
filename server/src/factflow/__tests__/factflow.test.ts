import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock engine dependencies
jest.mock('../../factflow/engine.js', () => ({
  FactFlowEngine: jest.fn().mockImplementation(() => ({
    process: jest.fn().mockResolvedValue({ report: 'mock report' }),
  })),
}));

jest.mock('../../factflow/adapters/transcription.js', () => ({
  MockTranscriptionAdapter: jest.fn(),
}));

jest.mock('../../factflow/adapters/diarization.js', () => ({
  MockDiarizationAdapter: jest.fn(),
}));

jest.mock('../../factflow/verification.js', () => ({
  MockVerificationEngine: jest.fn(),
}));

jest.mock('../../factflow/gate.js', () => ({
  PublishGate: jest.fn(),
}));

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
    // Re-import to ensure mocks are applied
    const { factFlowRouter } = await import('../index.js');

    app = express();
    app.use(express.json());
    app.use('/api/factflow', factFlowRouter);
  });

  it('POST /api/factflow/jobs should start a new job', async () => {
    const res = await request(app)
      .post('/api/factflow/jobs')
      .send({ audioBase64: 'base64audio' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('job_id');
    expect(res.body.status).toBe('processing');
  });

  it('GET /api/factflow/jobs/:id should return job status', async () => {
    // First create a job
    const createRes = await request(app)
      .post('/api/factflow/jobs')
      .send({ audioBase64: 'base64audio' });

    const jobId = createRes.body.job_id;

    // Then check status
    const res = await request(app).get(`/api/factflow/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });
});
