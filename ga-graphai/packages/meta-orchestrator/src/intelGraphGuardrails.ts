import { randomUUID } from 'crypto';

export interface LatencySLOs {
  apiReadP95Ms: number;
  apiWriteP95Ms: number;
  apiSubscriptionP95Ms: number;
  graph1HopP95Ms: number;
  graph2To3HopP95Ms: number;
  ingestP95Ms: number;
}

export interface ThroughputTargets {
  ingestEventsPerSecondPerPod: number;
}

export interface AvailabilityTargets {
  monthlyAvailability: number;
  errorBudgetFraction: number;
  alertBurnRates: number[];
}

export interface CostCaps {
  ingestPerThousandEvents: number;
  graphqlPerMillionCalls: number;
  monthlyIngestBudget: number;
  monthlyGraphqlBudget: number;
  alertThresholdFraction: number;
}

export interface SecurityControls {
  oidcEnabled: boolean;
  opaAbacEnabled: boolean;
  mTlsEnabled: boolean;
  fieldLevelEncryptionEnabled: boolean;
  provenanceLedgerEnabled: boolean;
  standardRetentionDays: number;
  piiRetentionDays: number;
  warrantBindingRequired: boolean;
}

export interface ResidencyDecision {
  resourceId: string;
  residency: string;
  allowedResidencies: string[];
  purpose: string;
  allowedPurposes: string[];
}

export interface ConnectorTelemetry {
  id: string;
  name: string;
  latencyP95Ms: number;
  throughputPerSecond: number;
  costPerEvent: number;
  monthlySpend: number;
  monthlyBudget: number;
  errorRate: number;
}

export interface TelemetrySnapshot {
  latency: LatencySLOs;
  throughput: ThroughputTargets & { ingestP95Ms: number };
  availability: {
    availability: number;
    totalRequests: number;
    errorCount: number;
  };
  cost: {
    ingestUnitCostPerThousand: number;
    graphqlUnitCostPerMillion: number;
    monthlyIngestCost: number;
    monthlyGraphqlCost: number;
  };
  security: SecurityControls;
  residencyDecisions: ResidencyDecision[];
  connectors: ConnectorTelemetry[];
}

export type GuardrailViolationKind =
  | 'latency'
  | 'throughput'
  | 'availability'
  | 'cost'
  | 'security'
  | 'residency';

