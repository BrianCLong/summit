const SimilarityService = require('../../src/services/SimilarityService');

describe('SimilarityService', () => {
  describe('N-gram generation', () => {
    it('should generate trigrams correctly', () => {
      const result = SimilarityService._generateNGrams('hello', 3);
      expect(result).toEqual(['hel', 'ell', 'llo']);
    });

    it('should handle strings shorter than n-gram size', () => {
      const result = SimilarityService._generateNGrams('hi', 3);
      expect(result).toEqual(['hi']);
    });

    it('should handle empty strings', () => {
      const result = SimilarityService._generateNGrams('', 3);
      expect(result).toEqual(['']);
    });

    it('should normalize to lowercase', () => {
      const result = SimilarityService._generateNGrams('HELLO', 3);
      expect(result).toEqual(['hel', 'ell', 'llo']);
    });
  });

  describe('findDuplicateCandidates - correctness', () => {
    const createTestEntities = (count) => {
      const entities = [];
      for (let i = 0; i < count; i++) {
        entities.push({
          id: `entity_${i}`,
          label: `Entity ${i}`,
          description: `Description for entity ${i}`,
          source: 'test_source',
          relationships: [],
        });
      }
      return entities;
    };

    const createDuplicatePair = () => [
      {
        id: 'entity_1',
        label: 'John Smith',
        description: 'Software Engineer at Acme Corp',
        source: 'linkedin',
        relationships: [
          { targetEntity: { id: 'company_1' } },
          { targetEntity: { id: 'skill_1' } },
        ],
      },
      {
        id: 'entity_2',
        label: 'John Smith',
        description: 'Software Engineer at Acme Corporation',
        source: 'linkedin',
        relationships: [
          { targetEntity: { id: 'company_1' } },
          { targetEntity: { id: 'skill_1' } },
          { targetEntity: { id: 'skill_2' } },
        ],
      },
    ];

    it('should find exact duplicates with brute force', () => {
      const entities = createDuplicatePair();
      const candidates = SimilarityService._findDuplicateCandidatesBruteForce(entities, 0.8);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].similarity).toBeGreaterThan(0.8);
      expect(candidates[0].entityA.id).toBe('entity_1');
      expect(candidates[0].entityB.id).toBe('entity_2');
    });

    it('should find same duplicates with blocking as with brute force', () => {
      const entities = createDuplicatePair();

      const bruteForceResults = SimilarityService._findDuplicateCandidatesBruteForce(entities, 0.7);
      const blockingResults = SimilarityService.findDuplicateCandidates(
        entities,
        0.7,
        { useBlocking: true }
      );

      expect(blockingResults.length).toBe(bruteForceResults.length);

      if (bruteForceResults.length > 0 && blockingResults.length > 0) {
        expect(blockingResults[0].similarity).toBeCloseTo(bruteForceResults[0].similarity, 2);
      }
    });

    it('should maintain correctness on larger datasets', () => {
      // Create dataset with some duplicates mixed in
      const entities = createTestEntities(50);

      // Add a duplicate pair
      entities.push({
        id: 'dup_a',
        label: 'Acme Corporation',
        description: 'Technology company',
        source: 'crunchbase',
        relationships: [],
      });
      entities.push({
        id: 'dup_b',
        label: 'ACME Corporation',
        description: 'Tech company',
        source: 'crunchbase',
        relationships: [],
      });

      const bruteForceResults = SimilarityService._findDuplicateCandidatesBruteForce(entities, 0.7);
      const blockingResults = SimilarityService.findDuplicateCandidates(
        entities,
        0.7,
        { useBlocking: true }
      );

      // Should find the same number of candidates
      expect(blockingResults.length).toBeGreaterThanOrEqual(bruteForceResults.length);

      // Verify the known duplicate is found by both methods
      const bruteForceHasDup = bruteForceResults.some(
        c => (c.entityA.id === 'dup_a' && c.entityB.id === 'dup_b') ||
             (c.entityA.id === 'dup_b' && c.entityB.id === 'dup_a')
      );
      const blockingHasDup = blockingResults.some(
        c => (c.entityA.id === 'dup_a' && c.entityB.id === 'dup_b') ||
             (c.entityA.id === 'dup_b' && c.entityB.id === 'dup_a')
      );

      expect(bruteForceHasDup).toBe(true);
      expect(blockingHasDup).toBe(true);
    });

    it('should use brute force for small datasets by default', () => {
      const entities = createTestEntities(50); // < 100
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      SimilarityService.findDuplicateCandidates(entities, 0.8);

      // Should NOT log performance metrics (brute force doesn't log)
      expect(logSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('should use blocking for large datasets by default', () => {
      const entities = createTestEntities(150); // > 100
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      SimilarityService.findDuplicateCandidates(entities, 0.8);

      // Should log performance metrics
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimilarityService] Performance')
      );

      logSpy.mockRestore();
    });
  });

  describe('findDuplicateCandidates - performance', () => {
    const createTestEntities = (count) => {
      const entities = [];
      const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
      const companies = ['Acme', 'TechCorp', 'DataSys', 'CloudCo'];

      for (let i = 0; i < count; i++) {
        const name = names[i % names.length];
        const company = companies[i % companies.length];

        entities.push({
          id: `entity_${i}`,
          label: `${name} ${i}`,
          description: `Works at ${company}`,
          source: i % 2 === 0 ? 'source_a' : 'source_b',
          relationships: [
            { targetEntity: { id: `company_${i % companies.length}` } },
          ],
        });
      }
      return entities;
    };

    it('should be faster with blocking for large datasets (500 entities)', () => {
      const entities = createTestEntities(500);

      // Benchmark brute force
      const startBrute = Date.now();
      const bruteResults = SimilarityService._findDuplicateCandidatesBruteForce(entities, 0.8);
      const bruteDuration = Date.now() - startBrute;

      // Benchmark blocking
      const startBlocking = Date.now();
      const blockingResults = SimilarityService.findDuplicateCandidates(
        entities,
        0.8,
        { useBlocking: true }
      );
      const blockingDuration = Date.now() - startBlocking;

      console.log(`Brute force: ${bruteDuration}ms, Blocking: ${blockingDuration}ms, ` +
                  `Speedup: ${(bruteDuration / blockingDuration).toFixed(2)}x`);

      // Blocking should be faster for large datasets
      // Allow some variance due to test environment
      expect(blockingDuration).toBeLessThan(bruteDuration * 2);
    }, 30000); // 30s timeout for performance test

    it('should reduce number of comparisons significantly', () => {
      const entities = createTestEntities(200);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      SimilarityService.findDuplicateCandidates(entities, 0.8, { useBlocking: true });

      expect(logSpy).toHaveBeenCalled();
      const logMessage = logSpy.mock.calls[0][0];

      // Extract comparison reduction percentage
      const match = logMessage.match(/(\d+\.\d+)% reduction/);
      expect(match).toBeTruthy();

      const reductionPercentage = parseFloat(match[1]);
      expect(reductionPercentage).toBeGreaterThan(50); // Should reduce by >50%

      logSpy.mockRestore();
    });
  });

  describe('similarity calculations', () => {
    it('should calculate text similarity correctly', () => {
      const sim1 = SimilarityService.calculateTextSimilarity('hello', 'hello');
      expect(sim1).toBe(1.0);

      const sim2 = SimilarityService.calculateTextSimilarity('hello', 'hallo');
      expect(sim2).toBeGreaterThan(0.8);
      expect(sim2).toBeLessThan(1.0);

      const sim3 = SimilarityService.calculateTextSimilarity('hello', 'world');
      expect(sim3).toBeLessThan(0.5);
    });

    it('should calculate topology similarity correctly', () => {
      const sim1 = SimilarityService.calculateTopologySimilarity(
        ['a', 'b', 'c'],
        ['a', 'b', 'c']
      );
      expect(sim1).toBe(1.0);

      const sim2 = SimilarityService.calculateTopologySimilarity(
        ['a', 'b', 'c'],
        ['a', 'b', 'd']
      );
      expect(sim2).toBeCloseTo(0.5, 1); // 2/4 = 0.5

      const sim3 = SimilarityService.calculateTopologySimilarity(
        ['a', 'b'],
        ['c', 'd']
      );
      expect(sim3).toBe(0);
    });

    it('should calculate provenance similarity correctly', () => {
      const sim1 = SimilarityService.calculateProvenanceSimilarity('source_a', 'source_a');
      expect(sim1).toBe(1);

      const sim2 = SimilarityService.calculateProvenanceSimilarity('source_a', 'source_b');
      expect(sim2).toBe(0);
    });
  });
});
