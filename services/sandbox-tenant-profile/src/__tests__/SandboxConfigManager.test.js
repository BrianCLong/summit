"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SandboxConfigManager_js_1 = require("../config/SandboxConfigManager.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('SandboxConfigManager', () => {
    let manager;
    const testOwnerId = 'user-123';
    (0, vitest_1.beforeEach)(() => {
        manager = new SandboxConfigManager_js_1.SandboxConfigManager();
    });
    (0, vitest_1.describe)('createProfile', () => {
        (0, vitest_1.it)('should create a sandbox profile with default settings', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                description: 'A test sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            (0, vitest_1.expect)(profile.id).toBeDefined();
            (0, vitest_1.expect)(profile.name).toBe('Test Sandbox');
            (0, vitest_1.expect)(profile.description).toBe('A test sandbox');
            (0, vitest_1.expect)(profile.ownerId).toBe(testOwnerId);
            (0, vitest_1.expect)(profile.tenantType).toBe(index_js_1.TenantType.SANDBOX);
            (0, vitest_1.expect)(profile.isolationLevel).toBe(index_js_1.SandboxIsolationLevel.ENHANCED);
            (0, vitest_1.expect)(profile.status).toBe(index_js_1.SandboxStatus.PROVISIONING);
            (0, vitest_1.expect)(profile.expiresAt).toBeDefined();
        });
        (0, vitest_1.it)('should create a sandbox with dataLab preset', async () => {
            const profile = await manager.createProfile({
                name: 'Data Lab Sandbox',
                expiresInDays: 30,
            }, testOwnerId, 'dataLab');
            (0, vitest_1.expect)(profile.tenantType).toBe(index_js_1.TenantType.DATALAB);
            (0, vitest_1.expect)(profile.isolationLevel).toBe(index_js_1.SandboxIsolationLevel.ENHANCED);
            (0, vitest_1.expect)(profile.resourceQuotas.maxMemoryMb).toBe(2048);
            (0, vitest_1.expect)(profile.dataAccessPolicy.mode).toBe(index_js_1.DataAccessMode.SYNTHETIC_ONLY);
        });
        (0, vitest_1.it)('should create a sandbox with research preset', async () => {
            const profile = await manager.createProfile({
                name: 'Research Sandbox',
                expiresInDays: 90,
            }, testOwnerId, 'research');
            (0, vitest_1.expect)(profile.isolationLevel).toBe(index_js_1.SandboxIsolationLevel.RESEARCH);
            (0, vitest_1.expect)(profile.dataAccessPolicy.mode).toBe(index_js_1.DataAccessMode.ANONYMIZED);
            (0, vitest_1.expect)(profile.resourceQuotas.maxDataExportMb).toBe(0);
        });
        (0, vitest_1.it)('should create a sandbox with airgapped preset', async () => {
            const profile = await manager.createProfile({
                name: 'Airgapped Sandbox',
                expiresInDays: 7,
            }, testOwnerId, 'airgapped');
            (0, vitest_1.expect)(profile.isolationLevel).toBe(index_js_1.SandboxIsolationLevel.AIRGAPPED);
            (0, vitest_1.expect)(profile.dataAccessPolicy.mode).toBe(index_js_1.DataAccessMode.STRUCTURE_ONLY);
            (0, vitest_1.expect)(profile.resourceQuotas.maxNetworkBytesPerHour).toBe(0);
        });
        (0, vitest_1.it)('should override preset settings with request settings', async () => {
            const profile = await manager.createProfile({
                name: 'Custom Sandbox',
                expiresInDays: 30,
                resourceQuotas: {
                    maxMemoryMb: 4096,
                },
            }, testOwnerId, 'dataLab');
            (0, vitest_1.expect)(profile.resourceQuotas.maxMemoryMb).toBe(4096);
        });
        (0, vitest_1.it)('should reject linkback configuration', async () => {
            await (0, vitest_1.expect)(manager.createProfile({
                name: 'Invalid Sandbox',
                expiresInDays: 30,
                dataAccessPolicy: {
                    allowLinkbackToProduction: true,
                },
            }, testOwnerId)).rejects.toMatchObject({
                code: index_js_1.SandboxErrorCode.INVALID_CONFIGURATION,
            });
        });
        (0, vitest_1.it)('should set default connector restrictions based on isolation level', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                isolationLevel: index_js_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 30,
            }, testOwnerId);
            const federationConnector = profile.connectorRestrictions.find(c => c.connectorType === 'federation');
            (0, vitest_1.expect)(federationConnector?.allowed).toBe(false);
            const apiConnector = profile.connectorRestrictions.find(c => c.connectorType === 'api');
            (0, vitest_1.expect)(apiConnector?.allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('updateProfile', () => {
        (0, vitest_1.it)('should update sandbox profile', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            const updated = await manager.updateProfile(profile.id, {
                name: 'Updated Sandbox',
                resourceQuotas: {
                    maxMemoryMb: 1024,
                },
            }, testOwnerId);
            (0, vitest_1.expect)(updated.name).toBe('Updated Sandbox');
            (0, vitest_1.expect)(updated.resourceQuotas.maxMemoryMb).toBe(1024);
        });
        (0, vitest_1.it)('should reject invalid updates', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            await (0, vitest_1.expect)(manager.updateProfile(profile.id, {
                // @ts-expect-error - testing invalid update
                dataAccessPolicy: {
                    allowLinkbackToProduction: true,
                },
            }, testOwnerId)).rejects.toMatchObject({
                code: index_js_1.SandboxErrorCode.INVALID_CONFIGURATION,
            });
        });
    });
    (0, vitest_1.describe)('lifecycle methods', () => {
        (0, vitest_1.it)('should activate a provisioning sandbox', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            (0, vitest_1.expect)(profile.status).toBe(index_js_1.SandboxStatus.PROVISIONING);
            const activated = await manager.activateProfile(profile.id);
            (0, vitest_1.expect)(activated.status).toBe(index_js_1.SandboxStatus.ACTIVE);
        });
        (0, vitest_1.it)('should suspend an active sandbox', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            await manager.activateProfile(profile.id);
            const suspended = await manager.suspendProfile(profile.id, 'Security review required');
            (0, vitest_1.expect)(suspended.status).toBe(index_js_1.SandboxStatus.SUSPENDED);
            (0, vitest_1.expect)(suspended.metadata.suspendReason).toBe('Security review required');
        });
        (0, vitest_1.it)('should archive a sandbox', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            const archived = await manager.archiveProfile(profile.id);
            (0, vitest_1.expect)(archived.status).toBe(index_js_1.SandboxStatus.ARCHIVED);
        });
    });
    (0, vitest_1.describe)('isExpired', () => {
        (0, vitest_1.it)('should return false for non-expired sandbox', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            (0, vitest_1.expect)(manager.isExpired(profile)).toBe(false);
        });
        (0, vitest_1.it)('should return true for expired sandbox', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            // Manually set expiration to past
            profile.expiresAt = new Date('2020-01-01');
            (0, vitest_1.expect)(manager.isExpired(profile)).toBe(true);
        });
    });
    (0, vitest_1.describe)('validateProfile', () => {
        (0, vitest_1.it)('should validate a correct profile', async () => {
            const profile = await manager.createProfile({
                name: 'Test Sandbox',
                expiresInDays: 30,
            }, testOwnerId);
            const result = manager.validateProfile(profile);
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
        });
        (0, vitest_1.it)('should return errors for invalid network in airgapped', async () => {
            const profile = await manager.createProfile({
                name: 'Airgapped Sandbox',
                isolationLevel: index_js_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 30,
            }, testOwnerId);
            // Manually break the config
            profile.resourceQuotas.maxNetworkBytesPerHour = 1000;
            const result = manager.validateProfile(profile);
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors).toContain('Airgapped sandbox cannot have network access');
        });
    });
    (0, vitest_1.describe)('listProfiles', () => {
        (0, vitest_1.it)('should list profiles for owner', async () => {
            await manager.createProfile({ name: 'Sandbox 1', expiresInDays: 30 }, testOwnerId);
            await manager.createProfile({ name: 'Sandbox 2', expiresInDays: 30 }, testOwnerId);
            await manager.createProfile({ name: 'Sandbox 3', expiresInDays: 30 }, 'other-user');
            const profiles = await manager.listProfiles(testOwnerId);
            (0, vitest_1.expect)(profiles).toHaveLength(2);
        });
        (0, vitest_1.it)('should filter by status', async () => {
            const profile1 = await manager.createProfile({ name: 'Sandbox 1', expiresInDays: 30 }, testOwnerId);
            await manager.createProfile({ name: 'Sandbox 2', expiresInDays: 30 }, testOwnerId);
            await manager.activateProfile(profile1.id);
            const activeProfiles = await manager.listProfiles(testOwnerId, {
                status: index_js_1.SandboxStatus.ACTIVE,
            });
            (0, vitest_1.expect)(activeProfiles).toHaveLength(1);
            (0, vitest_1.expect)(activeProfiles[0].name).toBe('Sandbox 1');
        });
    });
    (0, vitest_1.describe)('getAvailablePresets', () => {
        (0, vitest_1.it)('should return all available presets', () => {
            const presets = manager.getAvailablePresets();
            (0, vitest_1.expect)(presets).toHaveLength(5);
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('dataLab');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('research');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('demo');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('training');
            (0, vitest_1.expect)(presets.map(p => p.name)).toContain('airgapped');
        });
    });
});
