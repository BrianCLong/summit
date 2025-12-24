import { BackupTarget, BackupPolicy, PolicyFinding, BackupInventoryReport } from './types.js';

export class PolicyChecker {
  public check(targets: BackupTarget[], policy: BackupPolicy): BackupInventoryReport {
    const findings: PolicyFinding[] = [];

    for (const target of targets) {
      // Rule 1: Missing Encryption
      if (policy.requireEncryption && !target.encrypted) {
        findings.push({
          ruleId: 'ENCRYPTION_MISSING',
          targetId: target.id,
          severity: 'high',
          message: `Backup target ${target.name} is not encrypted.`,
          remediationHint: 'Enable server-side encryption or client-side encryption for this backup target.',
        });
      }

      // Rule 2: Weak Retention
      if (target.retentionDays < policy.minRetentionDays) {
        findings.push({
          ruleId: 'WEAK_RETENTION',
          targetId: target.id,
          severity: 'medium',
          message: `Retention period (${target.retentionDays} days) is less than policy minimum (${policy.minRetentionDays} days).`,
          remediationHint: `Increase retention period to at least ${policy.minRetentionDays} days.`,
        });
      }

      // Rule 3: Stale Backup
      if (target.lastSuccessAt) {
        const hoursSinceSuccess = (new Date().getTime() - target.lastSuccessAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSuccess > policy.maxStalenessHours) {
          findings.push({
            ruleId: 'STALE_BACKUP',
            targetId: target.id,
            severity: 'critical',
            message: `Last successful backup was ${hoursSinceSuccess.toFixed(1)} hours ago (limit: ${policy.maxStalenessHours} hours).`,
            remediationHint: 'Investigate backup job failures or schedule configuration.',
          });
        }
      } else {
        // Never succeeded
        findings.push({
          ruleId: 'MISSING_BACKUP',
          targetId: target.id,
          severity: 'critical',
          message: `Backup target has never reported a successful backup.`,
          remediationHint: 'Ensure the initial backup job has run successfully.',
        });
      }
    }

    // Deterministic ordering: ruleId then targetId
    findings.sort((a, b) => {
      const ruleCompare = a.ruleId.localeCompare(b.ruleId);
      if (ruleCompare !== 0) return ruleCompare;
      return a.targetId.localeCompare(b.targetId);
    });

    return {
      generatedAt: new Date(),
      totalTargets: targets.length,
      findings,
    };
  }
}
