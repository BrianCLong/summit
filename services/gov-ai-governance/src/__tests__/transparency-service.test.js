"use strict";
/**
 * Transparency Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const transparency_service_js_1 = require("../transparency-service.js");
(0, vitest_1.describe)('TransparencyService', () => {
    let service;
    const testDecision = {
        modelId: '550e8400-e29b-41d4-a716-446655440000',
        citizenId: '550e8400-e29b-41d4-a716-446655440001',
        decisionType: 'benefits_eligibility',
        inputSummary: { income: 'below_threshold', dependents: 2 },
        outputSummary: { eligible: true, tier: 'standard' },
        confidence: 0.92,
        explanation: {
            humanReadable: 'Based on income level and number of dependents, you qualify for standard benefits.',
            technicalDetails: { model_version: '1.0.0', features_used: 15 },
            contributingFactors: [
                { factor: 'Income below threshold', weight: 0.6, direction: 'positive' },
                { factor: 'Number of dependents', weight: 0.3, direction: 'positive' },
                { factor: 'Employment status', weight: 0.1, direction: 'neutral' },
            ],
        },
        humanReviewRequired: false,
        appealable: true,
        appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    (0, vitest_1.beforeEach)(() => {
        service = new transparency_service_js_1.TransparencyService({ agency: 'Test Agency' });
    });
    (0, vitest_1.describe)('recordDecision', () => {
        (0, vitest_1.it)('should record decision with ID and timestamp', async () => {
            const decision = await service.recordDecision(testDecision);
            (0, vitest_1.expect)(decision.decisionId).toBeDefined();
            (0, vitest_1.expect)(decision.madeAt).toBeDefined();
            (0, vitest_1.expect)(decision.confidence).toBe(0.92);
        });
    });
    (0, vitest_1.describe)('getDecisionExplanation', () => {
        (0, vitest_1.it)('should return citizen-friendly explanation', async () => {
            const decision = await service.recordDecision(testDecision);
            const explanation = await service.getDecisionExplanation(decision.decisionId);
            (0, vitest_1.expect)(explanation).not.toBeNull();
            (0, vitest_1.expect)(explanation?.summary).toContain('qualify for standard benefits');
            (0, vitest_1.expect)(explanation?.factors).toHaveLength(3);
            (0, vitest_1.expect)(explanation?.appealInfo).toBeDefined();
        });
        (0, vitest_1.it)('should include appeal info for appealable decisions', async () => {
            const decision = await service.recordDecision(testDecision);
            const explanation = await service.getDecisionExplanation(decision.decisionId);
            (0, vitest_1.expect)(explanation?.appealInfo?.process).toContain('citizen portal');
        });
    });
    (0, vitest_1.describe)('fileAppeal', () => {
        (0, vitest_1.it)('should create appeal for appealable decision', async () => {
            const decision = await service.recordDecision(testDecision);
            const appeal = await service.fileAppeal(decision.decisionId, testDecision.citizenId, 'Income calculation did not include recent job loss');
            (0, vitest_1.expect)(appeal.appealId).toBeDefined();
            (0, vitest_1.expect)(appeal.status).toBe('pending_review');
        });
        (0, vitest_1.it)('should reject appeal for non-appealable decision', async () => {
            const nonAppealable = { ...testDecision, appealable: false };
            const decision = await service.recordDecision(nonAppealable);
            await (0, vitest_1.expect)(service.fileAppeal(decision.decisionId, testDecision.citizenId, 'Test')).rejects.toThrow(/not appealable/);
        });
    });
    (0, vitest_1.describe)('generateReport', () => {
        (0, vitest_1.it)('should generate transparency report with statistics', async () => {
            // Record some decisions
            await service.recordDecision(testDecision);
            await service.recordDecision({ ...testDecision, humanReviewRequired: true });
            const report = await service.generateReport(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
            (0, vitest_1.expect)(report.reportId).toBeDefined();
            (0, vitest_1.expect)(report.agency).toBe('Test Agency');
            (0, vitest_1.expect)(report.decisionsAugmented + report.decisionsAutomated).toBe(2);
        });
    });
    (0, vitest_1.describe)('audit trail', () => {
        (0, vitest_1.it)('should maintain hash-chained audit trail', async () => {
            await service.recordDecision(testDecision);
            await service.recordDecision(testDecision);
            const integrity = await service.verifyAuditIntegrity();
            (0, vitest_1.expect)(integrity.valid).toBe(true);
            (0, vitest_1.expect)(integrity.chainLength).toBeGreaterThanOrEqual(2);
        });
        (0, vitest_1.it)('should allow querying audit events', async () => {
            await service.recordDecision(testDecision);
            const events = await service.queryAuditTrail({
                eventType: 'decision_made',
                limit: 10,
            });
            (0, vitest_1.expect)(events.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(events[0].eventType).toBe('decision_made');
        });
    });
});
