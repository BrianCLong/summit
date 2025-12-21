import request from 'supertest';
import { app } from '../src/index';

describe('policy-lac explain endpoint', () => {
  it('denies unsafe operations with reasons', async () => {
    const response = await request(app).post('/policy/explain').send({ query: '{ dangerousOp }' });
    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(false);
    expect(response.body.reason).toContain('Denied');
    expect(response.body.violations).toContain('dangerousOp');
  });

  it('allows safe queries', async () => {
    const response = await request(app).post('/policy/explain').send({ query: '{ secureAction }' });
    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
    expect(response.body.violations).toEqual([]);
  });
});
