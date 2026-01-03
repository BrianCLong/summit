import { v4 as uuidv4 } from 'uuid';
import { compareSnapshots } from './comparator.js';
import { createRepoBaselineSnapshot } from './repoBaselineProducer.js';
import { createRuntimeSnapshot } from './runtimeSnapshotProducer.js';
import { driftAlertStore } from './alertStore.js';
import { generatePolicyChangeProposals } from './proposals.js';

function getTelemetry(): any {
  return null;
}

export interface PolicyDriftMonitorOptions {
  intervalMs?: number;
  enabled?: boolean;
  warnOnly?: boolean;
}

export class PolicyDriftMonitor {
  private timer?: NodeJS.Timeout;
  private options: PolicyDriftMonitorOptions;
  private auditSystem: any | null = null;

  constructor(options: PolicyDriftMonitorOptions = {}) {
    this.options = {
      intervalMs: options.intervalMs ?? Number(process.env.POLICY_DRIFT_INTERVAL_MS || 0),
      enabled: options.enabled ?? process.env.POLICY_DRIFT_MONITOR_ENABLED !== 'false',
      warnOnly: options.warnOnly ?? true,
    };
  }

  private async loadAuditSystem(): Promise<any> {
    if (process.env.POLICY_DRIFT_SKIP_AUDIT === 'true' || process.env.NODE_ENV === 'test') {
      return null;
    }
    if (this.auditSystem) return this.auditSystem;
    try {
      const module = await import('../../audit/advanced-audit-system.js');
      this.auditSystem = module.AdvancedAuditSystem.getInstance();
      return this.auditSystem;
    } catch {
      this.auditSystem = null;
      return null;
    }
  }

  async runCheck(): Promise<void> {
    const baseline = createRepoBaselineSnapshot();
    const runtime = createRuntimeSnapshot();
    const report = compareSnapshots(baseline, runtime);
    const telemetry = getTelemetry();

    if (report.diffs.length === 0) {
      (telemetry as any)?.subsystems?.security?.policyDriftNone?.add?.(1);
      return;
    }

    const alertId = uuidv4();
    const proposals = generatePolicyChangeProposals(report);
    driftAlertStore.add({ id: alertId, severity: report.severity, report, proposals, createdAt: new Date().toISOString() });
    (telemetry as any)?.subsystems?.security?.policyDriftDetected?.add?.(1, { severity: report.severity });

    const auditSystem = await this.loadAuditSystem();
    if (auditSystem) {
      await auditSystem.log(
        { id: 'system', type: 'service', role: 'governance', tenantId: 'global' },
        'policy_drift_detected',
        { id: alertId, type: 'policy' },
        { report, proposals },
        { severity: report.severity }
      );
    }

    if (!this.options.warnOnly && report.severity !== 'none') {
      (telemetry as any)?.subsystems?.security?.policyDriftEscalated?.add?.(1, { severity: report.severity });
    }
  }

  start(): void {
    if (!this.options.enabled) return;
    if (this.options.intervalMs && this.options.intervalMs > 0) {
      this.timer = setInterval(() => {
        this.runCheck().catch(() => undefined);
      }, this.options.intervalMs);
    }

    // startup one-shot
    this.runCheck().catch(() => undefined);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
