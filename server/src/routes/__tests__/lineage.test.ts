import express from 'express';
import request from 'supertest';
import lineageRouter from '../lineage.js';

const app = express();
app.use(express.json());
app.use('/api/lineage', lineageRouter);

describe('lineage route', () => {
  it('returns lineage graph for a known id', async () => {
    const response = await request(app).get('/api/lineage/evidence-123');

    expect(response.status).toBe(200);
    expect(response.body.targetId).toBe('evidence-123');
    expect(response.body.mode).toBe('read-only');
    expect(response.body.upstream).toHaveLength(2);
    expect(response.body.downstream).toHaveLength(2);
    expect(response.body.policyTags).toContain('PII');
  });

  it('returns restricted context without leaking upstream details', async () => {
    const response = await request(app).get('/api/lineage/case-locked');

    expect(response.status).toBe(200);
    expect(response.body.restricted).toBe(true);
    expect(response.body.restrictionReason).toMatch(/warrant/i);
    expect(response.body.upstream[0].restricted).toBe(true);
  });

  it('returns 404 for unknown ids', async () => {
    const response = await request(app).get('/api/lineage/unknown');

    expect(response.status).toBe(404);
  });
});
