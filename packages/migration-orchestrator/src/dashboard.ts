import { AccountLinkService, TenantLifecycle } from "./accounts.ts";
import { EntitlementService } from "./entitlements.ts";
import { IntegrationService } from "./integrations.ts";
import { ParityEngine } from "./parity.ts";
import { ReliabilityManager } from "./reliability.ts";
import { SupportManager } from "./support.ts";
import { UXParityService } from "./ux.ts";

export class DashboardBuilder {
  constructor(sources) {
    this.sources = sources;
  }

  buildSnapshot(tenantId, parityInputs) {
    const parityReports = parityInputs.map((input) =>
      this.sources.parityEngine.computeParity(
        input.entity,
        input.legacy,
        input.target,
        input.invariants
      )
    );

    const phase = this.sources.lifecycle.getPhase(tenantId);
    const metrics = this.sources.reliability.getMetrics();
    const rollback = this.sources.reliability.evaluateRollback(phase);

    return {
      tenantId,
      phase,
      cutoverWindow: this.deriveCutoverWindow(phase),
      ssoReady: Boolean(this.sources.accountLinks.listExceptions().length === 0),
      dataParity: parityReports,
      integrationHealth: this.sources.integrations.healthSummary(tenantId),
      uxParity: this.sources.ux.getWorkflows(tenantId),
      blockers: this.sources.accountLinks
        .listExceptions()
        .filter((ex) => !ex.resolved)
        .map((ex) => `${ex.scope}:${ex.owner}`),
      nextActions: this.nextActionsForPhase(phase),
      exceptionRegistry: this.sources.accountLinks.listExceptions(),
      rollbackReady: rollback.shouldRollback,
      freezeActive: this.sources.lifecycle.isFrozen(tenantId),
      supportTickets: this.sources.support.getTickets(tenantId),
      metrics: {
        invariantPassRate:
          parityReports.length === 0
            ? 1
            : parityReports.reduce((sum, p) => sum + p.invariantPassRate, 0) / parityReports.length,
        rpoMinutes: metrics.rpoMinutes,
        rtoMinutes: metrics.rtoMinutes,
        errorDriftTrend: metrics.errorDriftTrend,
        jobThroughputPerMinute: parityInputs.length * 10,
      },
    };
  }

  deriveCutoverWindow(phase) {
    switch (phase) {
      case "canary":
        return "T-2 to T0";
      case "ramp":
        return "T0 to T+1";
      case "full":
        return "T+1 to T+3";
      case "stabilization":
        return "T+3 to T+14";
      default:
        return "T-14 planning";
    }
  }

  nextActionsForPhase(phase) {
    const actions = {
      inventory: [
        { action: "inventory integrations and data mappings", owner: "eng", eta: "T-60" },
      ],
      mapping: [
        { action: "publish field mapping and entitlement preview", owner: "data", eta: "T-30" },
      ],
      "dry-run": [
        { action: "execute dry-run backfill with invariants", owner: "data", eta: "T-20" },
      ],
      canary: [{ action: "run canary cutover with rollback proof", owner: "sre", eta: "T-2" }],
      ramp: [{ action: "ramp tenants and monitor drift", owner: "sre", eta: "T0" }],
      full: [{ action: "complete cutover and enforce sunset", owner: "eng", eta: "T+1" }],
      stabilization: [
        { action: "reconcile drift and remove legacy auth/UI paths", owner: "eng", eta: "T+7" },
      ],
      decommissioned: [
        { action: "archive data and revoke credentials", owner: "sec", eta: "T+15" },
      ],
    };
    return actions[phase];
  }
}
