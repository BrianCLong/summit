import crypto from "node:crypto";

export type PurposeTag = "t&s" | "investigation" | "fraud-risk" | "research";

export interface GuardrailMetrics {
  apiReadP95Ms?: number;
  apiWriteP95Ms?: number;
  subscriptionP95Ms?: number;
  graphOneHopMs?: number;
  graphMultiHopMs?: number;
  ingestThroughputPerPod?: number;
  ingestLatencyP95Ms?: number;
  availability?: number;
  costPerKIngestUsd?: number;
  costPerMGraphqlUsd?: number;
  stageLatencies?: Record<string, number>;
  errorRate?: number;
}

export interface ResidencyPolicy {
  region: string;
  storageRegion: string;
  allowExport: boolean;
}

export interface RetentionPolicy {
  standardDays: number;
  piiDays: number;
  legalHoldEnabled: boolean;
}

export interface EnforcementAction {
  action: "allow" | "warn" | "remove" | "reduce" | "age-gate" | "restrict" | "ban" | "freeze";
  requiresHumanReview: boolean;
  reason: string;
  riskTier: RiskTier;
  auditId: string;
  appliedRateLimit?: boolean;
  isChildSafetyPriority?: boolean;
}

export interface ModerationInput {
  contentType:
    | "post"
    | "comment"
    | "dm"
    | "image"
    | "video"
    | "audio"
    | "live"
    | "profile"
    | "report"
    | "appeal";
  text?: string;
  mediaHash?: string;
  userAge?: number;
  region: string;
  purpose: PurposeTag;
  signals?: Partial<ContentSignals>;
  retentionDays?: number;
  containsPii?: boolean;
  provenance?: {
    uploader: string;
    device?: string;
    time?: string;
    hash?: string;
  };
}

export interface ContentSignals {
  modelScore: number;
  ruleScore: number;
  childSafetyScore: number;
  selfHarmScore: number;
  spamScore: number;
  abuseScore: number;
  velocityScore: number;
  adversarialConfidence: number;
}

export interface StageLatencyBudget {
  name: string;
  maxP95Ms: number;
}

export interface TrustSafetyConfig {
  guardrails: GuardrailMetrics;
  residencyPolicies: ResidencyPolicy[];
  retention: RetentionPolicy;
  latencyBudgets: StageLatencyBudget[];
  riskTiers: RiskTierConfig[];
  purposeTags: PurposeTag[];
  maxErrorRate: number;
  syntheticProbeIntervalSeconds: number;
  graphMotifCacheTtlSeconds: number;
}

export type Lane = "ingest" | "detection" | "decision" | "enforcement" | "appeals" | "research";

export interface RiskTierConfig {
  name: RiskTier;
  minScore: number;
  action: EnforcementAction["action"];
  requiresHumanReview: boolean;
}

export type RiskTier = "safe" | "low" | "medium" | "high" | "critical";

export interface LaneBackoutState {
  lane: Lane;
  reason: string;
  timestamp: string;
}

export interface GuardrailViolation {
  category:
    | "latency"
    | "throughput"
    | "cost"
    | "availability"
    | "privacy"
    | "residency"
    | "purpose";
  message: string;
}

export interface GuardrailEvaluation {
  ok: boolean;
  violations: GuardrailViolation[];
}

export interface DecisionContext {
  signals: ContentSignals;
  adaptiveChoice: "ml" | "rule" | "hybrid";
  latencyPaths: Record<string, number>;
  retainedPurpose: PurposeTag;
}

const DEFAULT_GUARDRAILS: GuardrailMetrics = {
  apiReadP95Ms: 350,
  apiWriteP95Ms: 700,
  subscriptionP95Ms: 250,
  graphOneHopMs: 300,
  graphMultiHopMs: 1200,
  ingestThroughputPerPod: 1000,
  ingestLatencyP95Ms: 100,
  availability: 0.999,
  costPerKIngestUsd: 0.1,
  costPerMGraphqlUsd: 2,
};

const DEFAULT_LATENCY_BUDGETS: StageLatencyBudget[] = [
  { name: "ingest", maxP95Ms: 100 },
  { name: "detect", maxP95Ms: 250 },
  { name: "decision", maxP95Ms: 250 },
  { name: "appeals", maxP95Ms: 700 },
];

const DEFAULT_RISK_TIERS: RiskTierConfig[] = [
  { name: "critical", minScore: 0.9, action: "ban", requiresHumanReview: true },
  { name: "high", minScore: 0.75, action: "restrict", requiresHumanReview: true },
  { name: "medium", minScore: 0.5, action: "age-gate", requiresHumanReview: false },
  { name: "low", minScore: 0.25, action: "warn", requiresHumanReview: false },
  { name: "safe", minScore: 0, action: "allow", requiresHumanReview: false },
];

