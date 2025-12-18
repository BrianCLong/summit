import 'dotenv/config';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

// Mock config BEFORE importing app
jest.mock('../../config.js', () => ({
  cfg: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgres://postgres:test@localhost:5432/intelgraph_test',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    JWT_SECRET: 'test-secret-at-least-32-chars-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
    CORS_ORIGIN: 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    RATE_LIMIT_MAX_AUTHENTICATED: 1000,
    CACHE_ENABLED: false,
  },
}));

// Mock worker startup to prevent side effects
jest.mock('../../workers/trustScoreWorker.js', () => ({
  startTrustWorker: jest.fn(),
}));
jest.mock('../../workers/retentionWorker.js', () => ({
  startRetentionWorker: jest.fn(),
}));
jest.mock('../../webhooks/webhook.worker.js', () => ({
  webhookWorker: {},
}));

// Mock config/production-security.js used in app.ts
jest.mock('../../config/production-security.js', () => ({
  productionAuthMiddleware: (req, res, next) => next(),
  applyProductionSecurity: jest.fn(),
}));

// Mock Neo4j driver
const mockRun = jest.fn().mockResolvedValue({
  records: [],
});
const mockSession = {
  run: mockRun,
  close: jest.fn(),
};
const mockDriver = {
  session: () => mockSession,
  close: jest.fn(),
};

jest.mock('../../db/neo4j.js', () => ({
  getNeo4jDriver: () => mockDriver,
}));

// Mock Telemetry to avoid issues
jest.mock('../../lib/telemetry/comprehensive-telemetry.js', () => ({
  telemetry: {
    incrementActiveConnections: jest.fn(),
    decrementActiveConnections: jest.fn(),
    recordRequest: jest.fn(),
    subsystems: {
      api: { requests: { add: jest.fn() }, errors: { add: jest.fn() } },
    },
  },
}));
jest.mock('../../lib/telemetry/diagnostic-snapshotter.js', () => ({
  snapshotter: {
    trackRequest: jest.fn(),
    untrackRequest: jest.fn(),
  },
}));
jest.mock('../../lib/telemetry/anomaly-detector.js', () => ({
  anomalyDetector: {},
}));

// Mock Observability Tracer
jest.mock('../../observability/tracer.js', () => ({
  initializeTracing: () => ({ initialize: jest.fn() }),
  getTracer: () => ({ startSpan: jest.fn(() => ({ end: jest.fn() })) }),
}));

// Import createApp after mocks
import { createApp } from '../../app.js';

// Use process.cwd() to resolve path to incidents directory
const INCIDENTS_DIR = path.join(process.cwd(), 'src', 'security', '__tests__', 'incidents');

describe('S8 - Security Regression Replay Harness', () => {
  let app;

  beforeAll(async () => {
    // Silence console for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    app = await createApp();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // Dynamic Test Generation
  // Check if directory exists
  if (!fs.existsSync(INCIDENTS_DIR)) {
     // fallback if running from src dir?
     throw new Error(`Incidents directory not found at ${INCIDENTS_DIR}`);
  }

  const incidentFiles = fs
    .readdirSync(INCIDENTS_DIR)
    .filter((file) => file.endsWith('.json'));

  if (incidentFiles.length === 0) {
    test('No incidents found', () => {
      console.warn('No security incidents found to replay.');
    });
  }

  incidentFiles.forEach((file) => {
    const incidentPath = path.join(INCIDENTS_DIR, file);
    const incident = JSON.parse(fs.readFileSync(incidentPath, 'utf8'));

    describe(`Incident: ${incident.id}`, () => {
      test(`${incident.description}`, async () => {
        for (const step of incident.steps) {
          // Cast to any to allow dynamic method access
          let req = (request(app) as any)[step.method.toLowerCase()](step.path);

          if (step.headers) {
            for (const [key, value] of Object.entries(step.headers)) {
              req.set(key, value as string);
            }
          }

          if (step.body) {
            req.send(step.body);
          }

          const response = await req;

          // Assertions
          if (step.expect.status) {
            expect(response.status).toBe(step.expect.status);
          }

          if (step.expect.bodyContains) {
            expect(JSON.stringify(response.body)).toContain(
              step.expect.bodyContains,
            );
          }

          if (step.expect.bodyNotContains) {
            expect(JSON.stringify(response.body)).not.toContain(
              step.expect.bodyNotContains,
            );
          }
        }
      });
    });
  });
});
