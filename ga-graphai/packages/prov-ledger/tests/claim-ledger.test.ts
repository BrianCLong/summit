import { describe, expect, it } from 'vitest';
import {
  ClaimLedger,
  canonicalHash,
} from '../src/index';

describe('ClaimLedger', () => {
  it('records ingest, transform, and api claims then produces a signed manifest', () => {
    const ledger = new ClaimLedger({
      chainId: 'test-chain',
      signer: 'unit-test',
      signingKey: 'very-secret-key',
      environment: 'test',
    });

    const ingest = ledger.recordIngestClaim({
      runId: 'run-1',
      jobId: 'job-1',
      tenantId: 'tenant-1',
      datasetId: 'dataset-1',
      source: {
        uri: 'file://source.csv',
        summary: { rows: 3 },
        mediaType: 'text/csv',
        label: 'raw-source',
      },
      output: {
        bytes: 512,
        recordCount: 3,
      },
      metadata: {
        connector: 'csv',
      },
    });

    const transform = ledger.recordTransformClaim({
      previousClaimId: ingest.claimId,
      transformId: 'normalize',
      tenantId: 'tenant-1',
      datasetId: 'dataset-1',
      runId: 'run-1',
      parameters: {
        steps: ['trim', 'lowercase'],
      },
      output: {
        bytes: 640,
        recordCount: 3,
      },
    });

    const api = ledger.recordApiClaim({
      previousClaimId: transform.claimId,
      requestId: 'req-1',
      datasetId: 'dataset-1',
      route: '/graphql',
      method: 'POST',
      statusCode: 200,
      request: { query: '{ ping }' },
      response: { data: { ping: 'pong' } },
    });

    expect(ingest.hash).toBeTruthy();
    expect(transform.previousHash).toBe(ingest.hash);
    expect(api.previousHash).toBe(transform.hash);
    expect(ledger.verifyChain()).toBe(true);

    const manifest = ledger.createExportManifest({
      exportId: 'export-1',
      datasetId: 'dataset-1',
      datasetName: 'Demo dataset',
      totalRecords: 3,
      destinationUri: 's3://bucket/demo.json',
      format: 'json',
      artifacts: [
        {
          path: 'exports/demo.json',
          bytes: 2048,
          claimId: api.claimId,
          role: 'dataset',
        },
        {
          path: 'exports/manifest.json',
          bytes: 1024,
          claimId: api.claimId,
          role: 'manifest',
        },
      ],
    });

    expect(manifest.claimChain.claims).toHaveLength(3);
    expect(manifest.claimChain.head).toBe(api.hash);
    expect(manifest.verification.manifestHash).toBeTruthy();
    expect(manifest.signatures).toHaveLength(1);

    const bundle = ledger.exportResyncBundle();
    expect(bundle.entries).toHaveLength(3);
    expect(bundle.headHash).toBe(api.hash);
  });

  it('produces stable canonical hashes for unordered objects', () => {
    const first = canonicalHash({
      b: 2,
      a: 1,
      nested: { z: true, m: [3, 2, 1] },
    });
    const second = canonicalHash({
      nested: { m: [3, 2, 1], z: true },
      a: 1,
      b: 2,
    });
    expect(first).toBe(second);
  });
});
