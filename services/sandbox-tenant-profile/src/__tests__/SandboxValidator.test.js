"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SandboxValidator_js_1 = require("../validation/SandboxValidator.js");
const SandboxConfigManager_js_1 = require("../config/SandboxConfigManager.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('SandboxValidator', () => {
    let validator;
    let configManager;
    let testProfile;
    const testOwnerId = 'owner-123';
    (0, vitest_1.beforeEach)(async () => {
        validator = new SandboxValidator_js_1.SandboxValidator();
        configManager = new SandboxConfigManager_js_1.SandboxConfigManager();
        testProfile = await configManager.createProfile({
            name: 'Test Sandbox',
            expiresInDays: 30,
        }, testOwnerId);
    });
    (0, vitest_1.describe)('validate', () => {
        (0, vitest_1.it)('should validate a correct profile', () => {
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(true);
            (0, vitest_1.expect)(report.profileId).toBe(testProfile.id);
            (0, vitest_1.expect)(report.findings.filter(f => f.severity === SandboxValidator_js_1.ValidationSeverity.ERROR)).toHaveLength(0);
        });
        (0, vitest_1.it)('should detect linkback enabled (SEC001)', () => {
            testProfile.dataAccessPolicy.allowLinkbackToProduction = true;
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
            const finding = report.findings.find(f => f.code === 'SEC001');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.ERROR);
        });
        (0, vitest_1.it)('should detect federation enabled (SEC002)', () => {
            testProfile.integrationRestrictions.allowFederation = true;
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
            const finding = report.findings.find(f => f.code === 'SEC002');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.ERROR);
        });
        (0, vitest_1.it)('should detect federation connector enabled (SEC002)', () => {
            const federationConnector = testProfile.connectorRestrictions.find(c => c.connectorType === index_js_1.ConnectorType.FEDERATION);
            if (federationConnector) {
                federationConnector.allowed = true;
            }
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
            (0, vitest_1.expect)(report.findings.some(f => f.code === 'SEC002')).toBe(true);
        });
        (0, vitest_1.it)('should detect network access in airgapped mode (SEC003)', async () => {
            testProfile = await configManager.createProfile({
                name: 'Airgapped Sandbox',
                isolationLevel: index_js_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 7,
            }, testOwnerId);
            // Break the config
            testProfile.resourceQuotas.maxNetworkBytesPerHour = 1000;
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
            const finding = report.findings.find(f => f.code === 'SEC003');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.message).toContain('Airgapped');
        });
        (0, vitest_1.it)('should detect external services in airgapped mode (SEC004)', async () => {
            testProfile = await configManager.createProfile({
                name: 'Airgapped Sandbox',
                isolationLevel: index_js_1.SandboxIsolationLevel.AIRGAPPED,
                expiresInDays: 7,
            }, testOwnerId);
            // Break the config
            const externalConnector = testProfile.connectorRestrictions.find(c => c.connectorType === index_js_1.ConnectorType.EXTERNAL_SERVICE);
            if (externalConnector) {
                externalConnector.allowed = true;
            }
            const report = validator.validate(testProfile);
            (0, vitest_1.expect)(report.valid).toBe(false);
            (0, vitest_1.expect)(report.findings.some(f => f.code === 'SEC004')).toBe(true);
        });
        (0, vitest_1.it)('should warn about disabled audit logging (SEC005)', () => {
            testProfile.auditConfig.logAllQueries = false;
            testProfile.auditConfig.logAllMutations = false;
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'SEC005');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.WARNING);
        });
        (0, vitest_1.it)('should warn about long data retention (DATA001)', () => {
            testProfile.dataAccessPolicy.retentionDays = 180;
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'DATA001');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.WARNING);
        });
        (0, vitest_1.it)('should warn about PII handling with non-synthetic data (DATA002)', () => {
            testProfile.dataAccessPolicy.mode = index_js_1.DataAccessMode.SAMPLED;
            testProfile.dataAccessPolicy.piiHandling = 'hash';
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'DATA002');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.WARNING);
        });
        (0, vitest_1.it)('should info about large record limits (DATA003)', () => {
            testProfile.dataAccessPolicy.maxRecords = 500000;
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'DATA003');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.INFO);
        });
        (0, vitest_1.it)('should warn about exports without anonymization audit (RES002)', () => {
            testProfile.resourceQuotas.maxDataExportMb = 100;
            testProfile.dataAccessPolicy.requireAnonymizationAudit = false;
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'RES002');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.WARNING);
        });
        (0, vitest_1.it)('should warn about no expiration date (CFG002)', () => {
            testProfile.expiresAt = undefined;
            const report = validator.validate(testProfile);
            const finding = report.findings.find(f => f.code === 'CFG002');
            (0, vitest_1.expect)(finding).toBeDefined();
            (0, vitest_1.expect)(finding?.severity).toBe(SandboxValidator_js_1.ValidationSeverity.WARNING);
        });
    });
    (0, vitest_1.describe)('hasErrors', () => {
        (0, vitest_1.it)('should return false for valid profile', () => {
            (0, vitest_1.expect)(validator.hasErrors(testProfile)).toBe(false);
        });
        (0, vitest_1.it)('should return true for profile with errors', () => {
            testProfile.integrationRestrictions.allowFederation = true;
            (0, vitest_1.expect)(validator.hasErrors(testProfile)).toBe(true);
        });
    });
    (0, vitest_1.describe)('addRule', () => {
        (0, vitest_1.it)('should allow adding custom validation rules', () => {
            validator.addRule({
                code: 'CUSTOM001',
                check: (profile) => {
                    if (profile.name.includes('test')) {
                        return {
                            severity: SandboxValidator_js_1.ValidationSeverity.INFO,
                            code: 'CUSTOM001',
                            message: 'Name contains test',
                        };
                    }
                    return null;
                },
            });
            const report = validator.validate(testProfile);
            // Profile name is "Test Sandbox"
            const finding = report.findings.find(f => f.code === 'CUSTOM001');
            (0, vitest_1.expect)(finding).toBeDefined();
        });
    });
});
