import express from 'express';
import os from 'os';
import path from 'path';
import { mkdtemp } from 'fs/promises';
import request from 'supertest';
import { buildTurnaroundRouter } from '../turnaround.js';
import TurnaroundService from '../../services/TurnaroundService.js';

jest.mock(
  '../../middleware/auth.js',
  () => ({
    ensureAuthenticated: (req: any, _res: any, next: any) => {
      req.user = req.user ?? { id: 'user-1', role: 'admin' };
      next();
    },
    ensureRole:
      (roles: string[]) =>
      (req: any, res: any, next: any) => {
        const providedRole = req.headers['x-role'] as string;
        const roleToUse = roles.includes(providedRole) ? providedRole : roles[0];
        req.user = { ...(req.user ?? { id: 'user-1' }), role: roleToUse };
        if (!roles.includes(roleToUse)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      },
  }),
  { virtual: true },
);

describe('turnaround router', () => {
  const createApp = async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'turnaround-router-'));
    const service = new TurnaroundService(path.join(tempDir, 'state.json'));
    await service.ready();
    const app = express();
    app.use(express.json());
    app.use('/api/turnaround', buildTurnaroundRouter(service));
    return { app, service };
  };

  it('returns the 13-week forecast', async () => {
    const { app } = await createApp();
    const res = await request(app).get('/api/turnaround/forecast');
    expect(res.status).toBe(200);
    expect(res.body.weeks).toHaveLength(13);
  });

  it('enforces procurement gate approval flow', async () => {
    const { app } = await createApp();
    const createRes = await request(app)
      .post('/api/turnaround/procurements')
      .send({ vendor: 'VendorOne', description: 'Recurring SaaS', recurring: true, monthlyAmount: 10000 });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const approveCfo = await request(app)
      .post(`/api/turnaround/procurements/${id}/approve`)
      .send();
    expect(approveCfo.body.approvals.cfo).toBe(true);
    expect(approveCfo.body.status).toBe('pending_approval');

    const approveGc = await request(app)
      .post(`/api/turnaround/procurements/${id}/approve`)
      .set('x-role', 'gc')
      .send();
    expect(approveGc.body.approvals.gc).toBe(true);
    expect(approveGc.body.status).toBe('approved');
  });

  it('detects anomalies and exposes tickets', async () => {
    const { app } = await createApp();
    await request(app)
      .post('/api/turnaround/forecast/actuals')
      .send({ week: 1, actualIn: 1_000_000, actualOut: 2_200_000, note: 'Variance review' });

    const detectRes = await request(app).post('/api/turnaround/anomalies/detect');
    expect(detectRes.status).toBe(200);
    expect(detectRes.body.tickets.length).toBeGreaterThan(0);

    const listRes = await request(app).get('/api/turnaround/anomalies');
    expect(listRes.body.tickets.length).toBeGreaterThan(0);
  });

  it('supports dividend review, collections, and cost savings endpoints', async () => {
    const { app } = await createApp();
    const forecast = await request(app).get('/api/turnaround/forecast');
    const weekOne = forecast.body.weeks[0].week;
    await request(app)
      .post('/api/turnaround/forecast/actuals')
      .send({ week: weekOne, actualIn: 2_200_000, actualOut: 1_600_000 });
    const review = await request(app).post(`/api/turnaround/forecast/${weekOne}/review`).send();
    expect(review.status).toBe(200);
    expect(review.body.dividend.banked).toBeGreaterThan(0);

    const collections = await request(app).get('/api/turnaround/dashboard');
    const collectionId = collections.body.collections[0].id;
    const paid = await request(app)
      .post(`/api/turnaround/collections/${collectionId}/pay`)
      .set('x-role', 'finance_manager')
      .send({ amount: 950_000 });
    expect(paid.body.amountCollected).toBeGreaterThan(0);

    const shelfware = await request(app)
      .post('/api/turnaround/shelfware/reclaim')
      .set('x-role', 'admin')
      .send({ application: 'Collab', seatsReclaimed: 10, monthlyCostPerSeat: 40, owner: 'ITOps' });
    expect(shelfware.status).toBe(201);

    const cloud = await request(app)
      .post('/api/turnaround/cloud/rightsizing')
      .set('x-role', 'sre')
      .send({ description: 'Cap staging autoscaling', monthlySavings: 2000, owner: 'SRE' });
    expect(cloud.status).toBe(201);
  });
});
