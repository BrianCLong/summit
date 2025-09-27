import crypto from 'crypto';
import { simulateImpact } from './simulator.js';
import { signPlan } from './signature.js';
import type {
  CachePurge,
  ChangeControlMapping,
  DatasetDiff,
  DPBudgetRecalculation,
  GeneratePlanOptions,
  GovernanceActionPlan,
  GovernanceActions,
  PolicyTagUpdate,
  RetrainNotice
} from './types.js';

function hashedOffset(input: string): number {
  const hash = crypto.createHash('sha256').update(input).digest();
  let value = 0;
  for (let i = 0; i < 6; i += 1) {
    value = (value << 8) + hash[i];
  }
  return value;
}

function deterministicTimestamp(seed: string, key: string, offsetDays = 0, offsetMinutes = 0): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  const baseEpoch = Date.UTC(2025, 0, 1);
  const base = baseEpoch + (hashedOffset(`${seed}:${key}`) % (365 * dayMs));
  const timestamp = base + offsetDays * dayMs + offsetMinutes * minuteMs;
  return new Date(timestamp).toISOString();
}

function resolveSeed(diff: DatasetDiff, overrideSeed?: string): string {
  if (overrideSeed) {
    return overrideSeed;
  }

  if (diff.seed !== undefined) {
    return diff.seed.toString();
  }

  const base = `${diff.datasetId}:${diff.diffId ?? `${diff.previousVersion ?? 'unknown'}->${diff.currentVersion ?? 'unknown'}`}`;
  return Buffer.from(base).toString('base64').slice(0, 16);
}

function buildPolicyTagUpdates(diff: DatasetDiff): PolicyTagUpdate[] {
  const updates: PolicyTagUpdate[] = [];

  for (const change of diff.schemaChanges) {
    if (change.changeType === 'added-field' || change.changeType === 'type-changed') {
      const tags: string[] = [];
      if (change.classificationAfter) {
        tags.push(`classification:${change.classificationAfter.toLowerCase()}`);
      }
      if (change.piiCategory && change.piiCategory !== 'none') {
        tags.push(`pii:${change.piiCategory.toLowerCase()}`);
      }
      if (typeof change.sensitivityScore === 'number') {
        if (change.sensitivityScore >= 0.7) {
          tags.push('sensitivity:high');
        } else if (change.sensitivityScore >= 0.4) {
          tags.push('sensitivity:medium');
        }
      }
      if (tags.length > 0) {
        updates.push({
          field: change.field,
          requiredTags: Array.from(new Set(tags)).sort(),
          reason: change.changeType === 'added-field' ? 'New attribute requires governance tags.' : 'Field reclassified after type change.',
          severity: change.sensitivityScore && change.sensitivityScore >= 0.7 ? 'high' : 'medium'
        });
      }
    }

    if (change.changeType === 'removed-field' && change.classificationBefore) {
      updates.push({
        field: change.field,
        requiredTags: ['status:decommissioned'],
        reason: 'Field removed – governance catalog needs decommission tag.',
        severity: 'low'
      });
    }
  }

  return updates.sort((a, b) => a.field.localeCompare(b.field));
}

function buildDpBudgetRecalculations(diff: DatasetDiff): DPBudgetRecalculation[] {
  const recalcs: DPBudgetRecalculation[] = [];
  const baseSensitiveField = diff.schemaChanges.some(
    (change) => change.changeType === 'added-field' && (change.piiCategory || (change.sensitivityScore ?? 0) >= 0.7)
  );
  if (baseSensitiveField && diff.dpBudget) {
    const proposed = Number((diff.dpBudget.currentEpsilon + 0.25).toFixed(2));
    recalcs.push({
      dataset: diff.datasetId,
      currentEpsilon: diff.dpBudget.currentEpsilon,
      proposedEpsilon: proposed,
      reason: 'Sensitive attribute added; privacy budget needs recalibration.',
      windowDays: 5
    });
  } else if (diff.dpBudget && diff.dpBudget.consumptionDelta > 0.6) {
    const proposed = Number((diff.dpBudget.currentEpsilon + diff.dpBudget.consumptionDelta * 0.1).toFixed(2));
    recalcs.push({
      dataset: diff.datasetId,
      currentEpsilon: diff.dpBudget.currentEpsilon,
      proposedEpsilon: proposed,
      reason: 'Differential privacy spend trending up; recalculate guardrails.',
      windowDays: 7
    });
  }
  return recalcs;
}

