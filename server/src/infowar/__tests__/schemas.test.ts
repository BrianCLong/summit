import { describe, it, expect } from '@jest/globals';
import { NarrativeSchema, ClaimSchema, ConnectivityStateSchema, SITREPSchema } from '../schemas.js';

describe('InfoWar SITREP Schemas', () => {
  describe('NarrativeSchema', () => {
    it('validates a correct narrative', () => {
      const valid = {
        id: 'NAR:test-narrative',
        canonicalLabel: 'Test Narrative',
        keyPhrases: ['test'],
        firstSeenAt: new Date().toISOString(),
        languages: ['en'],
        intendedAudiences: ['global'],
        evidenceIds: ['EVD-1']
      };
      expect(NarrativeSchema.parse(valid)).toEqual(valid);
    });

    it('rejects invalid ID format', () => {
      const invalid = {
        id: 'INVALID:id',
        canonicalLabel: 'Test Narrative',
        keyPhrases: ['test'],
        firstSeenAt: new Date().toISOString(),
        languages: ['en'],
        intendedAudiences: ['global'],
        evidenceIds: ['EVD-1']
      };
      expect(() => NarrativeSchema.parse(invalid)).toThrow();
    });
  });

  describe('ClaimSchema', () => {
    it('validates a correct claim', () => {
      const valid = {
        id: 'CLM-001',
        text: 'This is a claim.',
        stance: 'pro',
        emotionalTone: 'angry',
        evidenceIds: ['EVD-2']
      };
      expect(ClaimSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('SITREPSchema', () => {
    it('validates a full SITREP', () => {
      const valid = {
        id: 'SITREP-2026-03',
        type: 'Monthly SITREP',
        generatedAt: new Date().toISOString(),
        narratives: [],
        claims: [],
        connectivity: [],
        evidenceIndex: {
          version: "1.0",
          item_slug: "INFOWAR",
          entries: []
        }
      };
      expect(SITREPSchema.parse(valid)).toEqual(valid);
    });
  });
});
