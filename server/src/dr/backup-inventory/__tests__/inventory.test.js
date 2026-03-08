"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const BackupInventoryService_js_1 = require("../BackupInventoryService.js");
const PolicyChecker_js_1 = require("../PolicyChecker.js");
(0, globals_1.describe)('BackupInventoryService', () => {
    let service;
    (0, globals_1.beforeEach)(async () => {
        service = BackupInventoryService_js_1.BackupInventoryService.getInstance();
        await service.clear();
    });
    (0, globals_1.it)('should add and retrieve a backup target', async () => {
        const targetData = {
            id: 'target-1',
            name: 'Primary DB Backup',
            storeType: 's3',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 30,
            encrypted: true,
        };
        const created = await service.addTarget(targetData);
        (0, globals_1.expect)(created.id).toBe('target-1');
        (0, globals_1.expect)(created.createdAt).toBeDefined();
        const retrieved = service.getTarget('target-1');
        (0, globals_1.expect)(retrieved).toEqual(created);
    });
    (0, globals_1.it)('should update backup status', async () => {
        await service.addTarget({
            id: 'target-1',
            name: 'Test Backup',
            storeType: 'local',
            scope: 'incremental',
            frequency: 'hourly',
            retentionDays: 7,
            encrypted: false,
        });
        const successTime = new Date();
        const updated = await service.reportStatus('target-1', true, successTime);
        (0, globals_1.expect)(updated?.lastSuccessAt).toEqual(successTime);
        (0, globals_1.expect)(updated?.lastFailureAt).toBeUndefined();
        const failTime = new Date();
        const updatedFail = await service.reportStatus('target-1', false, failTime);
        (0, globals_1.expect)(updatedFail?.lastFailureAt).toEqual(failTime);
        // Should persist last success
        (0, globals_1.expect)(updatedFail?.lastSuccessAt).toEqual(successTime);
    });
});
(0, globals_1.describe)('PolicyChecker', () => {
    const checker = new PolicyChecker_js_1.PolicyChecker();
    const defaultPolicy = {
        id: 'policy-1',
        minRetentionDays: 14,
        requireEncryption: true,
        maxStalenessHours: 24,
    };
    (0, globals_1.it)('should detect missing encryption', () => {
        const target = {
            id: 't1',
            name: 'Unencrypted',
            storeType: 'local',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 30,
            encrypted: false, // VIOLATION
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const report = checker.check([target], defaultPolicy);
        const encryptionFinding = report.findings.find(f => f.ruleId === 'ENCRYPTION_MISSING');
        (0, globals_1.expect)(encryptionFinding).toBeDefined();
        (0, globals_1.expect)(encryptionFinding?.targetId).toBe('t1');
    });
    (0, globals_1.it)('should detect weak retention', () => {
        const target = {
            id: 't2',
            name: 'Short Retention',
            storeType: 's3',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 7, // VIOLATION (< 14)
            encrypted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const report = checker.check([target], defaultPolicy);
        const retentionFinding = report.findings.find(f => f.ruleId === 'WEAK_RETENTION');
        (0, globals_1.expect)(retentionFinding).toBeDefined();
    });
    (0, globals_1.it)('should detect stale backups', () => {
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 48); // 48 hours ago
        const target = {
            id: 't3',
            name: 'Stale Backup',
            storeType: 's3',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 30,
            encrypted: true,
            lastSuccessAt: oldDate, // VIOLATION (> 24 hours)
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const report = checker.check([target], defaultPolicy);
        const staleFinding = report.findings.find(f => f.ruleId === 'STALE_BACKUP');
        (0, globals_1.expect)(staleFinding).toBeDefined();
    });
    (0, globals_1.it)('should detect never succeeded backups', () => {
        const target = {
            id: 't4',
            name: 'New Backup',
            storeType: 's3',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 30,
            encrypted: true,
            // lastSuccessAt undefined
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const report = checker.check([target], defaultPolicy);
        const missingFinding = report.findings.find(f => f.ruleId === 'MISSING_BACKUP');
        (0, globals_1.expect)(missingFinding).toBeDefined();
    });
    (0, globals_1.it)('should pass valid backup', () => {
        const target = {
            id: 't5',
            name: 'Good Backup',
            storeType: 's3',
            scope: 'full',
            frequency: 'daily',
            retentionDays: 30,
            encrypted: true,
            lastSuccessAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const report = checker.check([target], defaultPolicy);
        (0, globals_1.expect)(report.findings).toHaveLength(0);
    });
});
