import type { DatasetDiff, GovernanceActions, ImpactDriverDelta, ImpactProjection } from './types.js';

function resolveBaseline(diff: DatasetDiff) {
  const availability = diff.governanceContext?.baselineSlo?.availability ?? 0.998;
  const latencyMs = diff.governanceContext?.baselineSlo?.latencyMs ?? 250;
  const freshnessMinutes = diff.governanceContext?.baselineSlo?.freshnessMinutes ?? 30;
  const costMonthlyUsd = diff.governanceContext?.baselineCostMonthlyUsd ?? 10000;
  return { availability, latencyMs, freshnessMinutes, costMonthlyUsd };
}

function impactFromPolicyTags(actions: GovernanceActions): ImpactDriverDelta {
  const count = actions.policyTagUpdates.length;
  const latencyDeltaMs = count * 2;
  const availabilityDelta = -0.0001 * count;
  const freshnessDeltaMinutes = count * 0.2;
  const costDeltaMonthlyUsd = count * 150;
  return {
    name: 'policy-tag-updates',
    latencyDeltaMs,
    availabilityDelta,
    freshnessDeltaMinutes,
    costDeltaMonthlyUsd
  };
}

function impactFromContracts(actions: GovernanceActions): ImpactDriverDelta {
  const count = actions.contractRenegotiationFlags.length;
  const latencyDeltaMs = count * 5;
  const availabilityDelta = -0.0003 * count;
  const freshnessDeltaMinutes = count * 0.5;
  const costDeltaMonthlyUsd = count * 400;
  return {
    name: 'contract-renegotiations',
    latencyDeltaMs,
    availabilityDelta,
    freshnessDeltaMinutes,
    costDeltaMonthlyUsd
  };
}

function impactFromDp(actions: GovernanceActions): ImpactDriverDelta {
  const count = actions.dpBudgetRecalculations.length;
  const latencyDeltaMs = count * 3;
  const availabilityDelta = -0.00005 * count;
  const freshnessDeltaMinutes = count * 0.3;
  const costDeltaMonthlyUsd = count * 600;
  return {
    name: 'dp-budget-recalculations',
    latencyDeltaMs,
    availabilityDelta,
    freshnessDeltaMinutes,
    costDeltaMonthlyUsd
  };
}

function impactFromCaches(actions: GovernanceActions): ImpactDriverDelta {
  const count = actions.cachePurges.length;
  const latencyDeltaMs = count * 8;
  const availabilityDelta = -0.0002 * count;
  const freshnessDeltaMinutes = count * 1.5;
  const costDeltaMonthlyUsd = count * 250;
  return {
    name: 'cache-purges',
    latencyDeltaMs,
    availabilityDelta,
    freshnessDeltaMinutes,
    costDeltaMonthlyUsd
  };
}

function impactFromRetraining(actions: GovernanceActions, diff: DatasetDiff): ImpactDriverDelta {
  const count = actions.retrainNotices.length;
  const driftPressure = diff.distributionShifts.reduce((acc, shift) => acc + shift.magnitude, 0);
  const latencyDeltaMs = Number((count * 4 + driftPressure * 3).toFixed(2));
  const availabilityDelta = Number((-0.0002 * count - 0.0001 * driftPressure).toFixed(6));
  const freshnessDeltaMinutes = Number((count * 2).toFixed(2));
  const costDeltaMonthlyUsd = Number((count * 850 + driftPressure * 120).toFixed(2));
  return {
    name: 'retrain-notices',
    latencyDeltaMs,
    availabilityDelta,
    freshnessDeltaMinutes,
    costDeltaMonthlyUsd
  };
}

function aggregateDrivers(drivers: ImpactDriverDelta[]) {
  return drivers.reduce(
    (acc, driver) => {
      acc.latencyDeltaMs += driver.latencyDeltaMs;
      acc.availabilityDelta += driver.availabilityDelta;
      acc.freshnessDeltaMinutes += driver.freshnessDeltaMinutes;
      acc.costDeltaMonthlyUsd += driver.costDeltaMonthlyUsd;
      return acc;
    },
    { latencyDeltaMs: 0, availabilityDelta: 0, freshnessDeltaMinutes: 0, costDeltaMonthlyUsd: 0 }
  );
}

export function simulateImpact(diff: DatasetDiff, actions: GovernanceActions): ImpactProjection {
  const baseline = resolveBaseline(diff);
  const drivers: ImpactDriverDelta[] = [
    impactFromPolicyTags(actions),
    impactFromContracts(actions),
    impactFromDp(actions),
    impactFromCaches(actions),
    impactFromRetraining(actions, diff)
  ].filter((driver) =>
    driver.latencyDeltaMs !== 0 || driver.availabilityDelta !== 0 || driver.freshnessDeltaMinutes !== 0 || driver.costDeltaMonthlyUsd !== 0
  );

  const totals = aggregateDrivers(drivers);
  const projected = {
    availability: Number((baseline.availability + totals.availabilityDelta).toFixed(6)),
    latencyMs: Number((baseline.latencyMs + totals.latencyDeltaMs).toFixed(2)),
    freshnessMinutes: Number((baseline.freshnessMinutes + totals.freshnessDeltaMinutes).toFixed(2)),
    costMonthlyUsd: Number((baseline.costMonthlyUsd + totals.costDeltaMonthlyUsd).toFixed(2))
  };

  const notes: string[] = [];
  if (totals.latencyDeltaMs > 0) {
    notes.push('Latency increase expected while governance controls deploy.');
  }
  if (totals.costDeltaMonthlyUsd > 0) {
    notes.push('Monthly run-rate will rise due to control implementation.');
  }
  if (actions.retrainNotices.length > 0) {
    notes.push('Model retraining required to absorb observed drift.');
  }

  return {
    datasetId: diff.datasetId,
    scenario: 'post-governance-control',
    timeHorizonDays: 30,
    baseline,
    projected,
    drivers,
    notes
  };
}
