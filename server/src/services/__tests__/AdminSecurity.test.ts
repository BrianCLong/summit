import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { SecretManager } from '../secretManager.js';

const mockedAxios = {
  get: jest.fn(),
};

jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: mockedAxios,
  get: mockedAxios.get,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  ensureRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../middleware/authorization.js', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

const secretManager = new SecretManager();

describe('Admin Routes Security', () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: adminRouter } = await import('../../routes/admin.js');
    app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    await secretManager.setSecret('TEST_SECRET', 'current', 'secret-value-1');
    await secretManager.setSecret('TEST_SECRET', 'v2', 'secret-value-2');
  });

  it('should rotate secrets successfully', async () => {
    mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

    const res = await request(app).post('/admin/secrets/rotate').send({
      secretName: 'TEST_SECRET',
      newVersion: 'v2',
      services: ['test-service-1', 'test-service-2'],
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Secret rotation completed successfully');
    expect(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual(
      'secret-value-2',
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:4001/health',
      expect.objectContaining({ timeout: 5000 }),
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:4002/health',
      expect.objectContaining({ timeout: 5000 }),
    );
  });

  it('should roll back if health check fails', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'error' } });

    const res = await request(app).post('/admin/secrets/rotate').send({
      secretName: 'TEST_SECRET',
      newVersion: 'v2',
      services: ['test-service-1', 'test-service-2'],
    });

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual(
      'Service test-service-2 failed to restart with new secret',
    );
    expect(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual(
      'secret-value-1',
    );
  });

  it('should return an error if parameters are missing', async () => {
    const res = await request(app).post('/admin/secrets/rotate').send({
      secretName: 'TEST_SECRET',
    });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Missing required parameters');
  });
});
