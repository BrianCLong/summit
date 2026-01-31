import { DataLineageSystem } from './DataLineageSystem';
import { RetentionPolicyEngine } from './RetentionPolicyEngine';
import { SchemaDriftDetector } from './SchemaDriftDetector';
import { AuditCompactor } from './AuditCompactor';

/**
 * Facade for the Data Governance Authority subsystem.
 */
export class GovernanceAuthority {
  private static instance: GovernanceAuthority;

  public lineage: DataLineageSystem;
  public retention: RetentionPolicyEngine;
  public drift: SchemaDriftDetector;
  public compactor: AuditCompactor;

  private constructor() {
    this.lineage = DataLineageSystem.getInstance();
    this.retention = RetentionPolicyEngine.getInstance();
    this.drift = SchemaDriftDetector.getInstance();
    this.compactor = AuditCompactor.getInstance();
  }

  public static getInstance(): GovernanceAuthority {
    if (!GovernanceAuthority.instance) {
      GovernanceAuthority.instance = new GovernanceAuthority();
    }
    return GovernanceAuthority.instance;
  }

  public async runDailyGovernanceTasks() {
    console.log('Running daily governance tasks...');

    // 1. Enforce retention
    await this.retention.enforcePolicies();

    // 2. Compact old logs (e.g. older than 1 year, but for demo maybe 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await this.compactor.compactLogs(ninetyDaysAgo);

    console.log('Governance tasks completed.');
  }
}
