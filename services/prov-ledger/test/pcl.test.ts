import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import pclRoutes from '../src/routes/pcl';
import { LedgerService } from '../src/services/LedgerService';
import { verify } from 'crypto';
import { merkleRoot } from '../src/utils/merkle';
import { eventBus } from '../src/utils/events';

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
        hash: 'sha256:abc123456'
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
        operatorId: 'user_1'
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
        licenseId: 'lic_cc_by'
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

    const reconstructedRoot = merkleRoot(manifest.entries.map((entry: any) => entry.hash));
    expect(reconstructedRoot).toBe(manifest.merkleRoot);

    const firstEntry = manifest.entries[0];
    const isValidSignature = verify(null, Buffer.from(firstEntry.hash, 'hex'), firstEntry.publicKey, Buffer.from(firstEntry.signature, 'base64'));
    expect(isValidSignature).toBe(true);
  });

  it('should emit CloudEvents for claims and manifests', async () => {
    // Drain any existing events
    eventBus.drain();

    const claimRes = await server.inject({
      method: 'POST',
      url: '/claim',
      payload: {
        subject: 'person:alice',
        predicate: 'owns',
        object: 'asset:report',
        evidenceRefs: ['ev_456'],
        confidence: 0.9,
        licenseId: 'lic_cc_by'
      }
    });
    expect(claimRes.statusCode).toBe(201);

    await server.inject({ method: 'GET', url: '/manifest/custom_bundle' });

    const events = eventBus.drain();
    const claimEvent = events.find(e => e.type === 'claims.v1.created');
    const manifestEvent = events.find(e => e.type === 'manifests.v1.emitted');

    expect(claimEvent).toBeDefined();
    expect(manifestEvent).toBeDefined();
    expect((manifestEvent as any).data.bundleId).toBe('custom_bundle');
  });
});
