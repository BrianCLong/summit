import express from 'express';
import request from 'supertest';
import { describe, expect, it, jest, beforeAll, beforeEach } from '@jest/globals';

const describeNetwork =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const buildLogger = () => {
  const logger: any = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger;
};

let createPiiGuardMiddleware: typeof import('../pii-guard').createPiiGuardMiddleware;

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
  process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
  process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
  process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(32);
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

  ({ createPiiGuardMiddleware } = await import('../pii-guard'));
});

const loggerMock = buildLogger;

describeNetwork('PII guard middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects and redacts PII in the request body without altering the response', async () => {
    const logger = loggerMock();
    const app = express();
    app.use(express.json());
    app.use(createPiiGuardMiddleware({ logger, minimumConfidence: 0.2 }));
    app.post('/echo', (req, res) => {
      res.json({
        message: 'ok',
        email: req.body.email,
      });
    });

    const response = await request(app)
      .post('/echo')
      .send({ email: 'user@example.com', message: 'hello world' })
      .expect(200);

    expect(response.body.email).toBe('user@example.com');
    expect(logger.info).toHaveBeenCalled();

    const logPayload = logger.info.mock.calls[0][0];
    expect(logPayload.piiScan.requestFindings.length).toBeGreaterThan(0);
    expect(logPayload.piiScan.requestFindings[0]).toMatchObject({ path: 'body.email', type: 'email' });
    expect(logPayload.piiScan.redactedRequestPreview).toContain('[REDACTED]');
  });

  it('redacts response bodies before logging', async () => {
    const logger = loggerMock();
    const app = express();
    app.use(express.json());
    app.use(createPiiGuardMiddleware({ logger, minimumConfidence: 0.2 }));
    app.get('/user', (_req, res) => {
      res.json({
        profile: {
          phone: '+1 555 111 2222',
          name: 'Casey Jones',
        },
      });
    });

    const response = await request(app).get('/user').expect(200);

    expect(response.body.profile.phone).toBe('+1 555 111 2222');
    expect(logger.info).toHaveBeenCalled();
    const logPayload = logger.info.mock.calls[0][0];

    expect(logPayload.piiScan.redactedResponsePreview).toContain('[REDACTED]');
    expect(logPayload.piiScan.requestFindings).toEqual([]);
  });
});