export interface GuardrailAction {
  id: string;
  type: 'alert' | 'throttle' | 'backout' | 'freeze';
  target: string;
  reason: string;
  severity: 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface GuardrailViolation {
  id: string;
  kind: GuardrailViolationKind;
  component: string;
  message: string;
  severity: 'warning' | 'critical';
  metric?: string;
  value?: number;
  threshold?: number;
  suggestedAction?: GuardrailAction['type'];
}

export interface GuardrailEvaluationResult {
  violations: GuardrailViolation[];
  actions: GuardrailAction[];
}

export interface BanditArm {
  id: string;
  latencyP95Ms: number;
  costPerEvent: number;
  qualityScore: number;
  residency: string;
  allowedResidencies: string[];
  purpose: string;
  allowedPurposes: string[];
}

export interface BanditOutcome {
  armId: string;
  latencyP95Ms: number;
  costPerEvent: number;
  success: boolean;
}

const DEFAULT_LATENCY_SLOS: LatencySLOs = {
  apiReadP95Ms: 350,
  apiWriteP95Ms: 700,
  apiSubscriptionP95Ms: 250,
  graph1HopP95Ms: 300,
  graph2To3HopP95Ms: 1200,
  ingestP95Ms: 100,
};

const DEFAULT_THROUGHPUT: ThroughputTargets = {
  ingestEventsPerSecondPerPod: 1000,
};

const DEFAULT_AVAILABILITY: AvailabilityTargets = {
  monthlyAvailability: 0.999,
  errorBudgetFraction: 0.001,
  alertBurnRates: [0.5, 0.8],
};

const DEFAULT_COSTS: CostCaps = {
  ingestPerThousandEvents: 0.1,
  graphqlPerMillionCalls: 2,
  monthlyIngestBudget: 5000,
  monthlyGraphqlBudget: 5000,
  alertThresholdFraction: 0.8,
};

const DEFAULT_SECURITY: SecurityControls = {
  oidcEnabled: true,
  opaAbacEnabled: true,
  mTlsEnabled: true,
  fieldLevelEncryptionEnabled: true,
  provenanceLedgerEnabled: true,
  standardRetentionDays: 365,
  piiRetentionDays: 30,
  warrantBindingRequired: true,
};

function violation(
  kind: GuardrailViolationKind,
  component: string,
  message: string,
  severity: 'warning' | 'critical',
  metric?: string,
  value?: number,
  threshold?: number,
  suggestedAction?: GuardrailAction['type'],
): GuardrailViolation {
  return {
    id: randomUUID(),
    kind,
    component,
    message,
    severity,
    metric,
    value,
    threshold,
    suggestedAction,
  };
}

function action(
  type: GuardrailAction['type'],
  target: string,
  reason: string,
  severity: GuardrailAction['severity'],
  metadata?: Record<string, unknown>,
): GuardrailAction {
  return {
    id: randomUUID(),
    type,
    target,
    reason,
    severity,
    metadata,
  };
}

export class IntelGraphGuardrailEngine {
  private readonly latency: LatencySLOs;
  private readonly throughput: ThroughputTargets;
  private readonly availability: AvailabilityTargets;
  private readonly costs: CostCaps;
  private readonly security: SecurityControls;

  constructor(options?: Partial<{
    latency: LatencySLOs;
    throughput: ThroughputTargets;
    availability: AvailabilityTargets;
    costs: CostCaps;
    security: SecurityControls;
  }>) {
    this.latency = options?.latency ?? DEFAULT_LATENCY_SLOS;
    this.throughput = options?.throughput ?? DEFAULT_THROUGHPUT;
    this.availability = options?.availability ?? DEFAULT_AVAILABILITY;
    this.costs = options?.costs ?? DEFAULT_COSTS;
    this.security = options?.security ?? DEFAULT_SECURITY;
  }

  evaluate(snapshot: TelemetrySnapshot): GuardrailEvaluationResult {
    const violations: GuardrailViolation[] = [];
    const actions: GuardrailAction[] = [];

    violations.push(
      ...this.evaluateLatency(snapshot.latency),
      ...this.evaluateThroughput(snapshot.throughput),
      ...this.evaluateAvailability(snapshot.availability),
      ...this.evaluateCost(snapshot.cost, snapshot.connectors),
      ...this.evaluateSecurity(snapshot.security),
      ...this.evaluateResidency(snapshot.residencyDecisions),
    );

    for (const v of violations) {
      if (v.kind === 'cost' && v.suggestedAction === 'throttle') {
        actions.push(action('throttle', v.component, v.message, v.severity));
      }
      if (v.kind === 'cost' && v.suggestedAction === 'backout') {
        actions.push(action('backout', v.component, v.message, v.severity));
      }
      if (v.kind === 'availability' || v.kind === 'latency') {
        actions.push(action('alert', v.component, v.message, v.severity));
      }
      if (v.kind === 'security') {
        actions.push(action('freeze', v.component, v.message, v.severity));
      }
    }

    return { violations, actions };
  }

