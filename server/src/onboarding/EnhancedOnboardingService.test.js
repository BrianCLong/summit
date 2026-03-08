"use strict";
/**
 * Enhanced Onboarding Service Tests
 *
 * Tests for the user onboarding system with guided tours and analytics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EnhancedOnboardingService_js_1 = require("./EnhancedOnboardingService.js");
// Mock the database pool
globals_1.jest.mock('../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => null),
}));
(0, globals_1.describe)('EnhancedOnboardingService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = EnhancedOnboardingService_js_1.EnhancedOnboardingService.getInstance();
    });
    (0, globals_1.describe)('getSampleContent', () => {
        (0, globals_1.it)('should return sample content for admin persona', async () => {
            const result = await service.getSampleContent('admin');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(result.governanceVerdict?.result).toBe('ALLOW');
        });
        (0, globals_1.it)('should filter sample content by type', async () => {
            const result = await service.getSampleContent('admin', 'policy');
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            result.data.forEach((sample) => {
                (0, globals_1.expect)(sample.type).toBe('policy');
            });
        });
        (0, globals_1.it)('should return analyst-specific content', async () => {
            const result = await service.getSampleContent('analyst');
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            result.data.forEach((sample) => {
                (0, globals_1.expect)(sample.persona).toContain('analyst');
            });
        });
    });
    (0, globals_1.describe)('getContextualHelp', () => {
        (0, globals_1.it)('should return contextual help items', async () => {
            const result = await service.getContextualHelp('/policies', 'user-123');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
        });
        (0, globals_1.it)('should sort help items by priority', async () => {
            const result = await service.getContextualHelp('/', 'user-123');
            if (result.data.length > 1) {
                for (let i = 0; i < result.data.length - 1; i++) {
                    (0, globals_1.expect)(result.data[i].priority).toBeGreaterThanOrEqual(result.data[i + 1].priority);
                }
            }
        });
    });
    (0, globals_1.describe)('governance compliance', () => {
        (0, globals_1.it)('should include governance verdict in all responses', async () => {
            const sampleResult = await service.getSampleContent('developer');
            const helpResult = await service.getContextualHelp('/', 'user-123');
            (0, globals_1.expect)(sampleResult.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(sampleResult.governanceVerdict?.verdictId).toBeDefined();
            (0, globals_1.expect)(sampleResult.governanceVerdict?.policyId).toBeDefined();
            (0, globals_1.expect)(helpResult.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(helpResult.governanceVerdict?.verdictId).toBeDefined();
        });
        (0, globals_1.it)('should include provenance in data envelope', async () => {
            const result = await service.getSampleContent('admin');
            (0, globals_1.expect)(result.provenance).toBeDefined();
            (0, globals_1.expect)(result.provenance.source).toBe('onboarding-service');
            (0, globals_1.expect)(result.provenance.provenanceId).toBeDefined();
        });
    });
    (0, globals_1.describe)('data classification', () => {
        (0, globals_1.it)('should classify data appropriately', async () => {
            const result = await service.getSampleContent('admin');
            (0, globals_1.expect)(result.classification).toBe('INTERNAL');
        });
    });
});