function buildCachePurges(diff: DatasetDiff): CachePurge[] {
  const purges: CachePurge[] = [];
  for (const cache of diff.caches ?? []) {
    const requiresBackfill = diff.schemaChanges.some((change) => change.field && change.requiresBackfill);
    purges.push({
      cache: cache.name,
      scope: cache.dependsOnSchema ? 'full' : 'partial',
      reason: cache.dependsOnSchema
        ? 'Schema update invalidates cache materialization.'
        : 'Distribution shift requires selective invalidation.',
      requiresBackfill
    });
  }

  if (purges.length === 0) {
    const highMagnitude = diff.distributionShifts.some((shift) => shift.magnitude >= 0.35);
    if (highMagnitude) {
      purges.push({
        cache: `${diff.datasetId}-derived`,
        scope: 'partial',
        reason: 'High-magnitude drift detected; refresh derived caches.',
        requiresBackfill: false
      });
    }
  }

  return purges.sort((a, b) => a.cache.localeCompare(b.cache));
}

function buildRetrainNotices(diff: DatasetDiff, seed: string): RetrainNotice[] {
  const notices: RetrainNotice[] = [];
  const thresholds = diff.governanceContext?.retrainThresholds ?? {};
  let index = 0;

  for (const shift of diff.distributionShifts) {
    const threshold = thresholds[shift.metric] ?? 0.2;
    if (shift.magnitude >= threshold) {
      const models = diff.governanceContext?.modelsImpacted ?? ['all-downstream-models'];
      const deadline = deterministicTimestamp(seed, `retrain:${shift.metric}:${shift.feature}:${index}`, 7 + index);
      notices.push({
        models,
        featuresImpacted: [shift.feature],
        metric: shift.metric,
        magnitude: Number(shift.magnitude.toFixed(3)),
        deadline,
        reason: `Metric ${shift.metric} exceeded threshold ${threshold}.`
      });
      index += 1;
    }
  }

  return notices.sort((a, b) => a.featuresImpacted[0].localeCompare(b.featuresImpacted[0]));
}

function buildChangeControlMatrix(actions: GovernanceActions, diff: DatasetDiff): ChangeControlMapping[] {
  const mappings: ChangeControlMapping[] = [];

  for (const change of diff.schemaChanges) {
    const controls: string[] = [];
    if (actions.policyTagUpdates.some((update) => update.field === change.field)) {
      controls.push('policy-tag-update');
    }
    if (actions.cachePurges.some((purge) => purge.requiresBackfill && change.requiresBackfill && purge.cache.includes(diff.datasetId))) {
      controls.push('cache-backfill');
    }
    if (actions.dpBudgetRecalculations.length > 0 && change.changeType === 'added-field') {
      controls.push('dp-budget-recalc');
    }

    if (change.changeType === 'removed-field') {
      controls.push('contract-review');
    }

    if (controls.length > 0) {
      mappings.push({
        change: `${change.changeType}:${change.field}`,
        requiredControls: Array.from(new Set(controls)).sort(),
        justification:
          change.changeType === 'added-field'
            ? 'New field impacts governance catalog and privacy budgets.'
            : change.changeType === 'removed-field'
            ? 'Removed attribute requires downstream contract updates.'
            : 'Field adjustment requires aligned operational controls.',
        severity: change.changeType === 'added-field' && (change.sensitivityScore ?? 0) >= 0.7 ? 'high' : 'medium'
      });
    }
  }

  for (const shift of diff.distributionShifts) {
    if (shift.magnitude >= 0.3) {
      mappings.push({
        change: `distribution:${shift.metric}:${shift.feature}`,
        requiredControls: ['retrain-notice', 'slo-review'],
        justification: 'Observed drift exceeds policy thresholds; trigger retraining and SLO validation.',
        severity: 'high'
      });
    }
  }

  return mappings.sort((a, b) => a.change.localeCompare(b.change));
}

