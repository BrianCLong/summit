import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const queryMock = jest.fn();

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', tenantId: 'tenant-1' };
    next();
  },
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: () => ({
    query: queryMock,
  }),
}));

const {
  claimRankingRouter,
  evidenceIndexRouter,
  evidenceTopRouter,
} = await import('../evidence-trail.js');

const app = express();
app.use('/api/evidence-index', evidenceIndexRouter);
app.use('/api/evidence-top', evidenceTopRouter);
app.use('/api/claim-ranking', claimRankingRouter);

describe('evidence-trail routes', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('returns timeline items with deterministic badge links', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'ev-1',
          artifact_type: 'sbom_report',
          storage_uri: 'https://example.test/ev-1',
          content_preview: 'SBOM capture',
          created_at: '2026-02-01T00:00:00.000Z',
          origin_url: null,
          weight: '0.72',
        },
      ],
    });

    const res = await request(app).get(
      '/api/evidence-index?answer_id=answer-1&node_id=node-1',
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      evidence_id: 'ev-1',
      weight: 0.72,
    });
    expect(res.body.items[0].badges[0].href).toBe(
      '/api/evidence/ev-1/badges.json',
    );
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [
      'answer-1',
      'tenant-1',
      'node-1',
    ]);
  });

  it('returns top evidence ordered by weight', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'ev-2',
          artifact_type: 'provenance_receipt',
          storage_uri: 'https://example.test/ev-2',
          content_preview: 'Receipt',
          created_at: '2026-02-01T00:00:00.000Z',
          origin_url: null,
          weight: '0.95',
        },
      ],
    });

    const res = await request(app).get(
      '/api/evidence-top?answer_id=answer-2&limit=5',
    );

    expect(res.status).toBe(200);
    expect(res.body.items[0].evidence_id).toBe('ev-2');
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [
      'answer-2',
      'tenant-1',
      5,
    ]);
  });

  it('returns only claims backed by deterministic badges and sorted by verifiability', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'claim-1',
            content: 'Claim one',
            confidence: 0.9,
            evidence_ids: ['ev-1'],
          },
          {
            id: 'claim-2',
            content: 'Claim two',
            confidence: 0.2,
            evidence_ids: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'ev-1', artifact_type: 'attestation_doc' }],
      });

    const res = await request(app).get('/api/claim-ranking?answer_id=answer-3');

    expect(res.status).toBe(200);
    expect(res.body.claims).toHaveLength(1);
    expect(res.body.claims[0]).toMatchObject({
      claim_id: 'claim-1',
      supporting: ['ev-1'],
    });
  });

  it('returns 400 for invalid query payloads', async () => {
    const res = await request(app).get('/api/evidence-top?answer_id=&limit=abc');
    expect(res.status).toBe(400);
  });
});
