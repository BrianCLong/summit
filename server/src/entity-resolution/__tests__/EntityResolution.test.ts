import { EntityResolver } from '../engine/EntityResolver';
import { NaiveBayesModel } from '../models/NaiveBayesModel';
import { IntelGraphService } from '../../services/IntelGraphService';
import { jest } from '@jest/globals';

// Mock dependencies
// We need to mock dependencies that have side effects or complex imports
jest.mock('../../graph/neo4j', () => ({
    runCypher: jest.fn()
}));

jest.mock('../../services/IntelGraphService');
jest.mock('../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue(true as never)
  }
}));

describe('EntityResolver with NaiveBayesModel', () => {
  let resolver: EntityResolver;
  let mockGraphService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup GraphService Mock
    mockGraphService = {
      getNodeById: jest.fn(),
      findSimilarNodes: jest.fn(),
      ensureNode: jest.fn(),
      createEdge: jest.fn(),
    };

    // @ts-ignore
    IntelGraphService.getInstance = jest.fn(() => mockGraphService);

    resolver = new EntityResolver(new NaiveBayesModel());
  });

  describe('findDuplicates', () => {
    it('should identify a high confidence duplicate based on strong signals', async () => {
      const target = {
        id: 't1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        label: 'Person'
      };

      const candidate = {
        id: 'c1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        label: 'Person'
      };

      mockGraphService.getNodeById.mockResolvedValue(target);
      mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);

      const results = await resolver.findDuplicates('tenant-1', 't1');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchCandidateId).toBe('c1');
      expect(results[0].confidence).toBe('high');
      expect(results[0].suggestedAction).toBe('auto_merge');
    });

    it('should identify a medium confidence duplicate with partial match', async () => {
      const target = {
        id: 't1',
        name: 'Johnathan Doe',
        email: 'j.doe@example.com',
        label: 'Person'
      };

      const candidate = {
        id: 'c2',
        name: 'John Doe',
        email: 'j.doe@example.com', // Email matches
        label: 'Person'
      };

      mockGraphService.getNodeById.mockResolvedValue(target);
      mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);

      const results = await resolver.findDuplicates('tenant-1', 't1');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchCandidateId).toBe('c2');
      // Email match is strong (weight 5), name is fuzzy. Should be high or medium.
      // LogOdds starts at -4.6. Email +5 -> 0.4. Name fuzzy maybe +1.5 -> 1.9.
      // 1.9 LogOdds is > 85% prob.
      expect(['high', 'medium']).toContain(results[0].confidence);
    });

    it('should reject low similarity candidates', async () => {
      const target = {
        id: 't1',
        name: 'John Doe',
        email: 'john@example.com',
        label: 'Person'
      };

      const candidate = {
        id: 'c3',
        name: 'Jane Smith',
        email: 'jane@example.com',
        label: 'Person'
      };

      mockGraphService.getNodeById.mockResolvedValue(target);
      mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);

      const results = await resolver.findDuplicates('tenant-1', 't1');

      // Should filter out if below threshold (default 0.7 which is high)
      // NB Model returns low prob for this.
      expect(results.length).toBe(0);
    });
  });

  describe('NaiveBayesModel logic', () => {
    const model = new NaiveBayesModel();

    it('should return high score for identical entities', async () => {
      const features = {
        name_levenshtein: 1,
        name_jaro_winkler: 1,
        name_token_jaccard: 1,
        name_soundex_match: 1,
        name_metaphone_match: 1,
        address_cosine: 1,
        phone_match: 1,
        email_match: 1,
        date_similarity: 1
      };

      const result = await model.predict(features);
      expect(result.score).toBeGreaterThan(0.95);
      expect(result.suggestedAction).toBe('auto_merge');
    });

    it('should return low score for mismatches', async () => {
      const features = {
        name_levenshtein: 0.2,
        name_jaro_winkler: 0.2,
        name_token_jaccard: 0,
        name_soundex_match: 0,
        name_metaphone_match: 0,
        address_cosine: 0,
        phone_match: 0,
        email_match: 0, // Mismatch penalizes
        date_similarity: 0
      };

      const result = await model.predict(features);
      expect(result.score).toBeLessThan(0.1);
    });
  });
});
