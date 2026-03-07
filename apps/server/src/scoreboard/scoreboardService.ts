import { ExceptionRegistry } from "./exceptionRegistry.js";
import { DecisionLog } from "./decisionLog.js";
import { ReleaseEnvelopeRegistry } from "./releaseEnvelopeRegistry.js";
import {
  DomainMetrics,
  DomainMetricsInput,
  DomainScoreboard,
  GateStatus,
  GateType,
  HEALTH_THRESHOLDS,
} from "./types.js";

interface DomainRecord {
  metrics: DomainMetrics;
}

const clampZero = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

export class ScoreboardService {
  private scoreboards: Map<string, DomainRecord> = new Map();
  private exceptions = new ExceptionRegistry();
  private decisions = new DecisionLog();
  private releaseEnvelopes = new ReleaseEnvelopeRegistry();

  upsertDomainMetrics(input: DomainMetricsInput): DomainScoreboard {
    this.validateMetrics(input);

    const metrics: DomainMetrics = {
      ...input,
      sloBurnRate: clampZero(input.sloBurnRate),
      errorBudgetRemaining: clampZero(input.errorBudgetRemaining),
      cycleTimeDays: clampZero(input.cycleTimeDays),
      wipCount: clampZero(input.wipCount),
      wipLimit: clampZero(input.wipLimit),
      blockedTimeHours: clampZero(input.blockedTimeHours),
      reworkRate: clampZero(input.reworkRate),
      costPerUnit: clampZero(input.costPerUnit),
      deletionShipped: clampZero(input.deletionShipped),
      debtBurn: clampZero(input.debtBurn),
      repeatIncidents: clampZero(input.repeatIncidents),
      prSizeLimitBreaches: clampZero(input.prSizeLimitBreaches),
    };

    this.scoreboards.set(input.domainId, { metrics });
    return this.getDomainScoreboard(input.domainId)!;
  }

  reset() {
    this.scoreboards.clear();
    this.exceptions = new ExceptionRegistry();
    this.decisions = new DecisionLog();
    this.releaseEnvelopes = new ReleaseEnvelopeRegistry();
  }

  getDomainScoreboard(domainId: string): DomainScoreboard | undefined {
    const record = this.scoreboards.get(domainId);
    if (!record) return undefined;

    const gates = this.evaluateGates(record.metrics);
    const decisions = this.decisions.list(domainId);
    const exceptions = this.exceptions.listByDomain(domainId);
    const releaseEnvelope = this.releaseEnvelopes.get(domainId);

    return {
      domainId,
      domainName: record.metrics.domainName,
      metrics: record.metrics,
      gates,
      decisions,
      exceptions,
      releaseEnvelope,
      health: this.computeHealth(record.metrics),
    };
  }

  listScoreboards(): DomainScoreboard[] {
    return Array.from(this.scoreboards.keys())
      .map((domainId) => this.getDomainScoreboard(domainId))
      .filter((scoreboard): scoreboard is DomainScoreboard => Boolean(scoreboard));
  }

  registerException(params: {
    domainId: string;
    gate: GateType;
    owner: string;
    reason: string;
    expiresAt: string;
  }) {
    return this.exceptions.registerException(params);
  }

  logDecision(params: {
    domainId: string;
    title: string;
    owner: string;
    rationale: string;
    revisitDate: string;
    decisionType: "ONE_WAY_DOOR" | "TWO_WAY_DOOR";
  }) {
    return this.decisions.log(params);
  }

  registerReleaseEnvelope(params: {
    domainId: string;
    owner: string;
    metrics: string[];
    rollbackPlan: string;
    expiresAt?: string;
  }) {
    return this.releaseEnvelopes.register(params);
  }

  private computeHealth(metrics: DomainMetrics): DomainScoreboard["health"] {
    const reliability: DomainScoreboard["health"]["reliability"] =
      metrics.errorBudgetRemaining <= HEALTH_THRESHOLDS.errorBudgetRemaining ||
      metrics.repeatIncidents > HEALTH_THRESHOLDS.repeatIncidents
        ? "POOR"
        : metrics.errorBudgetRemaining < HEALTH_THRESHOLDS.errorBudgetRemaining * 3
          ? "WATCH"
          : "GOOD";

    const flow: DomainScoreboard["health"]["flow"] =
      metrics.wipCount > metrics.wipLimit ||
      metrics.blockedTimeHours > HEALTH_THRESHOLDS.blockedTimeHours ||
      metrics.reworkRate > HEALTH_THRESHOLDS.reworkRate
        ? "POOR"
        : metrics.cycleTimeDays > HEALTH_THRESHOLDS.cycleTimeDays
          ? "WATCH"
          : "GOOD";

    const onCall: DomainScoreboard["health"]["onCall"] =
      metrics.onCall.pagesPerShift > 6 || metrics.onCall.sleepDebtHours > 12
        ? "POOR"
        : metrics.onCall.pagesPerShift > 3 || metrics.onCall.sleepDebtHours > 6
          ? "WATCH"
          : "GOOD";

    return { reliability, flow, onCall };
  }

