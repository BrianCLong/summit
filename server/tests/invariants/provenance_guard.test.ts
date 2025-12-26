import express from 'express';
import request from 'supertest';
import { provenanceGuardMiddleware } from '../../src/middleware/provenanceGuard';
import { invariantService } from '../../src/invariants/enforcer';

describe('Provenance Guard Middleware', () => {
  let app: express.Application;
  let violationSpy: jest.SpyInstance;

  beforeEach(() => {
    app = express();
    app.use(provenanceGuardMiddleware);

    // Violation spy
    violationSpy = jest.spyOn(invariantService, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should emit violation for POST request without provenance header', async () => {
    app.post('/test', (req, res) => {
      res.status(201).send({ success: true });
    });

    await request(app).post('/test').send({}).expect(201);

    // Wait for event loop (res.on('finish') is async)
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(violationSpy).toHaveBeenCalledWith('violation', expect.objectContaining({
      invariantId: 'INV-001-RESPONSE',
      details: expect.stringContaining('violated')
    }));
  });

  it('should NOT emit violation for POST request WITH provenance header', async () => {
    app.post('/test-good', (req, res) => {
      res.setHeader('X-Provenance-ID', 'prov_123');
      res.status(201).send({ success: true });
    });

    await request(app).post('/test-good').send({}).expect(201);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(violationSpy).not.toHaveBeenCalled();
  });

  it('should ignore GET requests', async () => {
    app.get('/test', (req, res) => {
      res.status(200).send({ success: true });
    });

    await request(app).get('/test').expect(200);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(violationSpy).not.toHaveBeenCalled();
  });
});
