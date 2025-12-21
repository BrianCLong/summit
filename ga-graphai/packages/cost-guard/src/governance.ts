import type {
  BudgetAlert,
  BudgetControl,
  ChargebackTagSet,
  ChargebackValidation,
  CostLedger,
  CostLedgerInput,
  KillSwitchDefinition,
  KillSwitchValidation,
  SpendSnapshot,
  TaggableResource,
  TelemetryPolicy,
  TelemetryPolicyDecision,
  VendorContract,
  VendorRecommendation,
} from './types.js';

const REQUIRED_TAGS: (keyof ChargebackTagSet)[] = [
  'service',
  'team',
  'tenant',
  'tier',
  'env',
  'budget_owner',
  'kill_switch_id',
  'ledger_account',
];

const NON_PROD_ENVS = ['dev', 'preview', 'staging'];

const DEFAULT_TELEMETRY_POLICY: TelemetryPolicy = {
  envRetentionDays: { prod: 30, staging: 14, dev: 7, preview: 3 },
  traceSampling: { prod: 1, staging: 0.4, dev: 0.2, preview: 0.1 },
  allowUnstructuredLogs: false,
  maxLabelCardinality: 50,
};

export class TaggingPolicyEnforcer {
  private readonly requiredTags: (keyof ChargebackTagSet)[];

  constructor(requiredTags: (keyof ChargebackTagSet)[] = REQUIRED_TAGS) {
    this.requiredTags = requiredTags;
  }

  validate(resource: TaggableResource): ChargebackValidation {
    const normalized: ChargebackTagSet = this.normalize(resource.tags);
    const missing = this.requiredTags.filter(
      (key) => !normalized[key] || normalized[key].trim().length === 0,
    );

    const violations: string[] = [];

    if (!['0', '1', '2'].includes(normalized.tier)) {
      violations.push('tier must be 0, 1, or 2');
    }

    if (!['prod', 'staging', 'dev', 'preview'].includes(normalized.env)) {
      violations.push('env must be prod, staging, dev, or preview');
    }

    let ttlHours: number | undefined;
    if (resource.annotations?.ttlHours != null) {
      ttlHours = resource.annotations.ttlHours;
      if (ttlHours <= 0) {
        violations.push('ttlHours must be positive when provided');
      }
    }

    if (NON_PROD_ENVS.includes(normalized.env) && (!ttlHours || ttlHours <= 0)) {
      violations.push('non-prod resources require a TTL');
    }

    const expiresAt = ttlHours
      ? new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      : undefined;

    return {
      isValid: missing.length === 0 && violations.length === 0,
      missing,
      violations,
      normalized,
      expiresAt,
    };
  }

  private normalize(tags: Partial<ChargebackTagSet>): ChargebackTagSet {
    const lower = Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [key, value?.toString().trim() ?? '']),
    ) as Partial<ChargebackTagSet>;

    return {
      service: lower.service ?? '',
      team: lower.team ?? '',
      tenant: lower.tenant ?? '',
      tier: lower.tier ?? '',
      env: lower.env ?? '',
      budget_owner: lower.budget_owner ?? '',
      kill_switch_id: lower.kill_switch_id ?? '',
      ledger_account: lower.ledger_account ?? '',
    };
  }
}

export class BudgetGuardrail {
  evaluate(budget: BudgetControl, snapshot: SpendSnapshot): BudgetAlert {
    const budgeted = Math.max(budget.monthlyBudgetUsd, 1);
    const spent = snapshot.actualMonthToDateUsd;
    const projected = snapshot.projectedMonthToDateUsd ?? spent;
    const ratio = projected / budgeted;
    const thresholds = [1, 0.8, 0.5];
    const labels: BudgetAlert['threshold'][] = ['100', '80', '50'];
    let threshold: BudgetAlert['threshold'] = 'normal';

    for (let i = 0; i < thresholds.length; i += 1) {
      if (ratio >= thresholds[i]) {
        threshold = labels[i];
        break;
      }
    }

    const actions: Record<BudgetAlert['threshold'], BudgetAlert['action']> = {
      normal: 'track',
      '50': 'notify',
      '80': 'escalate',
      '100': 'freeze',
    };

    const owner = budget.owner ?? 'unassigned';
    const onCall = budget.onCallContact ?? owner;
    const varianceUsd = Number((projected - budgeted).toFixed(2));
    const variancePct = Number(((projected / budgeted - 1) * 100).toFixed(2));

    return {
      domainId: budget.domainId,
      threshold,
      action: actions[threshold],
      owner,
      onCall,
      message: this.buildMessage(threshold, owner, varianceUsd, variancePct),
      nextCheckMinutes: threshold === '100' ? 30 : 120,
      freezeRequired: threshold === '100',
      projected,
      actual: spent,
      budget: budgeted,
      varianceUsd,
      variancePct,
    };
  }

  private buildMessage(
    threshold: BudgetAlert['threshold'],
    owner: string,
    varianceUsd: number,
    variancePct: number,
  ): string {
    if (threshold === '100') {
      return `Budget breach detected; freeze and rollback required. Owner ${owner} must approve within 30 minutes (variance ${varianceUsd} USD, ${variancePct}%).`;
    }
    if (threshold === '80') {
      return `Budget at 80%+; escalate to ${owner} and review kill-switch plan (variance ${varianceUsd} USD, ${variancePct}%).`;
    }
    if (threshold === '50') {
      return `Budget at 50%+; notify ${owner} and enable weekly variance review (${varianceUsd} USD, ${variancePct}%).`;
    }
    return 'Spend within budget; continue tracking.';
  }
}

