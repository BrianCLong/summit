
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { RiskService } from '../../risk/RiskService.js';
import { RiskRepository } from '../../db/repositories/RiskRepository.js';
import { FeatureStore } from '../../risk/FeatureStore.js';

jest.mock('../../db/repositories/RiskRepository');
jest.mock('../../risk/FeatureStore');

describe('RiskService', () => {
  let service: RiskService;
  let mockRepo: jest.Mocked<RiskRepository>;
  let mockStore: jest.Mocked<FeatureStore>;

  beforeEach(() => {
    mockRepo = new RiskRepository() as any;
    mockStore = new FeatureStore() as any;
    (RiskRepository as jest.Mock).mockImplementation(() => mockRepo);
    (FeatureStore as jest.Mock).mockImplementation(() => mockStore);

    // Mock getFeatures to return something so compute works
    mockStore.getFeatures.mockResolvedValue({
      'feature_a': 1,
      'feature_b': 0.5
    });

    service = new RiskService();
  });

  it('should compute and persist risk score', async () => {
    const tenantId = 't1';
    const entityId = 'e1';

    await service.computeAndPersist(tenantId, entityId, 'Person', '24h');

    expect(mockStore.getFeatures).toHaveBeenCalledWith(entityId, '24h');
    expect(mockRepo.saveRiskScore).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      entityId,
      entityType: 'Person',
      window: '24h',
      signals: expect.arrayContaining([
        expect.objectContaining({ type: 'feature_a' }),
        expect.objectContaining({ type: 'feature_b' })
      ])
    }));
  });
});