  private evaluateLatency(latency: LatencySLOs): GuardrailViolation[] {
    const checks: Array<[keyof LatencySLOs, number]> = [
      ['apiReadP95Ms', this.latency.apiReadP95Ms],
      ['apiWriteP95Ms', this.latency.apiWriteP95Ms],
      ['apiSubscriptionP95Ms', this.latency.apiSubscriptionP95Ms],
      ['graph1HopP95Ms', this.latency.graph1HopP95Ms],
      ['graph2To3HopP95Ms', this.latency.graph2To3HopP95Ms],
      ['ingestP95Ms', this.latency.ingestP95Ms],
    ];
    const results: GuardrailViolation[] = [];
    for (const [metric, threshold] of checks) {
      const observed = latency[metric];
      if (observed > threshold) {
        results.push(
          violation(
            'latency',
            metric,
            `Latency breach: ${metric}=${observed}ms exceeds ${threshold}ms`,
            'critical',
            metric,
            observed,
            threshold,
            'alert',
          ),
        );
      }
    }
    return results;
  }

  private evaluateThroughput(throughput: ThroughputTargets & { ingestP95Ms: number }): GuardrailViolation[] {
    const results: GuardrailViolation[] = [];
    if (throughput.ingestEventsPerSecondPerPod < this.throughput.ingestEventsPerSecondPerPod) {
      results.push(
        violation(
          'throughput',
          'ingest',
          `Throughput shortfall: ${throughput.ingestEventsPerSecondPerPod}ev/s per pod below target ${this.throughput.ingestEventsPerSecondPerPod}`,
          'critical',
          'ingestEventsPerSecondPerPod',
          throughput.ingestEventsPerSecondPerPod,
          this.throughput.ingestEventsPerSecondPerPod,
          'alert',
        ),
      );
    }
    if (throughput.ingestP95Ms > this.latency.ingestP95Ms) {
      results.push(
        violation(
          'throughput',
          'ingest-latency',
          `Ingest latency breach: p95=${throughput.ingestP95Ms}ms exceeds ${this.latency.ingestP95Ms}ms`,
          'critical',
          'ingestP95Ms',
          throughput.ingestP95Ms,
          this.latency.ingestP95Ms,
          'alert',
        ),
      );
    }
    return results;
  }

  private evaluateAvailability(availability: TelemetrySnapshot['availability']): GuardrailViolation[] {
    const { availability: observedAvailability, totalRequests, errorCount } = availability;
    const allowedErrors = totalRequests * this.availability.errorBudgetFraction;
    const burnRate = errorCount / Math.max(1, allowedErrors);
    const violations: GuardrailViolation[] = [];

    if (observedAvailability < this.availability.monthlyAvailability) {
      violations.push(
        violation(
          'availability',
          'api',
          `Availability ${observedAvailability} below target ${this.availability.monthlyAvailability}`,
          'critical',
          'availability',
          observedAvailability,
          this.availability.monthlyAvailability,
          'alert',
        ),
      );
    }

    for (const threshold of this.availability.alertBurnRates) {
      if (burnRate >= threshold) {
        violations.push(
          violation(
            'availability',
            'error-budget',
            `Error budget burn at ${(burnRate * 100).toFixed(1)}% exceeds ${(threshold * 100).toFixed(0)}% threshold`,
            threshold >= 0.8 ? 'critical' : 'warning',
            'burnRate',
            Number(burnRate.toFixed(2)),
            threshold,
            'alert',
          ),
        );
      }
    }

    return violations;
  }

