"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DataDiscoveryFusionEngine_js_1 = require("../DataDiscoveryFusionEngine.js");
(0, vitest_1.describe)('DataDiscoveryFusionEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new DataDiscoveryFusionEngine_js_1.DataDiscoveryFusionEngine({
            enableAutoDiscovery: false,
            enableLearning: true,
            enableEventPublishing: false, // Disable Redis in tests
        });
    });
    (0, vitest_1.afterEach)(async () => {
        await engine.stop();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should initialize with default config', () => {
            const stats = engine.getStats();
            (0, vitest_1.expect)(stats).toHaveProperty('sources', 0);
            (0, vitest_1.expect)(stats).toHaveProperty('profiles', 0);
            (0, vitest_1.expect)(stats).toHaveProperty('fusionResults', 0);
        });
    });
    (0, vitest_1.describe)('getStats', () => {
        (0, vitest_1.it)('should return engine statistics', () => {
            const stats = engine.getStats();
            (0, vitest_1.expect)(stats).toHaveProperty('uptime');
            (0, vitest_1.expect)(stats).toHaveProperty('sources');
            (0, vitest_1.expect)(stats).toHaveProperty('profiles');
            (0, vitest_1.expect)(stats).toHaveProperty('fusionResults');
            (0, vitest_1.expect)(stats).toHaveProperty('recipes');
            (0, vitest_1.expect)(stats).toHaveProperty('learning');
        });
    });
    (0, vitest_1.describe)('fuse', () => {
        (0, vitest_1.it)('should fuse records from multiple sources', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
                { sourceId: 'src2', recordId: '2', data: { name: 'John Doe', phone: '555-1234' } },
            ];
            const results = await engine.fuse(records, ['name']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].fusedRecord).toHaveProperty('email');
            (0, vitest_1.expect)(results[0].fusedRecord).toHaveProperty('phone');
        });
        (0, vitest_1.it)('should store fusion results', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'Test' } },
            ];
            const results = await engine.fuse(records, ['name']);
            const stored = engine.getFusionResult(results[0].id);
            (0, vitest_1.expect)(stored).toBeDefined();
            (0, vitest_1.expect)(stored?.id).toBe(results[0].id);
        });
    });
    (0, vitest_1.describe)('deduplicate', () => {
        (0, vitest_1.it)('should identify duplicate records', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
                { sourceId: 'src1', recordId: '2', data: { name: 'John', email: 'john@example.com' } },
            ];
            const results = await engine.deduplicate(records, ['name', 'email']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].duplicatesRemoved).toBe(1);
        });
    });
    (0, vitest_1.describe)('feedback', () => {
        (0, vitest_1.it)('should record and retrieve feedback', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'Test' } },
            ];
            const fusionResults = await engine.fuse(records, ['name']);
            const fusionId = fusionResults[0].id;
            const feedback = engine.recordFeedback('user1', fusionId, 'correct');
            (0, vitest_1.expect)(feedback.feedbackType).toBe('correct');
            (0, vitest_1.expect)(feedback.userId).toBe('user1');
            const retrieved = engine.getFeedback(fusionId);
            (0, vitest_1.expect)(retrieved).toHaveLength(1);
        });
    });
    (0, vitest_1.describe)('automation recipes', () => {
        (0, vitest_1.it)('should return available recipes', () => {
            const recipes = engine.getAutomationRecipes();
            (0, vitest_1.expect)(recipes.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(recipes.some(r => r.id === 'full-discovery')).toBe(true);
            (0, vitest_1.expect)(recipes.some(r => r.id === 'entity-fusion')).toBe(true);
        });
    });
    (0, vitest_1.describe)('addScanEndpoint', () => {
        (0, vitest_1.it)('should add scan endpoint', () => {
            engine.addScanEndpoint({
                type: 'database',
                uri: 'postgresql://localhost/test',
            });
            // No error thrown
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    (0, vitest_1.describe)('scan', () => {
        (0, vitest_1.it)('should execute scan and return results', async () => {
            const result = await engine.scan();
            (0, vitest_1.expect)(result).toHaveProperty('sources');
            (0, vitest_1.expect)(result).toHaveProperty('errors');
            (0, vitest_1.expect)(result).toHaveProperty('duration');
        });
    });
    (0, vitest_1.describe)('getLearningStats', () => {
        (0, vitest_1.it)('should return learning statistics', () => {
            const stats = engine.getLearningStats();
            (0, vitest_1.expect)(stats).toHaveProperty('totalFeedback');
            (0, vitest_1.expect)(stats).toHaveProperty('learnedRules');
        });
    });
});
