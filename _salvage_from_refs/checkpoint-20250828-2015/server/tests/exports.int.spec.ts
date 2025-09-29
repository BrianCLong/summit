import request from 'supertest';
import { createApp } from '../src/app';
import jwt from 'jsonwebtoken';

describe('Export Gate Integration Tests', () => {
  let app: any;
  const devSecret = 'dev-secret'; // Matches the secret used in auth middleware

  beforeAll(async () => {
    app = await createApp();
  });

  test('should block restricted dataset export', async () => {
    const mockUser = { id: 'test-user', tenantId: 'test-tenant', role: 'analyst' };
    const token = jwt.sign(mockUser, devSecret);

    const res = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${token}`)
      .send({ datasetId: 'osint-feed-xyz', format: 'csv' });

    expect(res.statusCode).toEqual(403);
    expect(res.body.reason).toMatch(/Export blocked by license/i);
    expect(res.body.appealPath).toBe('/policy/appeal');
  });

  test('should allow public dataset export', async () => {
    const mockUser = { id: 'test-user', tenantId: 'test-tenant', role: 'analyst' };
    const token = jwt.sign(mockUser, devSecret);

    const res = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${token}`)
      .send({ datasetId: 'osint-feed-public', format: 'csv' });

    expect(res.statusCode).toEqual(202);
    expect(res.body.status).toBe('queued');
  });

  test('should return 404 for unknown dataset', async () => {
    const mockUser = { id: 'test-user', tenantId: 'test-tenant', role: 'analyst' };
    const token = jwt.sign(mockUser, devSecret);

    const res = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${token}`)
      .send({ datasetId: 'unknown-dataset', format: 'csv' });

    expect(res.statusCode).toEqual(404);
    expect(res.body.error).toBe('Dataset not found');
  });
});