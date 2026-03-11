import {
  adversarialAssetSchema,
  EngagementState,
  isValidTransition,
  InteractionEventCategory
} from '../adversarial-asset.js';

describe('AdversarialAsset Domain Model', () => {
  const validAsset = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    handle: '@adversary_one',
    sourceId: 'platform_x',
    type: 'ACCOUNT',
    engagementState: EngagementState.UNKNOWN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-123',
    confidence: 0.5,
  };

  test('should validate a correct AdversarialAsset instance', () => {
    const result = adversarialAssetSchema.safeParse(validAsset);
    expect(result.success).toBe(true);
  });

  test('should record interaction events correctly', () => {
    const assetWithInteractions = {
      ...validAsset,
      interactions: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date().toISOString(),
          category: 'NARRATIVE_DROP',
          description: 'Observed drop of coordinated narrative',
          contentIds: ['doc-1'],
        }
      ]
    };
    const result = adversarialAssetSchema.safeParse(assetWithInteractions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interactions).toHaveLength(1);
      expect(result.data.interactions[0].category).toBe('NARRATIVE_DROP');
    }
  });

  describe('State Transitions', () => {
    test('should allow valid transitions', () => {
      expect(isValidTransition(EngagementState.UNKNOWN, EngagementState.SUSPECTED)).toBe(true);
      expect(isValidTransition(EngagementState.SUSPECTED, EngagementState.CONFIRMED_ADVERSARIAL)).toBe(true);
      expect(isValidTransition(EngagementState.CONFIRMED_ADVERSARIAL, EngagementState.MONITORED)).toBe(true);
      expect(isValidTransition(EngagementState.MONITORED, EngagementState.TURNED_SENSOR)).toBe(true);
      expect(isValidTransition(EngagementState.TURNED_SENSOR, EngagementState.BURNED)).toBe(true);
    });

    test('should disallow invalid transitions', () => {
      expect(isValidTransition(EngagementState.UNKNOWN, EngagementState.TURNED_SENSOR)).toBe(false);
      expect(isValidTransition(EngagementState.MONITORED, EngagementState.UNKNOWN)).toBe(false);
      expect(isValidTransition(EngagementState.BURNED, EngagementState.MONITORED)).toBe(false);
    });

    test('should allow staying in the same state', () => {
      expect(isValidTransition(EngagementState.MONITORED, EngagementState.MONITORED)).toBe(true);
    });
  });

  test('should enforce confidence range (0-1)', () => {
    const invalidAsset = { ...validAsset, confidence: 1.5 };
    const result = adversarialAssetSchema.safeParse(invalidAsset);
    expect(result.success).toBe(false);
  });
});
