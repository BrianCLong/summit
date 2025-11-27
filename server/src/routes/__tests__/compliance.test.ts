import { createApp } from '../../app';
import request from 'supertest';
import express from 'express';

let app: express.Application;

beforeAll(async () => {
  app = await createApp();
});

describe('GET /api/compliance/soc2-packet', () => {
  it('should return a 200 OK response and a valid SOC2 packet', async () => {
    const startDate = '2025-01-01T00:00:00.000Z';
    const endDate = '2025-12-31T23:59:59.999Z';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ startDate, endDate });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('auditPeriod');
    expect(response.body).toHaveProperty('controls');
    expect(Object.keys(response.body.controls)).toEqual(
      expect.arrayContaining(['CC6.1', 'CC7.1', 'CC8.1'])
    );
  });

  it('should return a 400 Bad Request if startDate is missing', async () => {
    const endDate = '2025-12-31T23:59:59.999Z';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ endDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('startDate and endDate query parameters are required.');
  });

  it('should return a 400 Bad Request if endDate is missing', async () => {
    const startDate = '2025-01-01T00:00:00.000Z';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ startDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('startDate and endDate query parameters are required.');
  });

  it('should return a 400 Bad Request for invalid date formats', async () => {
    const startDate = 'not-a-date';
    const endDate = '2025-12-31';

    const response = await request(app)
      .get('/api/compliance/soc2-packet')
      .query({ startDate, endDate });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid date format. Please use ISO 8061 format.');
  });

  // Note: A test for the authorization middleware would go here.
  // Since I cannot implement the actual auth, this is a placeholder.
  it.todo('should return a 403 Forbidden if the user is not a compliance-officer');
});
