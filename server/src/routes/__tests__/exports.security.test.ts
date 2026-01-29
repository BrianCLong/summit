import { mock, describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';

describe('Exports Security', () => {
  let app: express.Express;

  before(async () => {
    console.log('Mock object keys:', Object.keys(mock));

    // Fallback or debug
    if (!mock.module) {
        throw new Error('mock.module is missing');
    }

    // Mock dependencies to avoid DB connections and side effects
    mock.module('../analytics/exports/ExportController.js', {
      namedExports: {
        exportData: (req: any, res: any) => res.send('mocked'),
      },
    });

    mock.module('../../exports/WatermarkVerificationService.js', {
      namedExports: {
        WatermarkVerificationService: class {
          verify() { return Promise.resolve({ valid: true }); }
        },
      },
    });

    mock.module('../../middleware/auth.js', {
      namedExports: {
        ensureAuthenticated: (req: any, res: any, next: any) => next(),
      },
    });

    mock.module('../../middleware/sensitive-context.js', {
      namedExports: {
        sensitiveContextMiddleware: (req: any, res: any, next: any) => next(),
      },
    });

    mock.module('../../middleware/high-risk-approval.js', {
      namedExports: {
        highRiskApprovalMiddleware: (req: any, res: any, next: any) => next(),
      },
    });

    // Import the router after mocking
    const exportsModule = await import('../exports.js');
    const exportsRouter = exportsModule.default;

    app = express();
    app.use(express.json());
    app.use('/', exportsRouter);

    // Enable verification for tests
    process.env.WATERMARK_VERIFY = 'true';
  });

  it('should reject path traversal in artifactId', async () => {
    const res = await request(app)
      .post('/exports/123/verify-watermark')
      .send({ artifactId: '../etc/passwd' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid artifactId');
  });

  it('should reject absolute path in artifactId', async () => {
    const res = await request(app)
      .post('/exports/123/verify-watermark')
      .send({ artifactId: '/etc/passwd' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid artifactId');
  });

  it('should reject complex path in artifactId', async () => {
    const res = await request(app)
      .post('/exports/123/verify-watermark')
      .send({ artifactId: 'a/b.txt' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid artifactId');
  });
});
