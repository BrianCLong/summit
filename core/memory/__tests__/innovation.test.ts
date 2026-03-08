import { calculateRelevance } from '../forgetting';
import { pack } from '../portability/pack';
import { verify } from '../portability/verify';
import { MemoryRecord } from '../types';

describe('Innovation Features', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Mutual Forgetting (Decay)', () => {
    const record: MemoryRecord = {
      userId: 'u1',
      id: 'r1',
      content: 'test',
      facets: {},
      purpose: 'assist',
      contextSpace: 'personal',
      sources: [],
      createdAt: Date.now() - (1000 * 60 * 60 * 10), // 10 hours ago
      expiresAt: Date.now() + 100000,
      visibility: 'user'
    };

    test('should return 1.0 when flag is OFF', () => {
      process.env.MEMORY_FORGETTING_ENABLED = 'false';
      expect(calculateRelevance(record)).toBe(1.0);
    });

    test('should return < 1.0 when flag is ON', () => {
      process.env.MEMORY_FORGETTING_ENABLED = 'true';
      expect(calculateRelevance(record)).toBeLessThan(1.0);
    });
  });

  describe('Portability', () => {
    const memories: MemoryRecord[] = [];

    test('should throw if flag is OFF', () => {
      process.env.MEMORY_PORTABILITY_ENABLED = 'false';
      expect(() => pack('u1', 'personal', memories)).toThrow(/disabled/);
    });

    test('should pack and verify if flag is ON', () => {
      process.env.MEMORY_PORTABILITY_ENABLED = 'true';
      const bundle = pack('u1', 'personal', memories);
      expect(bundle.signature).toBeDefined();
      expect(verify(bundle)).toBe(true);
    });
  });
});
