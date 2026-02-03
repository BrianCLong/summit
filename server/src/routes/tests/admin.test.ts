import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import adminRouter from '../admin.js';
import { SecretManager } from '../../services/secretManager.js';
import { MockServiceRegistry } from '../../services/serviceRegistry.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const app = express();
app.use(express.json());
app.use(adminRouter);

const secretManager = new SecretManager();
const serviceRegistry = new MockServiceRegistry();

describe('Admin Routes', () => {
  beforeEach(async () => {
    await secretManager.setSecret('TEST_SECRET', 'current', 'secret-value-1');
    await secretManager.setSecret('TEST_SECRET', 'v2', 'secret-value-2');
  });

  it('should rotate secrets successfully', async () => {
    mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });
    const res = await request(app)
      .post('/admin/secrets/rotate')
      .send({
        secretName: 'TEST_SECRET',
        newVersion: 'v2',
        services: ['test-service-1', 'test-service-2'],
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Secret rotation completed successfully');
    expect(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-2');
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4001/health');
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4002/health');
  });

  it('should roll back if health check fails', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'error' } });
    const res = await request(app)
      .post('/admin/secrets/rotate')
      .send({
        secretName: 'TEST_SECRET',
        newVersion: 'v2',
        services: ['test-service-1', 'test-service-2'],
      });
    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Service test-service-2 failed to restart with new secret');
    expect(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-1');
  });

  it('should return an error if parameters are missing', async () => {
    const res = await request(app)
      .post('/admin/secrets/rotate')
      .send({
        secretName: 'TEST_SECRET',
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Missing required parameters');
  });
});
