// server/tests/aurora.integration.spec.ts
import request from 'supertest';
import express from 'express';
import { auroraRouter } from '../src/routes/aurora';

const app = express();
app.use(express.json());
app.use('/api/aurora', auroraRouter);

describe('Project AURORA API Integration Tests', () => {
  it('should get the status of all implants', async () => {
    const res = await request(app).get('/api/aurora/implants');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should perform a handshake with a known implant', async () => {
    const implantsRes = await request(app).get('/api/aurora/implants');
    const implantId = implantsRes.body[0].implantId;
    const res = await request(app).post(`/api/aurora/handshake/${implantId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('online');
  });

  it('should return 404 for a handshake with an unknown implant', async () => {
    const res = await request(app).post('/api/aurora/handshake/unknown-id');
    expect(res.statusCode).toEqual(404);
  });

  it('should push a cortex overlay to an online implant', async () => {
    const implantsRes = await request(app).get('/api/aurora/implants');
    const implantId = implantsRes.body[0].implantId;
    await request(app).post(`/api/aurora/handshake/${implantId}`);
    const overlay = {
      targetImplantId: implantId,
      type: 'text',
      content: 'Integration test overlay',
      durationSeconds: 5,
      priority: 'high',
    };
    const res = await request(app).post('/api/aurora/cortex-overlay').send(overlay);
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('delivered');
  });

  it('should return 400 for a cortex overlay with missing data', async () => {
    const overlay = {
      targetImplantId: 'some-id',
      type: 'text',
      // Missing content
    };
    const res = await request(app).post('/api/aurora/cortex-overlay').send(overlay);
    expect(res.statusCode).toEqual(400);
  });
});
