import express from 'express';
import request from 'supertest';
import { createMLOpsControlPlaneRouter } from '../mlops-control-plane.js';
import { MLOpsControlPlaneService } from '../../services/mlops-control-plane/controlPlaneService.js';
import { MemoryPredictionCache } from '../../services/mlops-control-plane/predictionCache.js';
import { InMemoryReportStore } from '../../services/mlops-control-plane/reportStore.js';
import { MemoryDriftDetector } from '../../services/mlops-control-plane/driftDetector.js';

const buildApp = () => {
  const service = new MLOpsControlPlaneService(
    new MemoryPredictionCache(),
    new InMemoryReportStore(),
    new MemoryDriftDetector(9999),
    120,
    120,
  );

  const authMiddleware: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { id: 'user-1', roles: ['admin'] };
    next();
  };

  const noopLimiter: express.RequestHandler = (_req, _res, next) => {
    next();
  };

  const router = createMLOpsControlPlaneRouter({
    service,
    authMiddleware,
    authorizeFlush: async () => true,
    trainLimiter: noopLimiter,
    inferLimiter: noopLimiter,
  });

  const app = express();
  app.use(express.json());
  app.use('/mlops', router);
  return app;
};

describe('mlops control plane routes', () => {
  it('accepts training requests and returns a report', async () => {
    const app = buildApp();

    const trainRes = await request(app)
      .post('/mlops/train/base')
      .send({ entityId: 'entity-7', baseModelVersion: 'base-v1' });

    expect(trainRes.status).toBe(202);
    expect(trainRes.body).toMatchObject({ stage: 'base', modelVersion: 'base-v1' });

    const inferRes = await request(app)
      .post('/mlops/infer')
      .send({ entityId: 'entity-7', modelVersion: 'base-v1' });

    expect(inferRes.status).toBe(200);
    expect(inferRes.body).toMatchObject({
      schemaVersion: 'mlops-control-plane-v1',
      entityId: 'entity-7',
      modelVersion: 'base-v1',
    });

    const reportRes = await request(app).get('/mlops/report/entity-7');
    expect(reportRes.status).toBe(200);
    expect(reportRes.body).toHaveProperty('sections');

    const flushRes = await request(app).delete('/mlops/admin/flush');
    expect(flushRes.status).toBe(200);
    expect(flushRes.body).toHaveProperty('flushed');
  });

  it('rejects invalid requests with a 400', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/mlops/infer')
      .send({ entityId: '' });

    expect(res.status).toBe(400);
  });
});
