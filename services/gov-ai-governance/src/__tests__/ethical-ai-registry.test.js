"use strict";
/**
 * Ethical AI Registry Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ethical_ai_registry_js_1 = require("../ethical-ai-registry.js");
(0, vitest_1.describe)('EthicalAIRegistry', () => {
    let registry;
    const validModelData = {
        name: 'Benefits Eligibility Model',
        version: '1.0.0',
        purpose: 'Determine citizen eligibility for government benefits',
        riskLevel: 'high',
        dataCategories: ['personal_identity', 'financial'],
        ethicalReview: {
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'ethics-board',
            principlesAssessed: [
                'fairness', 'accountability', 'transparency', 'privacy',
                'security', 'human_oversight', 'non_discrimination',
                'explainability', 'proportionality', 'lawfulness',
            ],
            findings: [
                { principle: 'fairness', status: 'compliant' },
                { principle: 'accountability', status: 'compliant' },
                { principle: 'transparency', status: 'compliant' },
                { principle: 'privacy', status: 'compliant' },
                { principle: 'security', status: 'compliant' },
                { principle: 'human_oversight', status: 'compliant' },
                { principle: 'non_discrimination', status: 'compliant' },
                { principle: 'explainability', status: 'compliant' },
                { principle: 'proportionality', status: 'compliant' },
                { principle: 'lawfulness', status: 'compliant' },
            ],
            overallStatus: 'approved',
        },
        humanOversightRequired: true,
        appealMechanismEnabled: true,
        sourceCodeHash: 'sha256:abc123',
        trainingDataLineage: 'census-2023-anonymized',
        deploymentEnvironments: ['development'],
    };
    (0, vitest_1.beforeEach)(() => {
        registry = new ethical_ai_registry_js_1.EthicalAIRegistry();
    });
    (0, vitest_1.describe)('registerModel', () => {
        (0, vitest_1.it)('should register model with complete ethical review', async () => {
            const model = await registry.registerModel(validModelData);
            (0, vitest_1.expect)(model.modelId).toBeDefined();
            (0, vitest_1.expect)(model.registeredAt).toBeDefined();
            (0, vitest_1.expect)(model.name).toBe('Benefits Eligibility Model');
        });
        (0, vitest_1.it)('should reject model with incomplete ethical review', async () => {
            const incompleteData = {
                ...validModelData,
                ethicalReview: {
                    ...validModelData.ethicalReview,
                    principlesAssessed: ['fairness', 'accountability'], // Missing principles
                },
            };
            await (0, vitest_1.expect)(registry.registerModel(incompleteData)).rejects.toThrow(/Missing principles/);
        });
        (0, vitest_1.it)('should reject unacceptable risk models', async () => {
            const unacceptableData = {
                ...validModelData,
                riskLevel: 'unacceptable',
            };
            await (0, vitest_1.expect)(registry.registerModel(unacceptableData)).rejects.toThrow(/unacceptable risk/);
        });
        (0, vitest_1.it)('should require human oversight for high-risk models', async () => {
            const noOversightData = {
                ...validModelData,
                humanOversightRequired: false,
            };
            await (0, vitest_1.expect)(registry.registerModel(noOversightData)).rejects.toThrow(/human oversight/);
        });
    });
    (0, vitest_1.describe)('deployModel', () => {
        (0, vitest_1.it)('should block deployment without compliance assessment for production', async () => {
            const model = await registry.registerModel(validModelData);
            const result = await registry.deployModel(model.modelId, 'production');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.blockers).toContain('No valid compliance assessment');
        });
        (0, vitest_1.it)('should allow deployment after compliance and bias assessment', async () => {
            const model = await registry.registerModel(validModelData);
            // Add compliance assessment
            await registry.assessCompliance(model.modelId, 'nist-ai-rmf-1.0', 'auditor-1', [
                { requirementId: 'govern-1', status: 'met' },
                { requirementId: 'map-1', status: 'met' },
                { requirementId: 'measure-1', status: 'met' },
                { requirementId: 'manage-1', status: 'met' },
            ]);
            // Add bias assessment (required for high-risk models)
            await registry.updateBiasAssessment(model.modelId, {
                assessedAt: new Date().toISOString(),
                protectedAttributes: ['age', 'gender'],
                disparateImpactRatios: { age: 0.92, gender: 0.95 },
                mitigationsApplied: ['resampling'],
            });
            const result = await registry.deployModel(model.modelId, 'production');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.blockers).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('assessCompliance', () => {
        (0, vitest_1.it)('should calculate compliance percentage correctly', async () => {
            const model = await registry.registerModel(validModelData);
            const assessment = await registry.assessCompliance(model.modelId, 'nist-ai-rmf-1.0', 'auditor-1', [
                { requirementId: 'govern-1', status: 'met' },
                { requirementId: 'map-1', status: 'met' },
                { requirementId: 'measure-1', status: 'partially_met' },
                { requirementId: 'manage-1', status: 'not_met' },
            ]);
            (0, vitest_1.expect)(assessment.overallCompliance).toBe(50); // 2 of 4 met
        });
    });
    (0, vitest_1.describe)('getStandards', () => {
        (0, vitest_1.it)('should return built-in compliance standards', () => {
            const standards = registry.getStandards();
            (0, vitest_1.expect)(standards.length).toBeGreaterThanOrEqual(3);
            (0, vitest_1.expect)(standards.map((s) => s.standardId)).toContain('nist-ai-rmf-1.0');
            (0, vitest_1.expect)(standards.map((s) => s.standardId)).toContain('eu-ai-act-2024');
            (0, vitest_1.expect)(standards.map((s) => s.standardId)).toContain('eo-14110-2023');
        });
    });
});
