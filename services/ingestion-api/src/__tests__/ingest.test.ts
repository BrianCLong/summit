import request from 'supertest';
import express from 'express';
import { Queue } from 'bullmq';

// Mock the BullMQ Queue
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  })),
}));

// Mock the Redis client
jest.mock('@intelgraph/redis', () => ({
  getRedisClient: jest.fn(),
}));

// We need to re-import the app after the mocks are set up
let app: express.Express;

beforeAll(async () => {
  const mod = await import('../src/index');
  app = (mod as any).default;
});

describe('POST /ingest', () => {
  it('should return a job ID when a file is uploaded', async () => {
    const response = await request(app)
      .post('/ingest')
      .field('config', JSON.stringify({}))
      .attach('file', Buffer.from('test data'), 'test.csv');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('jobId', 'test-job-id');
  });

  it('should return a 400 error if no file is uploaded', async () => {
    const response = await request(app)
      .post('/ingest')
      .field('config', JSON.stringify({}));

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'No file uploaded.');
  });
});