const DEFAULT_CONFIG: TrustSafetyConfig = {
  guardrails: DEFAULT_GUARDRAILS,
  residencyPolicies: [
    { region: "us", storageRegion: "us", allowExport: false },
    { region: "eu", storageRegion: "eu", allowExport: false },
  ],
  retention: { standardDays: 365, piiDays: 30, legalHoldEnabled: true },
  latencyBudgets: DEFAULT_LATENCY_BUDGETS,
  riskTiers: DEFAULT_RISK_TIERS,
  purposeTags: ["t&s", "investigation", "fraud-risk", "research"],
  maxErrorRate: 0.05,
  syntheticProbeIntervalSeconds: 60,
  graphMotifCacheTtlSeconds: 300,
};

function buildAuditId(): string {
  return crypto.randomUUID();
}

function mergeConfigs(
  defaults: TrustSafetyConfig,
  overrides?: Partial<TrustSafetyConfig>
): TrustSafetyConfig {
  if (!overrides) {
    return defaults;
  }

  return {
    guardrails: { ...defaults.guardrails, ...(overrides.guardrails ?? {}) },
    residencyPolicies: overrides.residencyPolicies ?? defaults.residencyPolicies,
    retention: { ...defaults.retention, ...(overrides.retention ?? {}) },
    latencyBudgets: overrides.latencyBudgets ?? defaults.latencyBudgets,
    riskTiers: overrides.riskTiers ?? defaults.riskTiers,
    purposeTags: overrides.purposeTags ?? defaults.purposeTags,
    maxErrorRate: overrides.maxErrorRate ?? defaults.maxErrorRate,
    syntheticProbeIntervalSeconds:
      overrides.syntheticProbeIntervalSeconds ?? defaults.syntheticProbeIntervalSeconds,
    graphMotifCacheTtlSeconds:
      overrides.graphMotifCacheTtlSeconds ?? defaults.graphMotifCacheTtlSeconds,
  };
}

