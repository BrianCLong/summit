import express from 'express';
import request from 'supertest';
import { newDb } from 'pg-mem';

const mockPg: any = {};

jest.mock('../../db/pg.js', () => ({ pg: mockPg }), { virtual: true });

const createPgMemAdapter = () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const query = (text: string, params?: any[]) => pool.query(text, params);
  const adapter = {
    write: async (q: string, params?: any[]) => (await query(q, params)).rows,
    read: async (q: string, params?: any[]) => (await query(q, params)).rows[0] ?? null,
    oneOrNone: async (q: string, params?: any[]) => (await query(q, params)).rows[0] ?? null,
    readMany: async (q: string, params?: any[]) => (await query(q, params)).rows,
  };
  return { adapter, db };
};

// Router must be imported after pg mock is wired
// eslint-disable-next-line @typescript-eslint/no-var-requires
const executiveOpsRouter = require('../executive-ops').default;

const buildApp = () => {
  const app = express();
  app.use('/executive-ops', executiveOpsRouter);
  return app;
};

describe('executive ops routes', () => {
  beforeEach(() => {
    const { adapter } = createPgMemAdapter();
    Object.assign(mockPg, adapter);
  });

  it('enforces canonical KPI list and variance commentary requirement', async () => {
    const app = buildApp();

    const missingCommentary = await request(app)
      .post('/executive-ops/kpis/new-arr/values')
      .send({
        periodStart: '2025-01-01',
        periodEnd: '2025-01-07',
        value: 100000,
        target: 110000,
      });

    expect(missingCommentary.status).toBe(400);

    const ok = await request(app)
      .post('/executive-ops/kpis/new-arr/values')
      .send({
        periodStart: '2025-01-01',
        periodEnd: '2025-01-07',
        value: 115000,
        target: 110000,
        commentary: 'Exceeded plan via enterprise win.',
        segment: { segment: 'enterprise', region: 'NA' },
      });

    expect(ok.status).toBe(201);
    expect(ok.body.scoreboard).toBeDefined();
    expect(ok.body.scoreboard.find((kpi: any) => kpi.slug === 'new-arr').latest.target).toBe(110000);
  });

  it('includes release and incident markers on scoreboard drilldowns', async () => {
    const app = buildApp();

    await request(app)
      .post('/executive-ops/release-markers')
      .send({
        kpiSlug: 'uptime-slo',
        service: 'api-gateway',
        version: 'v1.2.3',
        deployedAt: '2025-01-02T00:00:00Z',
        owner: 'SRE Lead',
      })
      .expect(201);

    await request(app)
      .post('/executive-ops/incident-markers')
      .send({
        kpiSlug: 'uptime-slo',
        service: 'api-gateway',
        severity: 'Sev1',
        summary: 'Regional outage',
        startedAt: '2025-01-03T00:00:00Z',
        resolvedAt: '2025-01-03T02:00:00Z',
        owner: 'Incident Commander',
      })
      .expect(201);

    const scoreboard = await request(app).get('/executive-ops/scoreboard');
    expect(scoreboard.status).toBe(200);
    const uptime = scoreboard.body.scoreboard.find((kpi: any) => kpi.slug === 'uptime-slo');
    expect(uptime.releaseMarkers).toHaveLength(1);
    expect(uptime.incidentMarkers).toHaveLength(1);
  });

  it('stores risk register entries with escalation when mitigation is overdue', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/executive-ops/risks')
      .send({
        category: 'reliability',
        probability: 0.8,
        impactDollars: 500000,
        customerImpact: 'Potential prolonged outage',
        owner: 'SRE Director',
        mitigations: 'Add progressive delivery + rollback',
        mitigationSla: '2024-01-01',
        evidenceLinks: ['incident-123'],
        leadingIndicators: ['error budget burn'],
        nextReview: '2025-02-01',
      });

    expect(response.status).toBe(201);
    const risk = response.body.risks.find((r: any) => r.category === 'reliability');
    expect(risk.escalated).toBe(true);
  });
});