  private evaluateCost(cost: TelemetrySnapshot['cost'], connectors: ConnectorTelemetry[]): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    if (cost.ingestUnitCostPerThousand > this.costs.ingestPerThousandEvents) {
      violations.push(
        violation(
          'cost',
          'ingest-unit',
          `Ingest unit cost $${cost.ingestUnitCostPerThousand} exceeds cap $${this.costs.ingestPerThousandEvents} per 1k`,
          'critical',
          'ingestUnitCostPerThousand',
          cost.ingestUnitCostPerThousand,
          this.costs.ingestPerThousandEvents,
          'throttle',
        ),
      );
    }
    if (cost.graphqlUnitCostPerMillion > this.costs.graphqlPerMillionCalls) {
      violations.push(
        violation(
          'cost',
          'graphql-unit',
          `GraphQL unit cost $${cost.graphqlUnitCostPerMillion} exceeds cap $${this.costs.graphqlPerMillionCalls} per 1M`,
          'critical',
          'graphqlUnitCostPerMillion',
          cost.graphqlUnitCostPerMillion,
          this.costs.graphqlPerMillionCalls,
          'throttle',
        ),
      );
    }
    if (cost.monthlyIngestCost >= this.costs.monthlyIngestBudget * this.costs.alertThresholdFraction) {
      violations.push(
        violation(
          'cost',
          'ingest-monthly',
          `Ingest monthly spend $${cost.monthlyIngestCost} breaching ${this.costs.alertThresholdFraction * 100}% of budget $${this.costs.monthlyIngestBudget}`,
          'warning',
          'monthlyIngestCost',
          cost.monthlyIngestCost,
          this.costs.monthlyIngestBudget * this.costs.alertThresholdFraction,
          'throttle',
        ),
      );
    }
    if (cost.monthlyGraphqlCost >= this.costs.monthlyGraphqlBudget * this.costs.alertThresholdFraction) {
      violations.push(
        violation(
          'cost',
          'graphql-monthly',
          `GraphQL monthly spend $${cost.monthlyGraphqlCost} breaching ${this.costs.alertThresholdFraction * 100}% of budget $${this.costs.monthlyGraphqlBudget}`,
          'warning',
          'monthlyGraphqlCost',
          cost.monthlyGraphqlCost,
          this.costs.monthlyGraphqlBudget * this.costs.alertThresholdFraction,
          'throttle',
        ),
      );
    }

    for (const connector of connectors) {
      if (connector.monthlySpend > connector.monthlyBudget) {
        violations.push(
          violation(
            'cost',
            connector.id,
            `Connector ${connector.name} monthly spend $${connector.monthlySpend} exceeds budget $${connector.monthlyBudget}`,
            'critical',
            'connectorMonthlySpend',
            connector.monthlySpend,
            connector.monthlyBudget,
            'backout',
          ),
        );
      }
      if (connector.errorRate > 0.05) {
        violations.push(
          violation(
            'availability',
            connector.id,
            `Connector ${connector.name} error rate ${(connector.errorRate * 100).toFixed(1)}% exceeds 5% guardrail`,
            'warning',
            'connectorErrorRate',
            Number(connector.errorRate.toFixed(3)),
            0.05,
            'alert',
          ),
        );
      }
    }

    return violations;
  }

  private evaluateSecurity(security: SecurityControls): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const checks: Array<[keyof SecurityControls, string]> = [
      ['oidcEnabled', 'OIDC + JWKS SSO must be enabled'],
      ['opaAbacEnabled', 'OPA ABAC policies must be enforced'],
      ['mTlsEnabled', 'mTLS must be enabled for all services'],
      ['fieldLevelEncryptionEnabled', 'Field-level encryption required'],
      ['provenanceLedgerEnabled', 'Immutable provenance ledger must be enabled'],
    ];
    for (const [flag, message] of checks) {
      if (!security[flag]) {
        violations.push(
          violation('security', 'platform', message, 'critical', flag, 0, 1, 'freeze'),
        );
      }
    }
    if (security.standardRetentionDays < 365) {
      violations.push(
        violation(
          'security',
          'retention',
          `Standard retention ${security.standardRetentionDays}d below mandated 365d`,
          'critical',
          'standardRetentionDays',
          security.standardRetentionDays,
          365,
          'freeze',
        ),
      );
    }
    if (security.piiRetentionDays > 30) {
      violations.push(
        violation(
          'security',
          'pii-retention',
          `PII retention ${security.piiRetentionDays}d exceeds 30d default`,
          'warning',
          'piiRetentionDays',
          security.piiRetentionDays,
          30,
          'freeze',
        ),
      );
    }
    if (!security.warrantBindingRequired) {
      violations.push(
        violation(
          'security',
          'authority-binding',
          'Warrant/authority binding must be enforced for sensitive reveals',
          'critical',
          'warrantBindingRequired',
          0,
          1,
          'freeze',
        ),
      );
    }
    return violations;
  }

  evaluateResidency(residencyDecisions: ResidencyDecision[]): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    for (const decision of residencyDecisions) {
      if (!decision.allowedResidencies.includes(decision.residency)) {
        violations.push(
          violation(
            'residency',
            decision.resourceId,
            `Residency ${decision.residency} not permitted (allowed: ${decision.allowedResidencies.join(', ')})`,
            'critical',
            'residency',
            undefined,
            undefined,
            'freeze',
          ),
        );
      }
      if (!decision.allowedPurposes.includes(decision.purpose)) {
        violations.push(
          violation(
            'residency',
            decision.resourceId,
            `Purpose ${decision.purpose} not permitted (allowed: ${decision.allowedPurposes.join(', ')})`,
            'critical',
            'purpose',
            undefined,
            undefined,
            'freeze',
          ),
        );
      }
    }
    return violations;
  }
}

