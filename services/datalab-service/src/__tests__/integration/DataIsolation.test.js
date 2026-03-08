"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const uuid_1 = require("uuid");
const sandbox_tenant_profile_1 = require("@intelgraph/sandbox-tenant-profile");
const DataCloneService_js_1 = require("../../data/DataCloneService.js");
const DataLabAPI_js_1 = require("../../api/DataLabAPI.js");
const index_js_1 = require("../../types/index.js");
(0, vitest_1.describe)('Data Isolation Integration Tests', () => {
    let configManager;
    let enforcer;
    let cloneService;
    let dataLabAPI;
    let sandboxProfile;
    const testUserId = 'test-user-123';
    const testOwnerId = 'owner-456';
    (0, vitest_1.beforeEach)(async () => {
        configManager = new sandbox_tenant_profile_1.SandboxConfigManager();
        enforcer = new sandbox_tenant_profile_1.SandboxEnforcer();
        cloneService = new DataCloneService_js_1.DataCloneService();
        dataLabAPI = new DataLabAPI_js_1.DataLabAPI();
        // Create a test sandbox profile
        sandboxProfile = await configManager.createProfile({
            name: 'Integration Test Sandbox',
            description: 'Sandbox for data isolation testing',
            expiresInDays: 1,
        }, testOwnerId);
        sandboxProfile = await configManager.activateProfile(sandboxProfile.id);
    });
    (0, vitest_1.afterEach)(() => {
        // Cleanup
        enforcer.clearLinkbackAttempts(sandboxProfile.id);
    });
    (0, vitest_1.describe)('Tenant Isolation', () => {
        (0, vitest_1.it)('should enforce tenant scoping on all queries', async () => {
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.filters).toBeDefined();
            // Verify tenant filter is present
            const tenantFilter = decision.filters?.find(f => f.field === 'tenantId');
            (0, vitest_1.expect)(tenantFilter).toBeDefined();
            (0, vitest_1.expect)(tenantFilter?.value).toBe(sandboxProfile.id);
        });
        (0, vitest_1.it)('should add production source filter', async () => {
            const filters = enforcer.getDataFilters(sandboxProfile);
            const sourceFilter = filters.find(f => f.field === 'sourceType');
            (0, vitest_1.expect)(sourceFilter).toBeDefined();
            (0, vitest_1.expect)(sourceFilter?.operator).toBe('ne');
            (0, vitest_1.expect)(sourceFilter?.value).toBe('production');
        });
        (0, vitest_1.it)('should prevent cross-tenant mutations', async () => {
            // Mutation should only affect sandbox data
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.MUTATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings).toContain('Mutations only affect sandbox data');
        });
    });
    (0, vitest_1.describe)('Federation Blocking', () => {
        (0, vitest_1.it)('should block all federation operations', async () => {
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.FEDERATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.FEDERATION_BLOCKED);
        });
        (0, vitest_1.it)('should block federation connector usage', async () => {
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.FEDERATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
    });
    (0, vitest_1.describe)('Linkback Prevention', () => {
        (0, vitest_1.it)('should block attempts to link to production data', async () => {
            const decision = await enforcer.checkLinkback(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
                resourceId: 'entity-123',
            }, 'prod_entity-456');
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.LINKBACK_BLOCKED);
        });
        (0, vitest_1.it)('should log all linkback attempts', async () => {
            await enforcer.checkLinkback(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
            }, 'prod_123');
            await enforcer.checkLinkback(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: 'another-user',
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
            }, 'prod_456');
            const attempts = enforcer.getLinkbackAttempts(sandboxProfile.id);
            (0, vitest_1.expect)(attempts).toHaveLength(2);
            (0, vitest_1.expect)(attempts[0].blocked).toBe(true);
            (0, vitest_1.expect)(attempts[1].blocked).toBe(true);
        });
        (0, vitest_1.it)('should calculate risk scores for linkback attempts', async () => {
            const exportDecision = await enforcer.checkLinkback(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
            }, 'prod_123');
            const queryDecision = await enforcer.checkLinkback(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.QUERY,
            });
            const attempts = enforcer.getLinkbackAttempts(sandboxProfile.id);
            // Export operations should have higher risk
            (0, vitest_1.expect)(attempts[0].riskScore).toBeGreaterThan(attempts[1].riskScore);
        });
    });
    (0, vitest_1.describe)('Export Restrictions', () => {
        (0, vitest_1.it)('should block exports when disabled', async () => {
            // Default profile has exports disabled
            (0, vitest_1.expect)(sandboxProfile.resourceQuotas.maxDataExportMb).toBe(0);
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.EXPORT_BLOCKED);
        });
        (0, vitest_1.it)('should allow exports when enabled within quota', async () => {
            sandboxProfile.resourceQuotas.maxDataExportMb = 100;
            sandboxProfile.integrationRestrictions.allowExternalExports = false;
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
                // No target endpoint = internal export
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
        (0, vitest_1.it)('should block external exports when not allowed', async () => {
            sandboxProfile.resourceQuotas.maxDataExportMb = 100;
            sandboxProfile.integrationRestrictions.allowExternalExports = false;
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
                targetEndpoint: 'external-system.example.com',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.EXPORT_BLOCKED);
        });
    });
    (0, vitest_1.describe)('PII Protection', () => {
        (0, vitest_1.it)('should detect and block PII fields when configured', async () => {
            sandboxProfile.dataAccessPolicy.piiHandling = 'block';
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
                dataFields: ['id', 'name', 'ssn', 'status'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.PII_DETECTED);
        });
        (0, vitest_1.it)('should warn about PII when redacting', async () => {
            sandboxProfile.dataAccessPolicy.piiHandling = 'redact';
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
                dataFields: ['id', 'name', 'email', 'status'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings.some(w => w.includes('PII'))).toBe(true);
        });
        (0, vitest_1.it)('should detect various PII field patterns', async () => {
            sandboxProfile.dataAccessPolicy.piiHandling = 'block';
            const piiFields = [
                'ssn',
                'social_security_number',
                'credit_card',
                'email_address',
                'phone_number',
                'date_of_birth',
                'password',
                'api_key',
            ];
            for (const field of piiFields) {
                const decision = await enforcer.enforce(sandboxProfile, {
                    sandboxId: sandboxProfile.id,
                    userId: testUserId,
                    operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
                    dataFields: ['id', field],
                });
                (0, vitest_1.expect)(decision.allowed).toBe(false);
                (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.PII_DETECTED);
            }
        });
    });
    (0, vitest_1.describe)('Connector Restrictions', () => {
        (0, vitest_1.it)('should allow configured connectors', async () => {
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.DATABASE,
                targetEndpoint: 'sandbox-db',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
        (0, vitest_1.it)('should block connectors in blocklist', async () => {
            // Add production to blocklist
            const dbConnector = sandboxProfile.connectorRestrictions.find(c => c.connectorType === sandbox_tenant_profile_1.ConnectorType.DATABASE);
            if (dbConnector) {
                dbConnector.blocklist = ['production-*'];
            }
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.DATABASE,
                targetEndpoint: 'production-main',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
        (0, vitest_1.it)('should block external services for enhanced isolation', async () => {
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.EXTERNAL_SERVICE,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
    });
    (0, vitest_1.describe)('Airgapped Isolation', () => {
        let airgappedProfile;
        (0, vitest_1.beforeEach)(async () => {
            airgappedProfile = await configManager.createProfile({
                name: 'Airgapped Test Sandbox',
                isolationLevel: sandbox_tenant_profile_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 1,
            }, testOwnerId);
            airgappedProfile = await configManager.activateProfile(airgappedProfile.id);
        });
        (0, vitest_1.it)('should block all network operations', async () => {
            (0, vitest_1.expect)(airgappedProfile.resourceQuotas.maxNetworkBytesPerHour).toBe(0);
        });
        (0, vitest_1.it)('should block API connectors', async () => {
            const decision = await enforcer.enforce(airgappedProfile, {
                sandboxId: airgappedProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.API,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
        });
        (0, vitest_1.it)('should only allow local database access', async () => {
            const decision = await enforcer.enforce(airgappedProfile, {
                sandboxId: airgappedProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.CONNECTOR_USE,
                connectorType: sandbox_tenant_profile_1.ConnectorType.DATABASE,
                targetEndpoint: 'sandbox-db',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('Data Clone Isolation', () => {
        (0, vitest_1.it)('should enforce synthetic-only data in synthetic mode', async () => {
            sandboxProfile.dataAccessPolicy.mode = sandbox_tenant_profile_1.DataAccessMode.SYNTHETIC_ONLY;
            const cloneRequest = {
                id: (0, uuid_1.v4)(),
                sandboxId: sandboxProfile.id,
                name: 'Test Clone',
                sourceType: index_js_1.DataSourceType.NEO4J,
                sourceConfig: {},
                strategy: index_js_1.CloneStrategy.ANONYMIZED, // Should fail
                fieldAnonymization: [],
                outputFormat: 'neo4j',
                includeRelationships: true,
                preserveGraph: true,
                requestedBy: testUserId,
                requestedAt: new Date(),
            };
            await (0, vitest_1.expect)(cloneService.clone(cloneRequest, sandboxProfile)).rejects.toMatchObject({
                code: 'DATALAB_VALIDATION_FAILED',
            });
        });
        (0, vitest_1.it)('should allow synthetic clone in any mode', async () => {
            const cloneRequest = {
                id: (0, uuid_1.v4)(),
                sandboxId: sandboxProfile.id,
                name: 'Synthetic Clone',
                sourceType: index_js_1.DataSourceType.NEO4J,
                sourceConfig: {},
                strategy: index_js_1.CloneStrategy.SYNTHETIC,
                fieldAnonymization: [],
                outputFormat: 'neo4j',
                includeRelationships: true,
                preserveGraph: true,
                requestedBy: testUserId,
                requestedAt: new Date(),
            };
            const result = await cloneService.clone(cloneRequest, sandboxProfile);
            (0, vitest_1.expect)(result.status).toBe('completed');
        });
    });
    (0, vitest_1.describe)('Rate Limiting', () => {
        (0, vitest_1.it)('should enforce rate limits', async () => {
            sandboxProfile.resourceQuotas.maxExecutionsPerHour = 5;
            // Execute up to the limit
            for (let i = 0; i < 5; i++) {
                const decision = await enforcer.enforce(sandboxProfile, {
                    sandboxId: sandboxProfile.id,
                    userId: testUserId,
                    operation: sandbox_tenant_profile_1.OperationType.QUERY,
                });
                (0, vitest_1.expect)(decision.allowed).toBe(true);
            }
            // Next should be blocked
            const blockedDecision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(blockedDecision.allowed).toBe(false);
            (0, vitest_1.expect)(blockedDecision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.QUOTA_EXCEEDED);
        });
    });
    (0, vitest_1.describe)('Sandbox Lifecycle', () => {
        (0, vitest_1.it)('should block operations on suspended sandbox', async () => {
            const suspended = await configManager.suspendProfile(sandboxProfile.id, 'Test suspension');
            const decision = await enforcer.enforce(suspended, {
                sandboxId: suspended.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.SUSPENDED);
        });
        (0, vitest_1.it)('should block operations on expired sandbox', async () => {
            sandboxProfile.expiresAt = new Date('2020-01-01');
            const decision = await enforcer.enforce(sandboxProfile, {
                sandboxId: sandboxProfile.id,
                userId: testUserId,
                operation: sandbox_tenant_profile_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(sandbox_tenant_profile_1.SandboxErrorCode.EXPIRED);
        });
    });
});
