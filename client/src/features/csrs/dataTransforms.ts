import type {
  DependencyRow,
  PurposeTimeline,
  RetentionPlan,
  TimelineRow,
} from './types';

const NEAR_BREACH_BUFFER_DAYS = 2;

export function buildTimelineRows(plan: RetentionPlan): TimelineRow[] {
  return plan.datasets.flatMap((dataset) =>
    dataset.purposes.map((purpose) => ({
      dataset: dataset.name,
      purpose: purpose.purpose,
      baselineHorizon: purpose.baseline_deletion_horizon,
      lateWriteHorizon: purpose.late_write_horizon,
      backfillHorizon: purpose.backfill_horizon,
      riskLevel: determineRiskLevel(purpose),
      blockers: formatRiskNotes(purpose),
    }))
  );
}

export function buildDependencyRows(plan: RetentionPlan): DependencyRow[] {
  return plan.datasets.flatMap((dataset) =>
    dataset.dependencies.map((dependency) => ({
      dataset: dataset.name,
      name: dependency.name,
      purpose: dependency.purpose,
      type: dependency.type,
      impact: dependency.impact,
      alignmentDeltaDays: dependency.alignment_delta_days,
    }))
  );
}

export function determineRiskLevel(purpose: PurposeTimeline): TimelineRow['riskLevel'] {
  if (purpose.compliance_risk.some((entry) => entry.status === 'breach')) {
    return 'breach';
  }
  if (
    purpose.compliance_risk.some(
      (entry) =>
        entry.projected_shift_days > 0 &&
        entry.allowed_days - entry.projected_shift_days <= NEAR_BREACH_BUFFER_DAYS
    )
  ) {
    return 'elevated';
  }
  return 'ok';
}

function formatRiskNotes(purpose: PurposeTimeline): string[] {
  return purpose.compliance_risk.map((entry) => {
    const prefix = `${entry.type.replace('_', ' ')}: ${entry.status}`;
    const delta = entry.delta_days === 0 ? '' : ` (${entry.delta_days > 0 ? '+' : ''}${entry.delta_days}d)`;
    return `${prefix}${delta}`.trim();
  });
}
