import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import evidenceTrailPeekRouter from '../evidence-trail-peek.js';
import { pg } from '../../db/pg.js';

jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user', tenantId: 'tenant-1', role: 'ANALYST' };
    next();
  },
}));

jest.mock('../../db/pg.js', () => ({
  pg: {
    readMany: jest.fn(),
  },
}));

const readManyMock = pg.readMany as unknown as jest.Mock;

describe('Evidence Trail Peek API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', evidenceTrailPeekRouter);
    readManyMock.mockReset();
  });

  it('rejects requests without scope parameters', async () => {
    const response = await request(app).get('/api/evidence-index');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'answer_id or node_id required' });
  });

  it('returns evidence index timeline and counts', async () => {
    readManyMock.mockImplementation((query: string) => {
      if (query.includes('FROM claims_registry')) {
        return [
          {
            id: 'claim-1',
            content: 'Claim one',
            confidence: 0.9,
            claim_type: 'factual',
            extracted_at: '2026-02-07T10:00:00Z',
            created_at: '2026-02-07T10:00:00Z',
          },
        ];
      }
      if (query.includes('FROM evidence_artifacts')) {
        return [
          {
            id: 'evidence-1',
            artifact_type: 'sbom',
            storage_uri: 's3://evidence/1',
            content_preview: 'preview',
            created_at: '2026-02-07T11:00:00Z',
          },
        ];
      }
      return [];
    });

    const response = await request(app).get('/api/evidence-index?answer_id=answer-1');
    expect(response.status).toBe(200);
    expect(response.body.timeline).toHaveLength(2);
    expect(response.body.claimCount).toBe(1);
    expect(response.body.evidenceCount).toBe(1);
  });

  it('returns top artifacts with configured limit', async () => {
    readManyMock.mockImplementation((query: string) => {
      if (query.includes('FROM claims_registry')) {
        return [{ id: 'claim-1' }, { id: 'claim-2' }];
      }
      if (query.includes('FROM evidence_artifacts')) {
        return [
          {
            id: 'evidence-1',
            artifact_type: 'attestation',
            storage_uri: 's3://evidence/1',
            content_preview: null,
            created_at: '2026-02-07T11:00:00Z',
          },
        ];
      }
      return [];
    });

    const response = await request(app).get('/api/evidence-top?node_id=node-1&limit=1');
    expect(response.status).toBe(200);
    expect(response.body.artifacts).toHaveLength(1);
    expect(response.body.artifacts[0].artifactType).toBe('attestation');
  });

  it('returns only ranked claims with deterministic badges', async () => {
    readManyMock.mockImplementation((query: string) => {
      if (query.includes('FROM claims_registry')) {
        return [
          { id: 'claim-1', content: 'Claim 1', confidence: 0.9, claim_type: 'factual', extracted_at: null },
          { id: 'claim-2', content: 'Claim 2', confidence: 0.8, claim_type: 'factual', extracted_at: null },
          { id: 'claim-3', content: 'Claim 3', confidence: 0.7, claim_type: 'factual', extracted_at: null },
          { id: 'claim-4', content: 'Claim 4', confidence: 0.95, claim_type: 'factual', extracted_at: null },
        ];
      }
      if (query.includes('FROM claim_evidence_links')) {
        return [
          { claim_id: 'claim-1', id: 'evidence-1', artifact_type: 'sbom', storage_uri: 's3://evidence/1' },
          { claim_id: 'claim-2', id: 'evidence-2', artifact_type: 'attestation', storage_uri: 's3://evidence/2' },
          { claim_id: 'claim-2', id: 'evidence-3', artifact_type: 'test', storage_uri: 's3://evidence/3' },
          { claim_id: 'claim-3', id: 'evidence-4', artifact_type: 'provenance', storage_uri: 's3://evidence/4' },
          { claim_id: 'claim-4', id: 'evidence-5', artifact_type: 'log', storage_uri: 's3://evidence/5' },
        ];
      }
      return [];
    });

    const response = await request(app).get('/api/claim-ranking?answer_id=answer-1');
    expect(response.status).toBe(200);
    expect(response.body.claims).toHaveLength(3);
    expect(response.body.claims.every((claim: any) => claim.badges.length > 0)).toBe(true);
  });
});
