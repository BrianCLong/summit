"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const datalab_service_1 = require("@intelgraph/datalab-service");
const sandbox_tenant_profile_1 = require("@intelgraph/sandbox-tenant-profile");
(0, vitest_1.describe)('DataCloneService', () => {
    let cloneService;
    let manager;
    (0, vitest_1.beforeEach)(async () => {
        cloneService = new datalab_service_1.DataCloneService();
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.describe)('clone', () => {
        (0, vitest_1.it)('should clone data with structure-only strategy', async () => {
            const profile = await manager.createProfile({ name: 'Clone Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const result = await cloneService.clone({
                id: 'clone-1',
                sandboxId: profile.id,
                name: 'Schema Clone',
                sourceType: datalab_service_1.DataSourceType.NEO4J,
                sourceConfig: { database: 'production' },
                strategy: datalab_service_1.CloneStrategy.STRUCTURE_ONLY,
                requestedBy: 'user-123',
                requestedAt: new Date(),
            }, activeProfile);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.statistics.clonedRecords).toBe(0); // Structure only
        });
        (0, vitest_1.it)('should clone with anonymization', async () => {
            const profile = await manager.createProfile({ name: 'Anonymize Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const result = await cloneService.clone({
                id: 'clone-2',
                sandboxId: profile.id,
                name: 'Anonymized Clone',
                sourceType: datalab_service_1.DataSourceType.POSTGRESQL,
                sourceConfig: { table: 'users' },
                strategy: datalab_service_1.CloneStrategy.ANONYMIZED,
                fieldAnonymization: [
                    {
                        fieldPath: 'email',
                        technique: datalab_service_1.AnonymizationTechnique.HASHING,
                        config: { hashAlgorithm: 'sha256' },
                    },
                    {
                        fieldPath: 'ssn',
                        technique: datalab_service_1.AnonymizationTechnique.REDACTION,
                        config: {},
                    },
                    {
                        fieldPath: 'name',
                        technique: datalab_service_1.AnonymizationTechnique.PSEUDONYMIZATION,
                        config: {},
                    },
                ],
                requestedBy: 'user-123',
                requestedAt: new Date(),
            }, activeProfile);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.audit.anonymizationReport.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should clone with sampling', async () => {
            const profile = await manager.createProfile({ name: 'Sample Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const result = await cloneService.clone({
                id: 'clone-3',
                sandboxId: profile.id,
                name: 'Sampled Clone',
                sourceType: datalab_service_1.DataSourceType.NEO4J,
                sourceConfig: { query: 'MATCH (n:Person) RETURN n' },
                strategy: datalab_service_1.CloneStrategy.SAMPLED,
                sampleSize: 100,
                sampleMethod: 'random',
                requestedBy: 'user-123',
                requestedAt: new Date(),
            }, activeProfile);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.statistics.clonedRecords).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should fail clone for suspended sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Suspended Test' }, 'user-123');
            await manager.activateProfile(profile.id);
            await manager.suspendProfile(profile.id, 'Test suspension');
            const suspendedProfile = await manager.getProfile(profile.id);
            await (0, vitest_1.expect)(cloneService.clone({
                id: 'clone-fail',
                sandboxId: profile.id,
                name: 'Should Fail',
                sourceType: datalab_service_1.DataSourceType.NEO4J,
                sourceConfig: {},
                strategy: datalab_service_1.CloneStrategy.SYNTHETIC,
                requestedBy: 'user-123',
                requestedAt: new Date(),
            }, suspendedProfile)).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('validation', () => {
        (0, vitest_1.it)('should validate anonymization rules cover PII fields', async () => {
            const profile = await manager.createProfile({ name: 'Validation Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            // Should warn about potentially missing anonymization
            const result = await cloneService.clone({
                id: 'clone-validate',
                sandboxId: profile.id,
                name: 'Validate Clone',
                sourceType: datalab_service_1.DataSourceType.POSTGRESQL,
                sourceConfig: { table: 'users' },
                strategy: datalab_service_1.CloneStrategy.ANONYMIZED,
                fieldAnonymization: [], // Empty - no anonymization rules
                requestedBy: 'user-123',
                requestedAt: new Date(),
            }, activeProfile);
            (0, vitest_1.expect)(result.audit.warnings.length).toBeGreaterThan(0);
        });
    });
});
(0, vitest_1.describe)('DataAnonymizer', () => {
    let anonymizer;
    (0, vitest_1.beforeEach)(() => {
        anonymizer = new datalab_service_1.DataAnonymizer();
    });
    (0, vitest_1.describe)('anonymize', () => {
        (0, vitest_1.it)('should redact sensitive data', () => {
            const result = anonymizer.anonymize('SSN: 123-45-6789', {
                technique: datalab_service_1.AnonymizationTechnique.REDACTION,
                config: {},
            });
            (0, vitest_1.expect)(result).toBe('[REDACTED]');
        });
        (0, vitest_1.it)('should hash data consistently', () => {
            const result1 = anonymizer.anonymize('test@example.com', {
                technique: datalab_service_1.AnonymizationTechnique.HASHING,
                config: { hashAlgorithm: 'sha256' },
            });
            const result2 = anonymizer.anonymize('test@example.com', {
                technique: datalab_service_1.AnonymizationTechnique.HASHING,
                config: { hashAlgorithm: 'sha256' },
            });
            (0, vitest_1.expect)(result1).toBe(result2);
            (0, vitest_1.expect)(result1).not.toBe('test@example.com');
        });
        (0, vitest_1.it)('should pseudonymize names consistently', () => {
            const result1 = anonymizer.anonymize('John Doe', {
                technique: datalab_service_1.AnonymizationTechnique.PSEUDONYMIZATION,
                config: { seed: 12345 },
            });
            const result2 = anonymizer.anonymize('John Doe', {
                technique: datalab_service_1.AnonymizationTechnique.PSEUDONYMIZATION,
                config: { seed: 12345 },
            });
            (0, vitest_1.expect)(result1).toBe(result2);
            (0, vitest_1.expect)(result1).not.toBe('John Doe');
        });
        (0, vitest_1.it)('should mask data preserving format', () => {
            const result = anonymizer.anonymize('4111-1111-1111-1111', {
                technique: datalab_service_1.AnonymizationTechnique.MASKING,
                config: {
                    maskChar: 'X',
                    maskFromStart: 0,
                    maskFromEnd: 4,
                    preserveFormat: true,
                },
            });
            (0, vitest_1.expect)(result).toMatch(/XXXX-XXXX-XXXX-\d{4}/);
        });
        (0, vitest_1.it)('should generalize numeric values', () => {
            const result = anonymizer.anonymize('25', {
                technique: datalab_service_1.AnonymizationTechnique.GENERALIZATION,
                config: { bucketSize: 10 },
            });
            (0, vitest_1.expect)(result).toBe('20-30');
        });
        (0, vitest_1.it)('should add noise to values', () => {
            const original = 100;
            const results = new Set();
            for (let i = 0; i < 10; i++) {
                const result = anonymizer.anonymize(String(original), {
                    technique: datalab_service_1.AnonymizationTechnique.NOISE_ADDITION,
                    config: { noiseRange: 10 },
                });
                results.add(parseFloat(result));
            }
            (0, vitest_1.expect)(results.size).toBeGreaterThan(1); // Some variation
        });
        (0, vitest_1.it)('should apply k-anonymity', () => {
            const data = [
                { age: 25, zipcode: '12345' },
                { age: 26, zipcode: '12345' },
                { age: 25, zipcode: '12346' },
            ];
            const result = anonymizer.applyKAnonymity(data, ['age', 'zipcode'], 2);
            // Values should be generalized to ensure k-anonymity
            (0, vitest_1.expect)(result.length).toBe(data.length);
        });
    });
    (0, vitest_1.describe)('detectPII', () => {
        (0, vitest_1.it)('should detect email addresses', () => {
            const hasPII = anonymizer.detectPII('test@example.com');
            (0, vitest_1.expect)(hasPII).toBe(true);
        });
        (0, vitest_1.it)('should detect SSN patterns', () => {
            const hasPII = anonymizer.detectPII('123-45-6789');
            (0, vitest_1.expect)(hasPII).toBe(true);
        });
        (0, vitest_1.it)('should detect credit card numbers', () => {
            const hasPII = anonymizer.detectPII('4111111111111111');
            (0, vitest_1.expect)(hasPII).toBe(true);
        });
        (0, vitest_1.it)('should not flag non-PII data', () => {
            const hasPII = anonymizer.detectPII('Hello World');
            (0, vitest_1.expect)(hasPII).toBe(false);
        });
    });
});
(0, vitest_1.describe)('SyntheticDataGenerator', () => {
    let generator;
    (0, vitest_1.beforeEach)(() => {
        generator = new datalab_service_1.SyntheticDataGenerator();
    });
    (0, vitest_1.describe)('generate', () => {
        (0, vitest_1.it)('should generate synthetic entities', async () => {
            const result = await generator.generate({
                sandboxId: 'sandbox-1',
                name: 'Test Generation',
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
                            { name: 'email', type: 'string', generator: 'email', config: {}, nullable: false, nullProbability: 0 },
                            { name: 'age', type: 'number', generator: 'age', config: { min: 18, max: 80 }, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [],
                    },
                ],
                config: {
                    totalEntities: 100,
                    seed: 12345,
                    locale: 'en',
                    generateRelationships: false,
                    connectivityDensity: 0.3,
                },
                outputFormat: 'json',
                requestedBy: 'user-123',
            });
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.statistics.entitiesGenerated).toBe(100);
        });
        (0, vitest_1.it)('should generate deterministic data with seed', async () => {
            const result1 = await generator.generate({
                sandboxId: 'sandbox-1',
                name: 'Seeded Test 1',
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [],
                    },
                ],
                config: {
                    totalEntities: 10,
                    seed: 42,
                    locale: 'en',
                    generateRelationships: false,
                    connectivityDensity: 0.3,
                },
                outputFormat: 'json',
                requestedBy: 'user-123',
            });
            const result2 = await generator.generate({
                sandboxId: 'sandbox-1',
                name: 'Seeded Test 2',
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [],
                    },
                ],
                config: {
                    totalEntities: 10,
                    seed: 42,
                    locale: 'en',
                    generateRelationships: false,
                    connectivityDensity: 0.3,
                },
                outputFormat: 'json',
                requestedBy: 'user-123',
            });
            (0, vitest_1.expect)(result1.sampleData).toEqual(result2.sampleData);
        });
        (0, vitest_1.it)('should generate relationships between entities', async () => {
            const result = await generator.generate({
                sandboxId: 'sandbox-1',
                name: 'Relationship Test',
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [
                            {
                                type: 'KNOWS',
                                targetEntityType: 'Person',
                                direction: 'outgoing',
                                probability: 0.5,
                                minCount: 1,
                                maxCount: 5,
                            },
                        ],
                    },
                ],
                config: {
                    totalEntities: 50,
                    seed: 12345,
                    locale: 'en',
                    generateRelationships: true,
                    connectivityDensity: 0.3,
                },
                outputFormat: 'json',
                requestedBy: 'user-123',
            });
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.statistics.relationshipsGenerated).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle multiple entity types', async () => {
            const result = await generator.generate({
                sandboxId: 'sandbox-1',
                name: 'Multi Entity Test',
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [],
                    },
                    {
                        entityType: 'Organization',
                        fields: [
                            { name: 'name', type: 'string', generator: 'companyName', config: {}, nullable: false, nullProbability: 0 },
                        ],
                        relationshipTypes: [],
                    },
                ],
                config: {
                    totalEntities: 100,
                    entityDistribution: { Person: 0.7, Organization: 0.3 },
                    seed: 12345,
                    locale: 'en',
                    generateRelationships: false,
                    connectivityDensity: 0.3,
                },
                outputFormat: 'json',
                requestedBy: 'user-123',
            });
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.statistics.byEntityType['Person']).toBeCloseTo(70, -1);
            (0, vitest_1.expect)(result.statistics.byEntityType['Organization']).toBeCloseTo(30, -1);
        });
    });
    (0, vitest_1.describe)('built-in generators', () => {
        (0, vitest_1.it)('should have common data generators', () => {
            const generators = generator.getAvailableGenerators();
            (0, vitest_1.expect)(generators).toContain('fullName');
            (0, vitest_1.expect)(generators).toContain('email');
            (0, vitest_1.expect)(generators).toContain('phone');
            (0, vitest_1.expect)(generators).toContain('address');
            (0, vitest_1.expect)(generators).toContain('uuid');
            (0, vitest_1.expect)(generators).toContain('date');
            (0, vitest_1.expect)(generators).toContain('companyName');
        });
    });
});
(0, vitest_1.describe)('PromotionWorkflow', () => {
    let workflow;
    let manager;
    (0, vitest_1.beforeEach)(async () => {
        workflow = new datalab_service_1.PromotionWorkflow();
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.describe)('createRequest', () => {
        (0, vitest_1.it)('should create a promotion request', async () => {
            const sandbox = await manager.createProfile({ name: 'Promote Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'query', id: 'query-1', name: 'Test Query', version: '1.0.0' }, 'This query improves performance', 'Revert to previous version');
            (0, vitest_1.expect)(request.id).toBeDefined();
            (0, vitest_1.expect)(request.status).toBe('draft');
            (0, vitest_1.expect)(request.sandboxId).toBe(sandbox.id);
        });
    });
    (0, vitest_1.describe)('submitForReview', () => {
        (0, vitest_1.it)('should submit request for review', async () => {
            const sandbox = await manager.createProfile({ name: 'Review Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'workflow', id: 'wf-1', name: 'Test Workflow' }, 'Justification text');
            const submitted = await workflow.submitForReview(request.id, [
                'reviewer-1',
                'reviewer-2',
            ]);
            (0, vitest_1.expect)(submitted.status).toBe('pending_review');
            (0, vitest_1.expect)(submitted.reviewers).toContain('reviewer-1');
            (0, vitest_1.expect)(submitted.reviewers).toContain('reviewer-2');
        });
    });
    (0, vitest_1.describe)('addApproval', () => {
        (0, vitest_1.it)('should add approval from reviewer', async () => {
            const sandbox = await manager.createProfile({ name: 'Approval Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'script', id: 'script-1', name: 'Test Script' }, 'Justification');
            await workflow.submitForReview(request.id, ['reviewer-1']);
            const approved = await workflow.addApproval(request.id, 'reviewer-1', 'approve', 'Looks good!');
            (0, vitest_1.expect)(approved.approvals.length).toBe(1);
            (0, vitest_1.expect)(approved.approvals[0].decision).toBe('approve');
        });
        (0, vitest_1.it)('should reject promotion request', async () => {
            const sandbox = await manager.createProfile({ name: 'Reject Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'model', id: 'model-1', name: 'Test Model' }, 'Justification');
            await workflow.submitForReview(request.id, ['reviewer-1']);
            const rejected = await workflow.addApproval(request.id, 'reviewer-1', 'reject', 'Security concerns');
            (0, vitest_1.expect)(rejected.status).toBe('rejected');
        });
    });
    (0, vitest_1.describe)('executePromotion', () => {
        (0, vitest_1.it)('should execute approved promotion', async () => {
            const sandbox = await manager.createProfile({ name: 'Execute Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'configuration', id: 'config-1', name: 'Test Config' }, 'Justification');
            await workflow.submitForReview(request.id, ['reviewer-1']);
            await workflow.addApproval(request.id, 'reviewer-1', 'approve');
            const promoted = await workflow.executePromotion(request.id);
            (0, vitest_1.expect)(promoted.status).toBe('promoted');
            (0, vitest_1.expect)(promoted.promotedAt).toBeDefined();
        });
        (0, vitest_1.it)('should fail to execute unapproved promotion', async () => {
            const sandbox = await manager.createProfile({ name: 'Fail Execute Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'query', id: 'query-1', name: 'Test' }, 'Justification');
            await (0, vitest_1.expect)(workflow.executePromotion(request.id)).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('rollback', () => {
        (0, vitest_1.it)('should rollback promoted request', async () => {
            const sandbox = await manager.createProfile({ name: 'Rollback Test' }, 'user-123');
            await manager.activateProfile(sandbox.id);
            const request = await workflow.createRequest(sandbox.id, 'prod-tenant-id', 'user-123', { type: 'query', id: 'query-1', name: 'Test' }, 'Justification', 'Rollback plan');
            await workflow.submitForReview(request.id, ['reviewer-1']);
            await workflow.addApproval(request.id, 'reviewer-1', 'approve');
            await workflow.executePromotion(request.id);
            const rolledBack = await workflow.rollback(request.id, 'Regression found');
            (0, vitest_1.expect)(rolledBack.status).toBe('rolled_back');
        });
    });
});
(0, vitest_1.describe)('Data Isolation', () => {
    let cloneService;
    let manager;
    (0, vitest_1.beforeEach)(() => {
        cloneService = new datalab_service_1.DataCloneService();
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.it)('should isolate data between sandboxes', async () => {
        const sandbox1 = await manager.createProfile({ name: 'Sandbox 1' }, 'user-1', 'dataLab');
        await manager.activateProfile(sandbox1.id);
        const sandbox2 = await manager.createProfile({ name: 'Sandbox 2' }, 'user-2', 'dataLab');
        await manager.activateProfile(sandbox2.id);
        const s1Profile = await manager.getProfile(sandbox1.id);
        const s2Profile = await manager.getProfile(sandbox2.id);
        // Clone to sandbox 1
        const clone1 = await cloneService.clone({
            id: 'clone-s1',
            sandboxId: sandbox1.id,
            name: 'S1 Clone',
            sourceType: datalab_service_1.DataSourceType.NEO4J,
            sourceConfig: {},
            strategy: datalab_service_1.CloneStrategy.SYNTHETIC,
            requestedBy: 'user-1',
            requestedAt: new Date(),
        }, s1Profile);
        // Clone to sandbox 2 should be independent
        const clone2 = await cloneService.clone({
            id: 'clone-s2',
            sandboxId: sandbox2.id,
            name: 'S2 Clone',
            sourceType: datalab_service_1.DataSourceType.NEO4J,
            sourceConfig: {},
            strategy: datalab_service_1.CloneStrategy.SYNTHETIC,
            requestedBy: 'user-2',
            requestedAt: new Date(),
        }, s2Profile);
        (0, vitest_1.expect)(clone1.sandboxId).not.toBe(clone2.sandboxId);
    });
    (0, vitest_1.it)('should not allow cross-sandbox data access', async () => {
        const sandbox1 = await manager.createProfile({ name: 'Sandbox 1' }, 'user-1', 'dataLab');
        await manager.activateProfile(sandbox1.id);
        const s1Profile = await manager.getProfile(sandbox1.id);
        // Attempt to clone from another sandbox should fail
        await (0, vitest_1.expect)(cloneService.clone({
            id: 'cross-clone',
            sandboxId: sandbox1.id,
            name: 'Cross Clone',
            sourceType: datalab_service_1.DataSourceType.INVESTIGATION,
            sourceConfig: { investigationId: 'other-sandbox-investigation' },
            strategy: datalab_service_1.CloneStrategy.SYNTHETIC,
            requestedBy: 'user-1',
            requestedAt: new Date(),
        }, s1Profile)).rejects.toThrow();
    });
});