function applyLaplaceNoise(value: number, epsilon: number): number {
  const u = Math.random() - 0.5;
  const b = 1 / epsilon;
  return value - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class TrustSafetyOrchestrator {
  private readonly config: TrustSafetyConfig;
  private readonly backouts = new Map<Lane, LaneBackoutState>();
  private readonly auditLog: EnforcementAction[] = [];

  constructor(config?: Partial<TrustSafetyConfig>) {
    this.config = mergeConfigs(DEFAULT_CONFIG, config);
  }

  getAuditLog(): EnforcementAction[] {
    return [...this.auditLog];
  }

  backoutLane(lane: Lane, reason: string): void {
    this.backouts.set(lane, { lane, reason, timestamp: new Date().toISOString() });
  }

  restoreLane(lane: Lane): void {
    this.backouts.delete(lane);
  }

  private firstLaneBackout(lanes: Lane[]): EnforcementAction | undefined {
    for (const lane of lanes) {
      const backout = this.backouts.get(lane);
      if (backout) {
        return this.freezeAction(`Lane ${lane} backout: ${backout.reason}`, lane);
      }
    }
    return undefined;
  }

  evaluateGuardrails(metrics: GuardrailMetrics, purpose?: PurposeTag): GuardrailEvaluation {
    const violations: GuardrailViolation[] = [];
    const guardrails = this.config.guardrails;

    if (metrics.apiReadP95Ms && metrics.apiReadP95Ms > guardrails.apiReadP95Ms!) {
      violations.push({ category: "latency", message: "API read latency budget breached" });
    }
    if (metrics.apiWriteP95Ms && metrics.apiWriteP95Ms > guardrails.apiWriteP95Ms!) {
      violations.push({ category: "latency", message: "API write latency budget breached" });
    }
    if (metrics.subscriptionP95Ms && metrics.subscriptionP95Ms > guardrails.subscriptionP95Ms!) {
      violations.push({ category: "latency", message: "Subscription latency budget breached" });
    }
    if (metrics.graphOneHopMs && metrics.graphOneHopMs > guardrails.graphOneHopMs!) {
      violations.push({ category: "latency", message: "Graph 1-hop latency budget breached" });
    }
    if (metrics.graphMultiHopMs && metrics.graphMultiHopMs > guardrails.graphMultiHopMs!) {
      violations.push({ category: "latency", message: "Graph 2-3 hop latency budget breached" });
    }
    if (
      metrics.ingestThroughputPerPod &&
      metrics.ingestThroughputPerPod < guardrails.ingestThroughputPerPod!
    ) {
      violations.push({ category: "throughput", message: "Ingest throughput below guarantee" });
    }
    if (metrics.ingestLatencyP95Ms && metrics.ingestLatencyP95Ms > guardrails.ingestLatencyP95Ms!) {
      violations.push({ category: "latency", message: "Ingest latency budget breached" });
    }
    if (metrics.availability && metrics.availability < guardrails.availability!) {
      violations.push({ category: "availability", message: "Availability below 99.9%" });
    }
    if (metrics.costPerKIngestUsd && metrics.costPerKIngestUsd > guardrails.costPerKIngestUsd!) {
      violations.push({ category: "cost", message: "Ingest unit cost above $0.10 per 1k events" });
    }
    if (metrics.costPerMGraphqlUsd && metrics.costPerMGraphqlUsd > guardrails.costPerMGraphqlUsd!) {
      violations.push({ category: "cost", message: "GraphQL unit cost above $2 per 1M calls" });
    }
    if (metrics.errorRate && metrics.errorRate > this.config.maxErrorRate) {
      violations.push({ category: "availability", message: "Observed error rate breaches budget" });
    }
    if (purpose && !this.config.purposeTags.includes(purpose)) {
      violations.push({ category: "purpose", message: `Purpose tag ${purpose} is not allowed` });
    }

    if (metrics.stageLatencies) {
      for (const budget of this.config.latencyBudgets) {
        const observed = metrics.stageLatencies[budget.name];
        if (observed && observed > budget.maxP95Ms) {
          violations.push({
            category: "latency",
            message: `Stage ${budget.name} latency budget breached`,
          });
        }
      }
    }

    return { ok: violations.length === 0, violations };
  }

  ensureResidency(region: string): void {
    const policy = this.config.residencyPolicies.find((entry) => entry.region === region);
    if (!policy) {
      throw new Error(`No residency policy for region ${region}`);
    }
    if (!policy.allowExport && policy.storageRegion !== region) {
      throw new Error(`Residency policy prohibits export from ${region}`);
    }
  }

  enforceRetention(days: number, isPii: boolean): void {
    const allowedDays = isPii ? this.config.retention.piiDays : this.config.retention.standardDays;
    if (days > allowedDays && !this.config.retention.legalHoldEnabled) {
      throw new Error("Retention exceeds policy and legal hold is disabled");
    }
  }

  runPipeline(input: ModerationInput, metrics: GuardrailMetrics = {}): EnforcementAction {
    const laneFreeze = this.firstLaneBackout(["ingest", "detection", "decision"]);
    if (laneFreeze) {
      return laneFreeze;
    }

    const guardrailEval = this.evaluateGuardrails(metrics, input.purpose);
    if (!guardrailEval.ok) {
      return this.freezeAction("Guardrail violation", "decision");
    }

    this.ensureResidency(input.region);
    const retentionDays =
      input.retentionDays ??
      (input.containsPii ? this.config.retention.piiDays : this.config.retention.standardDays);
    this.enforceRetention(retentionDays, Boolean(input.containsPii ?? input.provenance?.uploader));

    const decisionContext = this.evaluateSignals(input);
    const riskTier = this.resolveRiskTier(decisionContext.signals);

    const enforcementFreeze = this.backouts.get("enforcement");
    if (enforcementFreeze) {
      return this.freezeAction(
        `Lane enforcement backout: ${enforcementFreeze.reason}`,
        "enforcement",
        riskTier
      );
    }

    const action = this.buildAction(riskTier, decisionContext, input);
    this.auditLog.push(action);
    return action;
  }

  buildDifferentiallyPrivateCounts(
    counts: Record<string, number>,
    epsilon = 0.5
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(counts)) {
      result[key] = Math.max(0, applyLaplaceNoise(value, epsilon));
    }
    return result;
  }

  cacheGraphMotifs(motifs: string[]): Map<string, number> {
    const cache = new Map<string, number>();
    const now = Date.now();
    motifs.forEach((motif, index) => {
      cache.set(motif, now + this.config.graphMotifCacheTtlSeconds * 1000 + index);
    });
    return cache;
  }

  scheduleSyntheticProbe(): number {
    const intervalMs = this.config.syntheticProbeIntervalSeconds * 1000;
    return setInterval(() => {
      const probe: ModerationInput = {
        contentType: "post",
        text: "probe",
        region: "us",
        purpose: "t&s",
      };
      this.runPipeline(probe);
    }, intervalMs) as unknown as number;
  }

  stopSyntheticProbe(intervalId: number): void {
    clearInterval(intervalId as unknown as NodeJS.Timeout);
  }

  private freezeAction(reason: string, lane: Lane, riskTier: RiskTier = "safe"): EnforcementAction {
    const fullReason = `${reason};Tier=${riskTier}`;
    const action: EnforcementAction = {
      action: "freeze",
      requiresHumanReview: true,
      reason: fullReason,
      riskTier,
      auditId: buildAuditId(),
      appliedRateLimit: false,
      isChildSafetyPriority: false,
    };
    this.auditLog.push(action);
    return action;
  }

  private evaluateSignals(input: ModerationInput): DecisionContext {
    const signals: ContentSignals = {
      modelScore: clamp(input.signals?.modelScore ?? this.estimateModelScore(input), 0, 1),
      ruleScore: clamp(input.signals?.ruleScore ?? this.estimateRuleScore(input), 0, 1),
      childSafetyScore: clamp(input.signals?.childSafetyScore ?? 0, 0, 1),
      selfHarmScore: clamp(input.signals?.selfHarmScore ?? 0, 0, 1),
      spamScore: clamp(input.signals?.spamScore ?? 0, 0, 1),
      abuseScore: clamp(input.signals?.abuseScore ?? 0, 0, 1),
      velocityScore: clamp(input.signals?.velocityScore ?? 0, 0, 1),
      adversarialConfidence: clamp(input.signals?.adversarialConfidence ?? 0, 0, 1),
    };

    const adaptiveChoice = this.selectAdaptivePath(signals);
    const latencyPaths: Record<string, number> = {};
    for (const budget of this.config.latencyBudgets) {
      latencyPaths[budget.name] = budget.maxP95Ms;
    }

    return {
      signals,
      adaptiveChoice,
      latencyPaths,
      retainedPurpose: input.purpose,
    };
  }

  private estimateModelScore(input: ModerationInput): number {
    const textLength = input.text?.length ?? 0;
    if (textLength === 0) {
      return 0.1;
    }
    const density = Math.min(1, textLength / 500);
    return 0.2 + 0.6 * density;
  }

  private estimateRuleScore(input: ModerationInput): number {
    const hasMedia = Boolean(input.mediaHash);
    const ruleBias = hasMedia ? 0.4 : 0.2;
    const purposeBias = input.purpose === "research" ? 0 : 0.1;
    return clamp(ruleBias + purposeBias, 0, 1);
  }

  private selectAdaptivePath(signals: ContentSignals): "ml" | "rule" | "hybrid" {
    if (signals.adversarialConfidence > 0.7) {
      return "hybrid";
    }
    if (signals.velocityScore > 0.6 || signals.spamScore > 0.6) {
      return "rule";
    }
    return "ml";
  }

  private resolveRiskTier(signals: ContentSignals): RiskTier {
    const composite =
      0.3 * signals.modelScore +
      0.25 * signals.ruleScore +
      0.2 * signals.abuseScore +
      0.15 * signals.spamScore +
      0.1 * Math.max(signals.childSafetyScore, signals.selfHarmScore);

    const prioritizedScore = Math.max(composite, signals.childSafetyScore, signals.selfHarmScore);
    for (const tier of this.config.riskTiers) {
      if (prioritizedScore >= tier.minScore) {
        return tier.name;
      }
    }
    return "safe";
  }

  private buildAction(
    tier: RiskTier,
    decisionContext: DecisionContext,
    input: ModerationInput
  ): EnforcementAction {
    const tierConfig = this.config.riskTiers.find((entry) => entry.name === tier);
    if (!tierConfig) {
      throw new Error(`Unknown risk tier: ${tier}`);
    }

    const isChildSafetyPriority =
      decisionContext.signals.childSafetyScore >= 0.5 ||
      (input.userAge !== undefined && input.userAge < 18);

    const action: EnforcementAction = {
      action: tierConfig.action,
      requiresHumanReview: tierConfig.requiresHumanReview || isChildSafetyPriority,
      reason: this.buildReason(tier, decisionContext, input),
      riskTier: tier,
      auditId: buildAuditId(),
      appliedRateLimit: tier !== "safe",
      isChildSafetyPriority,
    };

    if (tier === "critical" || isChildSafetyPriority) {
      action.action = "restrict";
    }

    return action;
  }

  private buildReason(
    tier: RiskTier,
    decisionContext: DecisionContext,
    input: ModerationInput
  ): string {
    const parts = [
      `Tier=${tier}`,
      `path=${decisionContext.adaptiveChoice}`,
      `purpose=${decisionContext.retainedPurpose}`,
    ];
    if (decisionContext.signals.childSafetyScore >= 0.5) {
      parts.push("child-safety-priority");
    }
    if (decisionContext.signals.selfHarmScore >= 0.5) {
      parts.push("self-harm-safety");
    }
    if (input.purpose === "research") {
      parts.push("research-sandbox");
    }
    return parts.join(";");
  }
}

export const TRUST_SAFETY_DEFAULTS = DEFAULT_CONFIG;
