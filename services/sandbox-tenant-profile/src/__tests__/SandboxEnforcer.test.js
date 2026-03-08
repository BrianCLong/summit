"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SandboxEnforcer_js_1 = require("../enforcement/SandboxEnforcer.js");
const SandboxConfigManager_js_1 = require("../config/SandboxConfigManager.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('SandboxEnforcer', () => {
    let enforcer;
    let configManager;
    let testProfile;
    const testUserId = 'user-123';
    const testOwnerId = 'owner-456';
    (0, vitest_1.beforeEach)(async () => {
        enforcer = new SandboxEnforcer_js_1.SandboxEnforcer();
        configManager = new SandboxConfigManager_js_1.SandboxConfigManager();
        testProfile = await configManager.createProfile({
            name: 'Test Sandbox',
            expiresInDays: 30,
        }, testOwnerId);
        // Activate the profile for testing
        testProfile = await configManager.activateProfile(testProfile.id);
    });
    (0, vitest_1.describe)('enforce', () => {
        (0, vitest_1.it)('should allow queries with filters', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.filters).toBeDefined();
            (0, vitest_1.expect)(decision.filters?.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should allow mutations within sandbox', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.MUTATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings).toContain('Mutations only affect sandbox data');
        });
        (0, vitest_1.it)('should block federation operations', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.FEDERATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.FEDERATION_BLOCKED);
        });
        (0, vitest_1.it)('should block operations on suspended sandbox', async () => {
            const suspendedProfile = await configManager.suspendProfile(testProfile.id, 'Security review');
            const decision = await enforcer.enforce(suspendedProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.SUSPENDED);
        });
        (0, vitest_1.it)('should block operations on expired sandbox', async () => {
            testProfile.expiresAt = new Date('2020-01-01');
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.EXPIRED);
        });
    });
    (0, vitest_1.describe)('enforceExport', () => {
        (0, vitest_1.it)('should block exports when disabled', async () => {
            // Default profile has exports disabled
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.EXPORT,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.EXPORT_BLOCKED);
        });
        (0, vitest_1.it)('should allow exports when enabled and within quota', async () => {
            testProfile.resourceQuotas.maxDataExportMb = 100;
            testProfile.integrationRestrictions.allowExternalExports = true;
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.EXPORT,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings).toContain('Export limited to 100MB');
        });
    });
    (0, vitest_1.describe)('enforceConnector', () => {
        (0, vitest_1.it)('should allow database connector by default', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.DATABASE,
                targetEndpoint: 'sandbox-db',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
        (0, vitest_1.it)('should block federation connector', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.FEDERATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
        (0, vitest_1.it)('should respect blocklist patterns', async () => {
            // Find API connector and add blocklist
            const apiConnector = testProfile.connectorRestrictions.find(c => c.connectorType === index_js_1.ConnectorType.API);
            if (apiConnector) {
                apiConnector.blocklist = ['production-*'];
            }
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.API,
                targetEndpoint: 'production-api',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
        (0, vitest_1.it)('should require connector type to be specified', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.CONNECTOR_BLOCKED);
        });
    });
    (0, vitest_1.describe)('enforceDataAccess', () => {
        (0, vitest_1.it)('should detect and block PII fields when configured', async () => {
            testProfile.dataAccessPolicy.piiHandling = 'block';
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.DATA_ACCESS,
                dataFields: ['name', 'ssn', 'email', 'address'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.PII_DETECTED);
        });
        (0, vitest_1.it)('should warn about PII when redacting', async () => {
            testProfile.dataAccessPolicy.piiHandling = 'redact';
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.DATA_ACCESS,
                dataFields: ['name', 'ssn', 'status'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings.some(w => w.includes('PII'))).toBe(true);
        });
        (0, vitest_1.it)('should allow data access without PII fields', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.DATA_ACCESS,
                dataFields: ['id', 'name', 'status', 'createdAt'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('checkLinkback', () => {
        (0, vitest_1.it)('should always block linkback attempts', async () => {
            const decision = await enforcer.checkLinkback(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.DATA_ACCESS,
                resourceId: 'entity-123',
            }, 'prod_entity-456');
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.code).toBe(index_js_1.SandboxErrorCode.LINKBACK_BLOCKED);
        });
        (0, vitest_1.it)('should record linkback attempts', async () => {
            await enforcer.checkLinkback(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.DATA_ACCESS,
                resourceId: 'entity-123',
            }, 'prod_entity-456');
            const attempts = enforcer.getLinkbackAttempts(testProfile.id);
            (0, vitest_1.expect)(attempts).toHaveLength(1);
            (0, vitest_1.expect)(attempts[0].blocked).toBe(true);
            (0, vitest_1.expect)(attempts[0].userId).toBe(testUserId);
        });
    });
    (0, vitest_1.describe)('getDataFilters', () => {
        (0, vitest_1.it)('should include tenant filter', () => {
            const filters = enforcer.getDataFilters(testProfile);
            const tenantFilter = filters.find(f => f.field === 'tenantId');
            (0, vitest_1.expect)(tenantFilter).toBeDefined();
            (0, vitest_1.expect)(tenantFilter?.value).toBe(testProfile.id);
        });
        (0, vitest_1.it)('should filter production sources', () => {
            const filters = enforcer.getDataFilters(testProfile);
            const sourceFilter = filters.find(f => f.field === 'sourceType');
            (0, vitest_1.expect)(sourceFilter).toBeDefined();
            (0, vitest_1.expect)(sourceFilter?.operator).toBe('ne');
            (0, vitest_1.expect)(sourceFilter?.value).toBe('production');
        });
        (0, vitest_1.it)('should apply entity type filters', () => {
            testProfile.dataAccessPolicy.allowedEntityTypes = ['Person', 'Organization'];
            const filters = enforcer.getDataFilters(testProfile);
            const entityTypeFilter = filters.find(f => f.field === 'entityType');
            (0, vitest_1.expect)(entityTypeFilter).toBeDefined();
            (0, vitest_1.expect)(entityTypeFilter?.operator).toBe('in');
            (0, vitest_1.expect)(entityTypeFilter?.value).toEqual(['Person', 'Organization']);
        });
        (0, vitest_1.it)('should filter for synthetic data only when configured', () => {
            testProfile.dataAccessPolicy.mode = index_js_1.DataAccessMode.SYNTHETIC_ONLY;
            const filters = enforcer.getDataFilters(testProfile);
            const sourceFilter = filters.find(f => f.field === 'dataSource');
            (0, vitest_1.expect)(sourceFilter).toBeDefined();
            (0, vitest_1.expect)(sourceFilter?.value).toBe('synthetic');
        });
    });
    (0, vitest_1.describe)('rate limiting', () => {
        (0, vitest_1.it)('should enforce rate limits', async () => {
            testProfile.resourceQuotas.maxExecutionsPerHour = 3;
            // Execute up to the limit
            for (let i = 0; i < 3; i++) {
                const decision = await enforcer.enforce(testProfile, {
                    sandboxId: testProfile.id,
                    userId: testUserId,
                    operation: SandboxEnforcer_js_1.OperationType.QUERY,
                });
                (0, vitest_1.expect)(decision.allowed).toBe(true);
            }
            // Next should be blocked
            const blockedDecision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.QUERY,
            });
            (0, vitest_1.expect)(blockedDecision.allowed).toBe(false);
            (0, vitest_1.expect)(blockedDecision.code).toBe(index_js_1.SandboxErrorCode.QUOTA_EXCEEDED);
        });
    });
    (0, vitest_1.describe)('airgapped isolation', () => {
        (0, vitest_1.beforeEach)(async () => {
            testProfile = await configManager.createProfile({
                name: 'Airgapped Sandbox',
                isolationLevel: index_js_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 7,
            }, testOwnerId);
            testProfile = await configManager.activateProfile(testProfile.id);
        });
        (0, vitest_1.it)('should block API connector in airgapped mode', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.API,
                targetEndpoint: 'any-api',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
        });
        (0, vitest_1.it)('should block external service connector', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.EXTERNAL_SERVICE,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
        });
        (0, vitest_1.it)('should allow local database connector', async () => {
            const decision = await enforcer.enforce(testProfile, {
                sandboxId: testProfile.id,
                userId: testUserId,
                operation: SandboxEnforcer_js_1.OperationType.CONNECTOR_USE,
                connectorType: index_js_1.ConnectorType.DATABASE,
                targetEndpoint: 'sandbox-db',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
    });
});
