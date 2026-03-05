import { StructuredEventEmitter } from '@ga-graphai/common-types';
import type { HealthSignal } from './types';

export interface TrialConfig {
  durationDays: number;
  maxOrgs: number;
  watermarkEnabled: boolean;
}

export interface TenantInfo {
  id: string;
  orgId: string;
  createdAt: Date;
  trialExpiresAt: Date;
  status: 'active' | 'expired' | 'converted';
}

export class TrialManager {
  private readonly trials = new Map<string, TenantInfo>();
  private readonly scanCounts = new Map<string, Map<string, number>>(); // tenantId -> date -> count

  constructor(
    private readonly events: StructuredEventEmitter,
    private readonly config: TrialConfig = {
      durationDays: 7,
      maxOrgs: 1,
      watermarkEnabled: true,
    }
  ) {}

  registerTrial(tenantId: string, orgId: string): TenantInfo {
    const createdAt = new Date();
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(createdAt.getDate() + this.config.durationDays);

    const info: TenantInfo = {
      id: tenantId,
      orgId,
      createdAt,
      trialExpiresAt,
      status: 'active',
    };

    this.trials.set(tenantId, info);
    this.events.emitEvent('summit.trial.registered', {
      tenantId,
      orgId,
      expiresAt: trialExpiresAt.toISOString(),
    });

    return info;
  }

  recordScan(tenantId: string): void {
    const info = this.trials.get(tenantId);
    if (!info || info.status !== 'active') return;

    const dateKey = new Date().toISOString().split('T')[0];
    const tenantScans = this.scanCounts.get(tenantId) ?? new Map<string, number>();
    const count = (tenantScans.get(dateKey) ?? 0) + 1;
    tenantScans.set(dateKey, count);
    this.scanCounts.set(tenantId, tenantScans);

    this.events.emitEvent('summit.trial.scan_recorded', {
      tenantId,
      count,
      date: dateKey,
    });

    // Check for upsell signal (e.g., more than 5 scans in a day)
    if (count >= 5) {
      this.emitUpsellSignal(tenantId, 'high_usage');
    }
  }

  autoExpire(): string[] {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, info] of this.trials.entries()) {
      if (info.status === 'active' && now > info.trialExpiresAt) {
        this.expireTrial(id);
        expiredIds.push(id);
      }
    }

    return expiredIds;
  }

  expireTrial(tenantId: string): void {
    const info = this.trials.get(tenantId);
    if (!info) return;

    info.status = 'expired';
    this.trials.set(tenantId, info);

    this.events.emitEvent('summit.trial.expired', {
      tenantId,
      orgId: info.orgId,
      expiredAt: new Date().toISOString(),
    });

    // In a real system, this would trigger tenant deletion logic
    console.log(`[TrialManager] Deleting tenant ${tenantId} due to trial expiration.`);
  }

  getUsageSignals(tenantId: string) {
    const tenantScans = this.scanCounts.get(tenantId);
    if (!tenantScans) return { totalScans: 0, avgScansPerDay: 0 };

    const counts = Array.from(tenantScans.values());
    const totalScans = counts.reduce((a, b) => a + b, 0);
    const avgScansPerDay = totalScans / counts.length;

    return {
      totalScans,
      avgScansPerDay,
      lastScanCount: counts[counts.length - 1] || 0,
    };
  }

  private emitUpsellSignal(tenantId: string, reason: string): void {
    const info = this.trials.get(tenantId);
    if (!info) return;

    this.events.emitEvent('summit.trial.upsell_signal', {
      tenantId,
      orgId: info.orgId,
      reason,
      signals: this.getUsageSignals(tenantId),
    });
  }
}
