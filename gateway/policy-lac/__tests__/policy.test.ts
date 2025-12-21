import request from 'supertest';
import express from 'express';
import { evaluate, loadDefaultPolicy } from '../src/policy-engine';
import '../src/index';

describe('policy endpoint', () => {
  const app = express();
  app.use(express.json());
  const policy = loadDefaultPolicy();
  app.post('/policy/explain', (req, res) => {
    const { action, resource, attributes } = req.body || {};
    if(!action || !resource){
      res.status(400).json({ error: 'action and resource are required' });
      return;
    }
    const decision = evaluate(policy, { action, resource, attributes: attributes ?? {} });
    res.json({ ...decision, input: { action, resource, attributes: attributes ?? {} } });
  });

  it('denies by default with reason', async () => {
    const res = await request(app).post('/policy/explain').send({ action: 'export:bundle', resource: 'case:1', attributes: { purpose: 'internal' } });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.reason).toContain('requires declared audience');
  });

  it('validates input', async () => {
    const res = await request(app).post('/policy/explain').send({});
    expect(res.status).toBe(400);
  });
});
