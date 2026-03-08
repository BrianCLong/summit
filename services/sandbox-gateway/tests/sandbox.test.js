"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sandbox_tenant_profile_1 = require("@intelgraph/sandbox-tenant-profile");
(0, vitest_1.describe)('SandboxConfigManager', () => {
    let manager;
    (0, vitest_1.beforeEach)(() => {
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.describe)('createProfile', () => {
        (0, vitest_1.it)('should create a sandbox profile with default values', async () => {
            const profile = await manager.createProfile({ name: 'Test Sandbox' }, 'user-123');
            (0, vitest_1.expect)(profile.id).toBeDefined();
            (0, vitest_1.expect)(profile.name).toBe('Test Sandbox');
            (0, vitest_1.expect)(profile.ownerId).toBe('user-123');
            (0, vitest_1.expect)(profile.status).toBe(sandbox_tenant_profile_1.SandboxStatus.PROVISIONING);
            (0, vitest_1.expect)(profile.tenantType).toBe(sandbox_tenant_profile_1.TenantType.SANDBOX);
            (0, vitest_1.expect)(profile.isolationLevel).toBe(sandbox_tenant_profile_1.SandboxIsolationLevel.STANDARD);
        });
        (0, vitest_1.it)('should create a sandbox with custom isolation level', async () => {
            const profile = await manager.createProfile({
                name: 'Research Sandbox',
                isolationLevel: sandbox_tenant_profile_1.SandboxIsolationLevel.RESEARCH,
            }, 'user-123');
            (0, vitest_1.expect)(profile.isolationLevel).toBe(sandbox_tenant_profile_1.SandboxIsolationLevel.RESEARCH);
        });
        (0, vitest_1.it)('should apply preset configuration', async () => {
            const profile = await manager.createProfile({ name: 'Data Lab' }, 'user-123', 'dataLab');
            (0, vitest_1.expect)(profile.tenantType).toBe(sandbox_tenant_profile_1.TenantType.DATALAB);
            (0, vitest_1.expect)(profile.isolationLevel).toBe(sandbox_tenant_profile_1.SandboxIsolationLevel.ENHANCED);
            (0, vitest_1.expect)(profile.dataAccessPolicy.allowLinkbackToProduction).toBe(false);
        });
        (0, vitest_1.it)('should set expiration date', async () => {
            const profile = await manager.createProfile({ name: 'Temp Sandbox', expiresInDays: 7 }, 'user-123');
            (0, vitest_1.expect)(profile.expiresAt).toBeDefined();
            const expectedExpiry = new Date();
            expectedExpiry.setDate(expectedExpiry.getDate() + 7);
            const diffMs = Math.abs(profile.expiresAt.getTime() - expectedExpiry.getTime());
            (0, vitest_1.expect)(diffMs).toBeLessThan(1000); // Within 1 second
        });
        (0, vitest_1.it)('should create airgapped sandbox with no external connectivity', async () => {
            const profile = await manager.createProfile({ name: 'Airgapped' }, 'user-123', 'airgapped');
            (0, vitest_1.expect)(profile.isolationLevel).toBe(sandbox_tenant_profile_1.SandboxIsolationLevel.AIRGAPPED);
            (0, vitest_1.expect)(profile.integrationRestrictions.allowFederation).toBe(false);
            (0, vitest_1.expect)(profile.integrationRestrictions.allowExternalExports).toBe(false);
            (0, vitest_1.expect)(profile.integrationRestrictions.allowWebhooks).toBe(false);
            (0, vitest_1.expect)(profile.integrationRestrictions.allowApiKeys).toBe(false);
        });
    });
    (0, vitest_1.describe)('activateProfile', () => {
        (0, vitest_1.it)('should activate a provisioning sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            const activated = await manager.activateProfile(profile.id);
            (0, vitest_1.expect)(activated.status).toBe(sandbox_tenant_profile_1.SandboxStatus.ACTIVE);
        });
        (0, vitest_1.it)('should throw error when activating non-provisioning sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            await manager.activateProfile(profile.id);
            await (0, vitest_1.expect)(manager.activateProfile(profile.id)).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('suspendProfile', () => {
        (0, vitest_1.it)('should suspend an active sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            await manager.activateProfile(profile.id);
            const suspended = await manager.suspendProfile(profile.id, 'Policy violation');
            (0, vitest_1.expect)(suspended.status).toBe(sandbox_tenant_profile_1.SandboxStatus.SUSPENDED);
        });
    });
    (0, vitest_1.describe)('archiveProfile', () => {
        (0, vitest_1.it)('should archive a sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            const archived = await manager.archiveProfile(profile.id);
            (0, vitest_1.expect)(archived.status).toBe(sandbox_tenant_profile_1.SandboxStatus.ARCHIVED);
        });
    });
    (0, vitest_1.describe)('listProfiles', () => {
        (0, vitest_1.it)('should list sandboxes for a user', async () => {
            await manager.createProfile({ name: 'Sandbox 1' }, 'user-123');
            await manager.createProfile({ name: 'Sandbox 2' }, 'user-123');
            await manager.createProfile({ name: 'Other User' }, 'user-456');
            const profiles = await manager.listProfiles('user-123');
            (0, vitest_1.expect)(profiles.length).toBe(2);
            (0, vitest_1.expect)(profiles.every(p => p.ownerId === 'user-123')).toBe(true);
        });
        (0, vitest_1.it)('should filter by status', async () => {
            const p1 = await manager.createProfile({ name: 'Active 1' }, 'user-123');
            await manager.activateProfile(p1.id);
            await manager.createProfile({ name: 'Provisioning' }, 'user-123');
            const activeProfiles = await manager.listProfiles('user-123', { status: sandbox_tenant_profile_1.SandboxStatus.ACTIVE });
            (0, vitest_1.expect)(activeProfiles.length).toBe(1);
            (0, vitest_1.expect)(activeProfiles[0].status).toBe(sandbox_tenant_profile_1.SandboxStatus.ACTIVE);
        });
    });
    (0, vitest_1.describe)('getAvailablePresets', () => {
        (0, vitest_1.it)('should return all available presets', () => {
            const presets = manager.getAvailablePresets();
            (0, vitest_1.expect)(presets.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('dataLab');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('research');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('airgapped');
        });
    });
});
(0, vitest_1.describe)('SandboxEnforcer', () => {
    let enforcer;
    let manager;
    (0, vitest_1.beforeEach)(async () => {
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
        enforcer = new sandbox_tenant_profile_1.SandboxEnforcer();
    });
    (0, vitest_1.describe)('enforce', () => {
        (0, vitest_1.it)('should allow read operations in active sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.READ,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
        (0, vitest_1.it)('should block federation connector in sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.CONNECT,
                connectorType: sandbox_tenant_profile_1.ConnectorType.FEDERATION,
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.reason).toContain('federation');
        });
        (0, vitest_1.it)('should block linkback attempts', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.LINKBACK,
                targetEndpoint: 'production-tenant-id',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.reason).toContain('linkback');
        });
        (0, vitest_1.it)('should block external exports', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.EXPORT,
                targetEndpoint: 'https://external.com/api',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
        });
        (0, vitest_1.it)('should detect and block PII fields', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123', 'dataLab');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.READ,
                dataFields: ['name', 'ssn', 'credit_card_number', 'email'],
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.warnings.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(decision.warnings.some(w => w.includes('PII'))).toBe(true);
        });
        (0, vitest_1.it)('should allow operations in airgapped mode for internal targets', async () => {
            const profile = await manager.createProfile({ name: 'Airgapped' }, 'user-123', 'airgapped');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            const decision = await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.CONNECT,
                connectorType: sandbox_tenant_profile_1.ConnectorType.DATABASE,
                targetEndpoint: 'sandbox-neo4j://localhost:7687',
            });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
        });
        (0, vitest_1.it)('should track linkback attempts', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            await manager.activateProfile(profile.id);
            const activeProfile = await manager.getProfile(profile.id);
            // Attempt linkback
            await enforcer.enforce(activeProfile, {
                sandboxId: profile.id,
                userId: 'user-123',
                operation: sandbox_tenant_profile_1.OperationType.LINKBACK,
                targetEndpoint: 'prod-tenant-123',
            });
            const attempts = enforcer.getLinkbackAttempts(profile.id);
            (0, vitest_1.expect)(attempts.length).toBe(1);
            (0, vitest_1.expect)(attempts[0].blocked).toBe(true);
        });
    });
});
(0, vitest_1.describe)('SandboxValidator', () => {
    let validator;
    let manager;
    (0, vitest_1.beforeEach)(() => {
        validator = new sandbox_tenant_profile_1.SandboxValidator();
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.describe)('validate', () => {
        (0, vitest_1.it)('should validate a well-configured sandbox', async () => {
            const profile = await manager.createProfile({ name: 'Valid Sandbox' }, 'user-123', 'dataLab');
            const report = validator.validate(profile);
            (0, vitest_1.expect)(report.valid).toBe(true);
            (0, vitest_1.expect)(report.findings.filter(f => f.severity === 'error').length).toBe(0);
        });
        (0, vitest_1.it)('should report warning for production data access mode', async () => {
            const profile = await manager.createProfile({ name: 'Test' }, 'user-123');
            // Manually modify to test validation
            profile.dataAccessPolicy.mode = 'FULL_PRODUCTION';
            const report = validator.validate(profile);
            (0, vitest_1.expect)(report.findings.some(f => f.severity === 'warning' || f.severity === 'error')).toBe(true);
        });
        (0, vitest_1.it)('should report error for missing required fields', async () => {
            const invalidProfile = {
                id: 'test-id',
                name: '', // Empty name
                ownerId: 'user-123',
                tenantType: sandbox_tenant_profile_1.TenantType.SANDBOX,
                status: sandbox_tenant_profile_1.SandboxStatus.ACTIVE,
            };
            const report = validator.validate(invalidProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
        });
    });
});
(0, vitest_1.describe)('Integration: Sandbox Lifecycle', () => {
    let manager;
    let enforcer;
    (0, vitest_1.beforeEach)(() => {
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
        enforcer = new sandbox_tenant_profile_1.SandboxEnforcer();
    });
    (0, vitest_1.it)('should handle complete sandbox lifecycle', async () => {
        // Create
        const profile = await manager.createProfile({ name: 'Lifecycle Test', expiresInDays: 30 }, 'user-123', 'dataLab');
        (0, vitest_1.expect)(profile.status).toBe(sandbox_tenant_profile_1.SandboxStatus.PROVISIONING);
        // Activate
        const active = await manager.activateProfile(profile.id);
        (0, vitest_1.expect)(active.status).toBe(sandbox_tenant_profile_1.SandboxStatus.ACTIVE);
        // Use (verify enforcement)
        const decision = await enforcer.enforce(active, {
            sandboxId: profile.id,
            userId: 'user-123',
            operation: sandbox_tenant_profile_1.OperationType.READ,
        });
        (0, vitest_1.expect)(decision.allowed).toBe(true);
        // Suspend
        const suspended = await manager.suspendProfile(profile.id, 'Maintenance');
        (0, vitest_1.expect)(suspended.status).toBe(sandbox_tenant_profile_1.SandboxStatus.SUSPENDED);
        // Archive
        const archived = await manager.archiveProfile(profile.id);
        (0, vitest_1.expect)(archived.status).toBe(sandbox_tenant_profile_1.SandboxStatus.ARCHIVED);
    });
    (0, vitest_1.it)('should enforce isolation between sandboxes', async () => {
        const sandbox1 = await manager.createProfile({ name: 'Sandbox 1' }, 'user-1');
        await manager.activateProfile(sandbox1.id);
        const sandbox2 = await manager.createProfile({ name: 'Sandbox 2' }, 'user-2');
        await manager.activateProfile(sandbox2.id);
        const s1Profile = await manager.getProfile(sandbox1.id);
        const s2Profile = await manager.getProfile(sandbox2.id);
        // Verify each sandbox has unique tenant ID
        (0, vitest_1.expect)(s1Profile?.id).not.toBe(s2Profile?.id);
        // Cross-sandbox access should be blocked
        const decision = await enforcer.enforce(s1Profile, {
            sandboxId: sandbox1.id,
            userId: 'user-1',
            operation: sandbox_tenant_profile_1.OperationType.LINKBACK,
            targetEndpoint: sandbox2.id,
        });
        (0, vitest_1.expect)(decision.allowed).toBe(false);
    });
});
(0, vitest_1.describe)('Concurrent Operations', () => {
    let manager;
    (0, vitest_1.beforeEach)(() => {
        manager = new sandbox_tenant_profile_1.SandboxConfigManager();
    });
    (0, vitest_1.it)('should handle concurrent sandbox creation', async () => {
        const promises = Array.from({ length: 10 }, (_, i) => manager.createProfile({ name: `Sandbox ${i}` }, 'user-123'));
        const results = await Promise.all(promises);
        (0, vitest_1.expect)(results.length).toBe(10);
        const ids = new Set(results.map(r => r.id));
        (0, vitest_1.expect)(ids.size).toBe(10); // All unique IDs
    });
    (0, vitest_1.it)('should handle concurrent enforcement checks', async () => {
        const profile = await manager.createProfile({ name: 'Concurrent Test' }, 'user-123');
        await manager.activateProfile(profile.id);
        const activeProfile = await manager.getProfile(profile.id);
        const enforcer = new sandbox_tenant_profile_1.SandboxEnforcer();
        const promises = Array.from({ length: 100 }, () => enforcer.enforce(activeProfile, {
            sandboxId: profile.id,
            userId: 'user-123',
            operation: sandbox_tenant_profile_1.OperationType.READ,
        }));
        const results = await Promise.all(promises);
        (0, vitest_1.expect)(results.every(r => r.allowed === true)).toBe(true);
    });
});
