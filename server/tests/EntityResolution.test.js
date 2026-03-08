"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EntityResolutionService_js_1 = require("../src/services/EntityResolutionService.js");
const ConflictResolutionService_js_1 = require("../src/services/ConflictResolutionService.js");
const HybridEntityResolutionService_js_1 = require("../src/services/HybridEntityResolutionService.js");
// Mock dependencies
globals_1.jest.mock('../src/services/HybridEntityResolutionService', () => ({
    resolveEntities: globals_1.jest.fn()
}));
globals_1.jest.mock('../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn()
    })),
    getNeo4jDriver: globals_1.jest.fn()
}));
// Mock Metrics
globals_1.jest.mock('prom-client', () => ({
    Histogram: globals_1.jest.fn().mockImplementation(() => ({
        observe: globals_1.jest.fn()
    })),
    Counter: globals_1.jest.fn().mockImplementation(() => ({
        inc: globals_1.jest.fn()
    })),
    Registry: globals_1.jest.fn(),
    collectDefaultMetrics: globals_1.jest.fn()
}));
(0, globals_1.describe)('Entity Resolution & Deduplication System', () => {
    let erService;
    let conflictResolver;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        erService = new EntityResolutionService_js_1.EntityResolutionService();
        conflictResolver = new ConflictResolutionService_js_1.ConflictResolutionService();
    });
    // TODO: Re-enable once resolveWithML method is implemented
    globals_1.describe.skip('ML-based Similarity Scoring', () => {
        (0, globals_1.it)('should correctly interpret high similarity from ML service', async () => {
            const mockEntityA = { name: 'John Doe', email: 'john@example.com' };
            const mockEntityB = { name: 'Jon Doe', email: 'john@example.com' };
            HybridEntityResolutionService_js_1.resolveEntities.mockResolvedValue({
                match: true,
                score: 0.95,
                explanation: { name: 0.9, email: 1.0 },
                confidence: 'high'
            });
            const result = await erService.resolveWithML(mockEntityA, mockEntityB);
            (0, globals_1.expect)(result.isMatch).toBe(true);
            (0, globals_1.expect)(result.score).toBe(0.95);
            (0, globals_1.expect)(result.confidence).toBe('high');
            (0, globals_1.expect)(HybridEntityResolutionService_js_1.resolveEntities).toHaveBeenCalledWith(JSON.stringify(mockEntityA), JSON.stringify(mockEntityB));
        });
        (0, globals_1.it)('should correctly interpret low similarity', async () => {
            const mockEntityA = { name: 'John Doe' };
            const mockEntityB = { name: 'Alice Smith' };
            HybridEntityResolutionService_js_1.resolveEntities.mockResolvedValue({
                match: false,
                score: 0.1,
                explanation: { name: 0.1 },
                confidence: 'low'
            });
            const result = await erService.resolveWithML(mockEntityA, mockEntityB);
            (0, globals_1.expect)(result.isMatch).toBe(false);
            (0, globals_1.expect)(result.confidence).toBe('low');
        });
    });
    (0, globals_1.describe)('Conflict Resolution', () => {
        (0, globals_1.it)('should resolve conflicts using LATEST_WINS strategy', () => {
            const target = {
                name: 'Old Name',
                email: 'test@example.com',
                updatedAt: '2023-01-01T00:00:00Z'
            };
            const source = {
                name: 'New Name',
                email: 'test@example.com', // Same email
                updatedAt: '2023-06-01T00:00:00Z'
            };
            const result = conflictResolver.resolveConflicts(target, source, ConflictResolutionService_js_1.ConflictResolutionStrategy.LATEST_WINS);
            (0, globals_1.expect)(result.name).toBe('New Name');
            (0, globals_1.expect)(result.email).toBe('test@example.com');
        });
        (0, globals_1.it)('should merge arrays regardless of strategy', () => {
            const target = { tags: ['tag1', 'tag2'] };
            const source = { tags: ['tag2', 'tag3'] };
            const result = conflictResolver.resolveConflicts(target, source, ConflictResolutionService_js_1.ConflictResolutionStrategy.LATEST_WINS);
            (0, globals_1.expect)(result.tags).toHaveLength(3);
            (0, globals_1.expect)(result.tags).toEqual(globals_1.expect.arrayContaining(['tag1', 'tag2', 'tag3']));
        });
        (0, globals_1.it)('should prioritize Source A if Source B is older in LATEST_WINS', () => {
            const target = {
                title: 'Correct Title',
                updatedAt: '2023-12-01T00:00:00Z'
            };
            const source = {
                title: 'Old Title',
                updatedAt: '2023-01-01T00:00:00Z'
            };
            const result = conflictResolver.resolveConflicts(target, source, ConflictResolutionService_js_1.ConflictResolutionStrategy.LATEST_WINS);
            (0, globals_1.expect)(result.title).toBe('Correct Title');
        });
        (0, globals_1.it)('should use SOURCE_PRIORITY strategy', () => {
            const target = {
                status: 'active',
                source: 'twitter'
            };
            const source = {
                status: 'inactive',
                source: 'linkedin'
            };
            // Priority: linkedin > twitter
            const priority = ['linkedin', 'twitter'];
            const result = conflictResolver.resolveConflicts(target, source, ConflictResolutionService_js_1.ConflictResolutionStrategy.SOURCE_PRIORITY, priority);
            (0, globals_1.expect)(result.status).toBe('inactive'); // LinkedIn wins
        });
    });
});
