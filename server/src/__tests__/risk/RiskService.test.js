"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RiskService_js_1 = require("../../risk/RiskService.js");
const RiskRepository_js_1 = require("../../db/repositories/RiskRepository.js");
const FeatureStore_js_1 = require("../../risk/FeatureStore.js");
globals_1.jest.mock('../../db/repositories/RiskRepository');
globals_1.jest.mock('../../risk/FeatureStore');
(0, globals_1.describe)('RiskService', () => {
    let service;
    let mockRepo;
    let mockStore;
    (0, globals_1.beforeEach)(() => {
        mockRepo = new RiskRepository_js_1.RiskRepository();
        mockStore = new FeatureStore_js_1.FeatureStore();
        RiskRepository_js_1.RiskRepository.mockImplementation(() => mockRepo);
        FeatureStore_js_1.FeatureStore.mockImplementation(() => mockStore);
        // Mock getFeatures to return something so compute works
        mockStore.getFeatures.mockResolvedValue({
            'feature_a': 1,
            'feature_b': 0.5
        });
        service = new RiskService_js_1.RiskService();
    });
    (0, globals_1.it)('should compute and persist risk score', async () => {
        const tenantId = 't1';
        const entityId = 'e1';
        await service.computeAndPersist(tenantId, entityId, 'Person', '24h');
        (0, globals_1.expect)(mockStore.getFeatures).toHaveBeenCalledWith(entityId, '24h');
        (0, globals_1.expect)(mockRepo.saveRiskScore).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenantId,
            entityId,
            entityType: 'Person',
            window: '24h',
            signals: globals_1.expect.arrayContaining([
                globals_1.expect.objectContaining({ type: 'feature_a' }),
                globals_1.expect.objectContaining({ type: 'feature_b' })
            ])
        }));
    });
});
