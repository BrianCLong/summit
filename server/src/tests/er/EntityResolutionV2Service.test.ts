import { EntityResolutionV2Service, EntityV2 } from '../../services/er/EntityResolutionV2Service.js';
import { soundex } from '../../services/er/soundex.js';

// Mock Neo4j session
const mockSession = {
  run: jest.fn(),
  beginTransaction: jest.fn().mockReturnValue({
    run: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn()
  }),
  close: jest.fn()
};

describe('EntityResolutionV2Service', () => {
  let service: EntityResolutionV2Service;

  beforeEach(() => {
    service = new EntityResolutionV2Service();
    jest.clearAllMocks();
  });

  describe('soundex', () => {
    it('should generate correct soundex codes', () => {
      expect(soundex('Robert')).toBe('R163');
      expect(soundex('Rupert')).toBe('R163');
      expect(soundex('Rubin')).toBe('R150');
      expect(soundex('Ashcraft')).toBe('A261');
    });
  });

  describe('generateSignals', () => {
    it('should extract phonetic and simple signals', () => {
      const entity: EntityV2 = {
        id: '1',
        labels: ['Entity'],
        properties: {
          name: 'Robert',
          userAgent: 'Mozilla/5.0',
          cryptoAddress: '0x123'
        }
      };

      const signals = service.generateSignals(entity);
      expect(signals.phonetic).toContain('R163');
      expect(signals.device).toContain('Mozilla/5.0');
      expect(signals.crypto).toContain('0x123');
    });
  });

  describe('explain', () => {
    it('should generate features and rationale for similar entities', () => {
      const e1: EntityV2 = {
        id: '1', labels: ['Entity'],
        properties: { name: 'Robert', cryptoAddress: '0x123' }
      };
      const e2: EntityV2 = {
        id: '2', labels: ['Entity'],
        properties: { name: 'Rupert', cryptoAddress: '0x123' }
      };

      const explanation = service.explain(e1, e2);
      expect(explanation.features.phonetic).toBe(1);
      expect(explanation.features.crypto).toBe(1);
      expect(explanation.rationale).toContain('Phonetic match on soundex code: R163');
      expect(explanation.rationale).toContain('Shared crypto address: 0x123');
      expect(explanation.score).toBeGreaterThan(0.5);
    });
  });

  describe('merge', () => {
    it('should enforce policy', async () => {
      const req = {
        masterId: 'm1',
        mergeIds: ['d1'],
        userContext: { clearances: [] },
        rationale: 'test'
      };

      // Mock fetching entities with sensitive labels
      mockSession.run.mockResolvedValueOnce({
        records: [
          { get: (k: string) => ({ properties: { id: 'm1', lac_labels: ['TOP_SECRET'] }, labels: [] }) },
          { get: (k: string) => ({ properties: { id: 'd1' }, labels: [] }) }
        ]
      });

      await expect(service.merge(mockSession as any, req)).rejects.toThrow('Policy violation');
    });
  });
});
