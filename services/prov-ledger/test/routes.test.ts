import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import pclRoutes from '../src/routes/pcl';
import { LedgerService } from '../src/services/LedgerService';

describe('PCL Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify();
    server.register(pclRoutes);
    await server.ready();
  });

  beforeEach(async () => {
    await LedgerService.getInstance()._reset();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should accept caseId in input and export bundle', async () => {
    const caseId = 'case-route-1';

    // Create Evidence with caseId
    const res1 = await server.inject({
      method: 'POST',
      url: '/evidence',
      payload: {
        source: 's1',
        hash: 'h1',
        caseId
      }
    });
    expect(res1.statusCode).toBe(201);

    // Export Bundle
    const res2 = await server.inject({
      method: 'GET',
      url: `/bundle/${caseId}/export`
    });
    expect(res2.statusCode).toBe(200);
    const bundle = JSON.parse(res2.payload);
    expect(bundle.bundleId).toBe(caseId);
    expect(bundle.entries).toHaveLength(1);
  });
});