  private evaluateGates(metrics: DomainMetrics): GateStatus[] {
    const gates: GateStatus[] = [];

    gates.push(this.evaluateRoadmapGate(metrics));
    gates.push(this.evaluateReleaseEnvelopeGate(metrics));
    gates.push(this.evaluatePrSizeGate(metrics));
    gates.push(this.evaluateWipGate(metrics));

    return gates;
  }

  private evaluateRoadmapGate(metrics: DomainMetrics): GateStatus {
    const override = this.exceptions.getActive(metrics.domainId, "ROADMAP_SCOPE");
    const blocked =
      metrics.errorBudgetRemaining <= HEALTH_THRESHOLDS.errorBudgetRemaining ||
      metrics.repeatIncidents > HEALTH_THRESHOLDS.repeatIncidents;

    return {
      gate: "ROADMAP_SCOPE",
      state: override ? "OVERRIDDEN" : blocked ? "BLOCKED" : "OPEN",
      reason: blocked
        ? "Error budget depleted or repeat incidents exceed threshold; roadmap scope gated."
        : "Error budget healthy; roadmap scope open.",
      ownerOverride: override?.owner,
      expiresAt: override?.expiresAt,
    } satisfies GateStatus;
  }

  private evaluateReleaseEnvelopeGate(metrics: DomainMetrics): GateStatus {
    const override = this.exceptions.getActive(metrics.domainId, "RELEASE_ENVELOPE");
    const envelope = this.releaseEnvelopes.get(metrics.domainId);
    const blocked = metrics.releaseEnvelopeRequired && !envelope;

    return {
      gate: "RELEASE_ENVELOPE",
      state: override ? "OVERRIDDEN" : blocked ? "BLOCKED" : "OPEN",
      reason: blocked
        ? "Release envelope required for Tier 0/1 scope but none is registered."
        : "Release envelope requirements satisfied.",
      ownerOverride: override?.owner,
      expiresAt: override?.expiresAt,
    } satisfies GateStatus;
  }

  private evaluatePrSizeGate(metrics: DomainMetrics): GateStatus {
    const override = this.exceptions.getActive(metrics.domainId, "PR_SIZE_LIMIT");
    const blocked = metrics.prSizeLimitBreaches > HEALTH_THRESHOLDS.prSizeLimitBreaches;

    return {
      gate: "PR_SIZE_LIMIT",
      state: override ? "OVERRIDDEN" : blocked ? "BLOCKED" : "OPEN",
      reason: blocked
        ? "PR size limits breached; tighten review rotations before merging further scope."
        : "PR size policy respected.",
      ownerOverride: override?.owner,
      expiresAt: override?.expiresAt,
    } satisfies GateStatus;
  }

  private evaluateWipGate(metrics: DomainMetrics): GateStatus {
    const override = this.exceptions.getActive(metrics.domainId, "WIP_LIMIT");
    const blocked = metrics.wipCount > metrics.wipLimit;

    return {
      gate: "WIP_LIMIT",
      state: override ? "OVERRIDDEN" : blocked ? "BLOCKED" : "OPEN",
      reason: blocked
        ? "WIP limit exceeded; stop starting and start finishing."
        : "WIP within limits.",
      ownerOverride: override?.owner,
      expiresAt: override?.expiresAt,
    } satisfies GateStatus;
  }

  private validateMetrics(metrics: DomainMetricsInput) {
    const requiredStrings: Array<keyof DomainMetricsInput> = [
      "domainId",
      "domainName",
      "periodStart",
      "periodEnd",
    ];
    requiredStrings.forEach((field) => {
      if (!metrics[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    });

    if (metrics.wipLimit <= 0) {
      throw new Error("WIP limit must be greater than zero to enforce gates.");
    }
    if (metrics.errorBudgetRemaining > 1 || metrics.errorBudgetRemaining < 0) {
      throw new Error("errorBudgetRemaining must be expressed as a value between 0 and 1.");
    }
    if (metrics.reworkRate < 0 || metrics.reworkRate > 1) {
      throw new Error("reworkRate must be expressed as a value between 0 and 1.");
    }
    if (metrics.sloBurnRate < 0 || metrics.sloBurnRate > 1) {
      throw new Error("sloBurnRate must be expressed as a value between 0 and 1.");
    }
  }
}

export const scoreboardService = new ScoreboardService();
