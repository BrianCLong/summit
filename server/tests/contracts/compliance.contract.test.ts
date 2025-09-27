import type express from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('Compliance export and attestation contracts', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = await createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err: Error | undefined) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('ensures JSON export includes integrity headers', async () => {
    const res = await request(server).get('/api/compliance/export?framework=soc2&format=json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers).toHaveProperty('digest');
    expect(res.headers.digest).toMatch(/^sha-256=/);
    expect(res.headers).toHaveProperty('etag');
    expect(res.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);
    expect(res.body).toMatchObject({
      framework: 'soc2',
      controls: expect.any(Array),
    });
  });

  it('ensures PDF export publishes digest and etag', async () => {
    const res = await request(server).get('/api/compliance/export?framework=soc2&format=pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers.digest).toMatch(/^sha-256=/);
    expect(res.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);
    expect(Number(res.headers['content-length'] || '0')).toBeGreaterThan(0);
  });

  it('validates signed export contract', async () => {
    const res = await request(server).get('/api/compliance/export/signed?framework=fedramp');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers.digest).toMatch(/^sha-256=/);
    expect(res.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);
    expect(res.body.pack).toMatchObject({ framework: 'fedramp' });
    expect(res.body).toHaveProperty('signature');
  });

  it('contracts attestation response structure and headers', async () => {
    const res = await request(server).get('/api/federal/hsm/attestation');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers.digest).toMatch(/^sha-256=/);
    expect(res.headers.etag).toMatch(/^W\/"[a-f0-9]+"$/);
    expect(res.body).toMatchObject({
      fipsCompliant: expect.any(Boolean),
      hsmProvider: expect.any(String),
      mechanisms: expect.any(Array),
      nodeFipsEnabled: expect.any(Boolean),
      opensslFipsCapable: expect.any(Boolean),
    });
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