export class LedgerBuilder {
  generate(input: CostLedgerInput): CostLedger {
    const currentTotals = this.aggregate(input.currentWeekCosts);
    const previousTotals = this.aggregate(input.previousWeekCosts);

    const entries = Object.keys(currentTotals).map((domainId) => {
      const current = currentTotals[domainId] ?? 0;
      const previous = previousTotals[domainId] ?? 0;
      const deltaUsd = Number((current - previous).toFixed(2));
      const deltaPct = previous === 0 ? 100 : Number(((deltaUsd / previous) * 100).toFixed(2));
      return { domainId, currentUsd: current, previousUsd: previous, deltaUsd, deltaPct };
    });

    const topMovers = this.topMovers(input.currentWeekCosts, input.previousWeekCosts, input.topN ?? 5);

    return {
      generatedAt: new Date(),
      entries,
      topMovers,
      accuracyTarget: '<1% delta error',
      notes: input.notes ?? [],
    };
  }

  private aggregate(costs: CostLedgerInput['currentWeekCosts']): Record<string, number> {
    return costs.reduce<Record<string, number>>((acc, cost) => {
      acc[cost.domainId] = Number(((acc[cost.domainId] ?? 0) + cost.amountUsd).toFixed(2));
      return acc;
    }, {});
  }

  private topMovers(
    current: CostLedgerInput['currentWeekCosts'],
    previous: CostLedgerInput['previousWeekCosts'],
    topN: number,
  ): CostLedger['topMovers'] {
    const previousMap = previous.reduce<Record<string, number>>((acc, record) => {
      acc[`${record.domainId}:${record.resourceId}`] = record.amountUsd;
      return acc;
    }, {});

    const deltas = current.map((record) => {
      const key = `${record.domainId}:${record.resourceId}`;
      const delta = record.amountUsd - (previousMap[key] ?? 0);
      const deltaPct = previousMap[key] ? (delta / previousMap[key]) * 100 : 100;
      return {
        domainId: record.domainId,
        resourceId: record.resourceId,
        deltaUsd: Number(delta.toFixed(2)),
        deltaPct: Number(deltaPct.toFixed(2)),
        owner: record.owner,
        notes: record.notes,
      };
    });

    return deltas
      .sort((a, b) => Math.abs(b.deltaUsd) - Math.abs(a.deltaUsd))
      .slice(0, topN);
  }
}

export class KillSwitchOrchestrator {
  validate(definitions: KillSwitchDefinition[], now: Date = new Date()): KillSwitchValidation {
    const due: KillSwitchDefinition[] = [];
    const healthy: KillSwitchDefinition[] = [];

    definitions.forEach((definition) => {
      if (!definition.lastTestedAt) {
        due.push(definition);
        return;
      }
      const interval = definition.testIntervalHours ?? 168;
      const nextDue = new Date(definition.lastTestedAt.getTime() + interval * 60 * 60 * 1000);
      if (nextDue <= now) {
        due.push(definition);
      } else {
        healthy.push(definition);
      }
    });

    return {
      dueForTest: due,
      healthy,
      message: due.length
        ? `Run kill-switch validation for ${due.length} feature(s) before next release.`
        : 'All kill switches recently validated.',
    };
  }
}

export class TelemetryPolicyEngine {
  private readonly policy: TelemetryPolicy;

  constructor(policy: Partial<TelemetryPolicy> = {}) {
    this.policy = { ...DEFAULT_TELEMETRY_POLICY, ...policy };
  }

  evaluate(tags: ChargebackTagSet): TelemetryPolicyDecision {
    const retentionDays = this.policy.envRetentionDays[tags.env] ?? this.policy.envRetentionDays.dev;
    const traceSample = this.policy.traceSampling[tags.env] ?? this.policy.traceSampling.dev;

    const violations: string[] = [];
    if (!this.policy.allowUnstructuredLogs && tags.env === 'prod') {
      violations.push('unstructured logs disallowed in prod');
    }

    return {
      retentionDays,
      traceSample,
      labels: tags,
      violations,
      maxLabelCardinality: this.policy.maxLabelCardinality,
    };
  }
}

export class VendorRegister {
  recommendRenegotiation(contracts: VendorContract[]): VendorRecommendation[] {
    return contracts
      .map((contract) => {
        const daysToRenewal = Math.max(
          0,
          Math.round((contract.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        const underUtilized = contract.utilizationRatio < 0.6;
        const recommendation = underUtilized || contract.overlapCategory
          ? 'renegotiate'
          : 'monitor';

        return {
          vendor: contract.vendor,
          owner: contract.owner,
          monthlyCostUsd: contract.monthlyCostUsd,
          daysToRenewal,
          recommendation,
          rationale: this.buildRationale(contract, underUtilized, daysToRenewal),
        };
      })
      .sort((a, b) => b.monthlyCostUsd - a.monthlyCostUsd);
  }

  private buildRationale(
    contract: VendorContract,
    underUtilized: boolean,
    daysToRenewal: number,
  ): string {
    const reasons: string[] = [];
    if (underUtilized) {
      reasons.push(`utilization at ${Math.round(contract.utilizationRatio * 100)}%`);
    }
    if (contract.overlapCategory) {
      reasons.push(`overlaps with ${contract.overlapCategory}`);
    }
    if (daysToRenewal <= 60) {
      reasons.push(`renewal in ${daysToRenewal} days`);
    }
    return reasons.length ? reasons.join('; ') : 'contract healthy';
  }
}
