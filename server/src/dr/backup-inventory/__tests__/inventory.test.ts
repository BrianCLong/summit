import { describe, it, expect, beforeEach } from '@jest/globals';
import { BackupInventoryService } from '../BackupInventoryService.js';
import { PolicyChecker } from '../PolicyChecker.js';
import { BackupTarget, BackupPolicy } from '../types.js';

describe('BackupInventoryService', () => {
  let service: BackupInventoryService;

  beforeEach(async () => {
    service = BackupInventoryService.getInstance();
    await service.clear();
  });

  it('should add and retrieve a backup target', async () => {
    const targetData = {
      id: 'target-1',
      name: 'Primary DB Backup',
      storeType: 's3' as const,
      scope: 'full' as const,
      frequency: 'daily' as const,
      retentionDays: 30,
      encrypted: true,
    };

    const created = await service.addTarget(targetData);
    expect(created.id).toBe('target-1');
    expect(created.createdAt).toBeDefined();

    const retrieved = service.getTarget('target-1');
    expect(retrieved).toEqual(created);
  });

  it('should update backup status', async () => {
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
    expect(updated?.lastSuccessAt).toEqual(successTime);
    expect(updated?.lastFailureAt).toBeUndefined();

    const failTime = new Date();
    const updatedFail = await service.reportStatus('target-1', false, failTime);
    expect(updatedFail?.lastFailureAt).toEqual(failTime);
    // Should persist last success
    expect(updatedFail?.lastSuccessAt).toEqual(successTime);
  });
});

describe('PolicyChecker', () => {
  const checker = new PolicyChecker();
  const defaultPolicy: BackupPolicy = {
    id: 'policy-1',
    minRetentionDays: 14,
    requireEncryption: true,
    maxStalenessHours: 24,
  };

  it('should detect missing encryption', () => {
    const target: BackupTarget = {
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
    expect(encryptionFinding).toBeDefined();
    expect(encryptionFinding?.targetId).toBe('t1');
  });

  it('should detect weak retention', () => {
    const target: BackupTarget = {
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
    expect(retentionFinding).toBeDefined();
  });

  it('should detect stale backups', () => {
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 48); // 48 hours ago

    const target: BackupTarget = {
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
    expect(staleFinding).toBeDefined();
  });

  it('should detect never succeeded backups', () => {
    const target: BackupTarget = {
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
    expect(missingFinding).toBeDefined();
  });

  it('should pass valid backup', () => {
    const target: BackupTarget = {
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
    expect(report.findings).toHaveLength(0);
  });
});
