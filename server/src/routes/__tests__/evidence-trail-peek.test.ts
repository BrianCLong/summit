import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

import evidenceTrailPeekRouter from '../evidence-trail-peek.js';
import {
  clearEvidenceTrailPeekFixtures,
  seedEvidenceTrailPeekFixture,
  type EvidenceItem,
} from '../../services/evidence-trail-peek.js';

describe('Evidence Trail Peek Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', evidenceTrailPeekRouter);

  beforeEach(() => {
    process.env.FEATURE_EVIDENCE_TRAIL_PEEK = 'true';
    clearEvidenceTrailPeekFixtures();
  });

  afterEach(() => {
    clearEvidenceTrailPeekFixtures();
    delete process.env.FEATURE_EVIDENCE_TRAIL_PEEK;
  });

  it('returns 400 when answer_id is missing', async () => {
    const response = await request(app).get('/api/evidence-index');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'answer_id required' });
  });

  it('filters claims without deterministic badges', async () => {
    const evidenceWithBadge: EvidenceItem = {
      evidence_id: 'e1',
      title: 'Evidence 1',
      url: '/evidence/e1',
      ts: new Date().toISOString(),
      weight: 0.9,
      badges: [{ kind: 'Test', href: '/evidence/e1/badges.json' }],
    };

    const evidenceWithoutBadge: EvidenceItem = {
      evidence_id: 'e2',
      title: 'Evidence 2',
      url: '/evidence/e2',
      ts: new Date().toISOString(),
      weight: 0.4,
      badges: [],
    };

    seedEvidenceTrailPeekFixture('answer-1', {
      timeline: [evidenceWithBadge, evidenceWithoutBadge],
      topEvidence: [],
      claims: [
        {
          claim_id: 'c1',
          text: 'Claim with deterministic badge',
          verifiability: 0.9,
          supporting: ['e1'],
          delta: 0.2,
        },
        {
          claim_id: 'c2',
          text: 'Claim without deterministic badge',
          verifiability: 0.8,
          supporting: ['e2'],
          delta: 0.1,
        },
      ],
    });

    const response = await request(app)
      .get('/api/claim-ranking')
      .query({ answer_id: 'answer-1' });

    expect(response.status).toBe(200);
    expect(response.body.claims).toHaveLength(1);
    expect(response.body.claims[0].claim_id).toBe('c1');
  });
});
