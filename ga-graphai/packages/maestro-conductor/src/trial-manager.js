"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialManager = void 0;
class TrialManager {
    events;
    config;
    trials = new Map();
    scanCounts = new Map(); // tenantId -> date -> count
    constructor(events, config = {
        durationDays: 7,
        maxOrgs: 1,
        watermarkEnabled: true,
    }) {
        this.events = events;
        this.config = config;
    }
    registerTrial(tenantId, orgId) {
        const createdAt = new Date();
        const trialExpiresAt = new Date();
        trialExpiresAt.setDate(createdAt.getDate() + this.config.durationDays);
        const info = {
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
    recordScan(tenantId) {
        const info = this.trials.get(tenantId);
        if (!info || info.status !== 'active')
            return;
        const dateKey = new Date().toISOString().split('T')[0];
        const tenantScans = this.scanCounts.get(tenantId) ?? new Map();
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
    autoExpire() {
        const now = new Date();
        const expiredIds = [];
        for (const [id, info] of this.trials.entries()) {
            if (info.status === 'active' && now > info.trialExpiresAt) {
                this.expireTrial(id);
                expiredIds.push(id);
            }
        }
        return expiredIds;
    }
    expireTrial(tenantId) {
        const info = this.trials.get(tenantId);
        if (!info)
            return;
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
    getUsageSignals(tenantId) {
        const tenantScans = this.scanCounts.get(tenantId);
        if (!tenantScans)
            return { totalScans: 0, avgScansPerDay: 0 };
        const counts = Array.from(tenantScans.values());
        const totalScans = counts.reduce((a, b) => a + b, 0);
        const avgScansPerDay = totalScans / counts.length;
        return {
            totalScans,
            avgScansPerDay,
            lastScanCount: counts[counts.length - 1] || 0,
        };
    }
    emitUpsellSignal(tenantId, reason) {
        const info = this.trials.get(tenantId);
        if (!info)
            return;
        this.events.emitEvent('summit.trial.upsell_signal', {
            tenantId,
            orgId: info.orgId,
            reason,
            signals: this.getUsageSignals(tenantId),
        });
    }
}
exports.TrialManager = TrialManager;