function buildContractFlags(diff: DatasetDiff): GovernanceActions['contractRenegotiationFlags'] {
  const flags = [] as GovernanceActions['contractRenegotiationFlags'];
  const breakingChange = diff.schemaChanges.some((change) => change.changeType === 'removed-field' || change.breaking);
  const materialDrift = diff.distributionShifts.some((shift) => shift.magnitude >= 0.35);

  for (const contract of diff.contractsImpacted ?? []) {
    if (breakingChange || materialDrift) {
      const renegotiationWindow = materialDrift ? '14d' : '7d';
      flags.push({
        contract: contract.name,
        reason: breakingChange
          ? 'Breaking schema change detected; contract deliverables must be updated.'
          : 'Material distribution drift observed; review contractual guardrails.',
        renegotiationWindow,
        channels: contract.channels ?? ['legal', 'procurement']
      });
    }
  }

  if (flags.length === 0 && materialDrift) {
    flags.push({
      contract: `${diff.datasetId}-internal-slo`,
      reason: 'Material drift requires internal SLA validation.',
      renegotiationWindow: '14d',
      channels: ['data-governance']
    });
  }

  return flags.sort((a, b) => a.contract.localeCompare(b.contract));
}

export function buildGovernanceActions(diff: DatasetDiff, seedOverride?: string): GovernanceActions {
  const seed = resolveSeed(diff, seedOverride);
  const policyTagUpdates = buildPolicyTagUpdates(diff);
  const dpBudgetRecalculations = buildDpBudgetRecalculations(diff);
  const cachePurges = buildCachePurges(diff);
  const retrainNotices = buildRetrainNotices(diff, seed);
  const contractRenegotiationFlags = buildContractFlags(diff);

  const actions: GovernanceActions = {
    policyTagUpdates,
    contractRenegotiationFlags,
    dpBudgetRecalculations,
    cachePurges,
    retrainNotices,
    changeControlMatrix: []
  };

  actions.changeControlMatrix = buildChangeControlMatrix(actions, diff);

  return actions;
}

export function generateGovernancePlan(diff: DatasetDiff, options: GeneratePlanOptions = {}): GovernanceActionPlan {
  const deterministicSeed = resolveSeed(diff, options.deterministicSeed);
  const governanceActions = buildGovernanceActions(diff, deterministicSeed);
  const impactForecast = simulateImpact(diff, governanceActions);
  const generatedAt = deterministicTimestamp(deterministicSeed, 'plan-generated-at', 0, 15);

  const plan: GovernanceActionPlan = {
    planVersion: '1.0.0',
    datasetId: diff.datasetId,
    diffId: diff.diffId ?? `${diff.previousVersion ?? 'unknown'}->${diff.currentVersion ?? 'unknown'}`,
    previousVersion: diff.previousVersion,
    currentVersion: diff.currentVersion,
    generatedAt,
    deterministicSeed,
    governanceOwners: diff.governanceContext?.owners ?? [],
    governanceActions,
    impactForecast
  };

  if (options.signingKeyPem) {
    const signatureTimestamp = deterministicTimestamp(deterministicSeed, 'plan-signature', 0, 30);
    const { signedPlan } = signPlan(
      plan,
      options.signingKeyPem,
      options.signingKeyId ?? 'ddgm-default',
      options.publicKeyPem,
      signatureTimestamp
    );
    return signedPlan;
  }

  return plan;
}