export class CostAndSloAwareBandit {
  private readonly epsilon: number;
  private readonly latencyTargetMs: number;
  private readonly costWeight: number;
  private readonly latencyWeight: number;
  private readonly qualityWeight: number;
  private readonly residencyGuards: IntelGraphGuardrailEngine;
  private readonly outcomes = new Map<string, BanditOutcome[]>();

  constructor(params?: {
    epsilon?: number;
    latencyTargetMs?: number;
    costWeight?: number;
    latencyWeight?: number;
    qualityWeight?: number;
    residencyGuards?: IntelGraphGuardrailEngine;
  }) {
    this.epsilon = params?.epsilon ?? 0.1;
    this.latencyTargetMs = params?.latencyTargetMs ?? DEFAULT_LATENCY_SLOS.graph1HopP95Ms;
    this.costWeight = params?.costWeight ?? 0.4;
    this.latencyWeight = params?.latencyWeight ?? 0.4;
    this.qualityWeight = params?.qualityWeight ?? 0.2;
    this.residencyGuards = params?.residencyGuards ?? new IntelGraphGuardrailEngine();
  }

  selectArm(arms: BanditArm[], residencyDecisions: ResidencyDecision[]): BanditArm {
    const residencyViolations = this.residencyGuards.evaluateResidency(residencyDecisions);
    if (residencyViolations.length > 0) {
      throw new Error('Residency or purpose violations prevent selection');
    }
    const filteredArms = arms.filter((arm) =>
      arm.allowedResidencies.includes(arm.residency) &&
      arm.allowedPurposes.includes(arm.purpose),
    );
    if (filteredArms.length === 0) {
      throw new Error('No eligible arms after residency/purpose filtering');
    }

    const explore = Math.random() < this.epsilon;
    if (explore) {
      return filteredArms[Math.floor(Math.random() * filteredArms.length)];
    }

    return filteredArms
      .map((arm) => ({ arm, score: this.scoreArm(arm) }))
      .sort((a, b) => b.score - a.score)[0].arm;
  }

  recordOutcome(outcome: BanditOutcome): void {
    const history = this.outcomes.get(outcome.armId) ?? [];
    history.push(outcome);
    this.outcomes.set(outcome.armId, history.slice(-50));
  }

  private scoreArm(arm: BanditArm): number {
    const normalizedLatency = Math.min(1, this.latencyTargetMs / Math.max(1, arm.latencyP95Ms));
    const normalizedCost = Math.max(0, 1 - arm.costPerEvent);
    const normalizedQuality = Math.min(1, arm.qualityScore);
    const history = this.outcomes.get(arm.id) ?? [];
    const successRate = history.length === 0 ? 1 : history.filter((o) => o.success).length / history.length;

    return (
      this.costWeight * normalizedCost +
      this.latencyWeight * normalizedLatency +
      this.qualityWeight * ((normalizedQuality + successRate) / 2)
    );
  }
}
