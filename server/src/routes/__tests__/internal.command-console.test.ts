import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import commandConsoleRouter from '../internal/command-console.js';

jest.mock('../../services/GAReleaseService', () => ({
  GAReleaseService: jest.fn().mockImplementation(() => ({
    getReleaseInfo: jest
      .fn()
      .mockResolvedValue({
        buildDate: '2024-01-01T00:00:00.000Z',
        ready: true,
        version: '1.0.0',
        commitHash: 'abc123',
        environment: 'test',
        features: [],
      }),
    validateDeployment: jest.fn().mockResolvedValue({
      ready: true,
      validated: true,
      sbomGenerated: true,
      testsPass: true,
      validations: [
        { component: 'package-json', status: 'pass', message: 'ok' },
        { component: 'dependencies', status: 'pass', message: 'ok' },
      ],
    }),
  })),
}));

const app = express();
app.use(express.json());
app.use('/api/internal/command-console', commandConsoleRouter);

const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? describe.skip : describe;

describeIf('Internal Command Console routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.COMMAND_CONSOLE_ENABLED = 'true';
    process.env.COMMAND_CONSOLE_TOKEN = 'test-token';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects requests without internal token', async () => {
    const res = await request(app).get('/api/internal/command-console/summary');
    expect(res.status).toBe(403);
  });

  it('returns a snapshot payload for authorized requests', async () => {
    const res = await request(app)
      .get('/api/internal/command-console/summary')
      .set('x-internal-token', 'test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gaGate');
    expect(res.body).toHaveProperty('ci');
    expect(res.body).toHaveProperty('slo');
    expect(res.body).toHaveProperty('llm');
    expect(res.body).toHaveProperty('dependencyRisk');
    expect(res.body).toHaveProperty('evidence');
    expect(res.body).toHaveProperty('tenants');
    expect(res.body.tenants.length).toBeGreaterThan(0);
  });

  it('exposes incidents separately for authorized requests', async () => {
    const res = await request(app)
      .get('/api/internal/command-console/incidents')
      .set('x-internal-token', 'test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gaGateFailures');
    expect(res.body).toHaveProperty('policyDenials');
    expect(res.body).toHaveProperty('killSwitchActivations');
  });
});
