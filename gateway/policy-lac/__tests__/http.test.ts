import path from 'path';
import request from 'supertest';
import { createApp } from '../src/index';

const baseline = path.join(__dirname, '..', 'policies', 'examples', 'baseline.json');

describe('policy-lac http API', () => {
  const { app } = createApp(baseline);

  it('denies export when policy demands declared purpose', async () => {
    const res = await request(app)
      .post('/policy/explain')
      .send({ action: 'export:bundle', resource: 'case:123', attributes: { purpose: 'press' } });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(String(res.body.reason)).toContain('Export requires declared audience purpose');
    expect(res.body.matchedRuleId).toBe('deny-export-missing-purpose');
  });

  it('allows read below sensitivity threshold', async () => {
    const res = await request(app)
      .post('/policy/explain')
      .send({ action: 'graph:read', resource: 'node:1', attributes: { sensitivity: 'S1', labels: ['public'] } });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.policyVersion).toBe('v1');
  });

  it('handles malformed payloads defensively', async () => {
    const res = await request(app).post('/policy/explain').send({ resource: 'node:1' });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(String(res.body.reason)).toContain('Denied');
  });

  it('diffs against target policy using example contexts by default', async () => {
    const target = path.join(__dirname, '..', 'policies', 'examples', 'allow-read-low.json');
    const res = await request(app).post('/policy/diff').send({ targetPolicy: target });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.differences)).toBe(true);
  });
});
