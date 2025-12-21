import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import pclRoutes from '../src/routes/pcl';
import { LedgerService } from '../src/services/LedgerService';

describe('PCL Service', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify();
    server.register(pclRoutes);
    await server.ready();
    LedgerService.getInstance()._reset();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should register evidence and return an ID', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/evidence',
      payload: {
        source: 'http://example.com/file.pdf',
        hash: 'sha256:abc123456',
        caseId: 'bundle_test_1'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.evidenceId).toMatch(/^ev_/);
  });

  it('should register a transform', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/transform',
      payload: {
        inputs: ['ev_123'],
        tool: 'ocr-v1',
        params: { lang: 'en' },
        outputs: ['ev_456'],
        operatorId: 'user_1',
        caseId: 'bundle_test_1'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.transformId).toMatch(/^tx_/);
  });

  it('should register a claim', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/claim',
      payload: {
        subject: 'person:bob',
        predicate: 'is_author_of',
        object: 'doc:report.pdf',
        evidenceRefs: ['ev_456'],
        confidence: 0.95,
        licenseId: 'lic_cc_by',
        caseId: 'bundle_test_1'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.claimId).toMatch(/^cl_/);
  });

  it('should generate a verifiable manifest', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/manifest/bundle_test_1'
    });
    expect(res.statusCode).toBe(200);
    const manifest = JSON.parse(res.payload);

    expect(manifest.bundleId).toBe('bundle_test_1');
    expect(manifest.entries.length).toBeGreaterThan(0);
    expect(manifest.merkleRoot).toBeDefined();

    // Verify integrity roughly
    const lastEntry = manifest.entries[manifest.entries.length - 1];
    expect(lastEntry.hash).toBe(manifest.merkleRoot);
  });
});
