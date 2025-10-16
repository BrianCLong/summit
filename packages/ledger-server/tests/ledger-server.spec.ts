import request from 'supertest';
import express from 'express';
import { app } from '../src/index'; // Assuming your index.ts exports the app

describe('Ledger Server API', () => {
  test('POST /ledger/append should append an event', async () => {
    const newEvent = {
      type: 'ISSUE',
      payload: { kpwId: 'kpw-123' },
      signer: 'signer-id',
    };
    const res = await request(app).post('/ledger/append').send(newEvent);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toMatchObject(expect.objectContaining({ type: 'ISSUE' }));
  });

  test('GET /ledger/range should return a range of events', async () => {
    const res = await request(app).get('/ledger/range?from=0&to=1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  test('GET /ledger/last should return the last event', async () => {
    const res = await request(app).get('/ledger/last');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('eventId');
  });
});
