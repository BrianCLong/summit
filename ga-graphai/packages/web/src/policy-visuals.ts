import type {
  PolicySimulationReport,
  PolicySimulationFrame,
  PolicyMitigationAction
} from 'common-types';

export interface ImpactSparklinePoint {
  iteration: number;
  smoothedRiskDelta: number;
  smoothedCostDelta: number;
  postureShift: number;
}

export type ComplianceMetric = 'risk' | 'cost' | 'posture' | 'incident';

export interface ComplianceMatrixCell {
  metric: ComplianceMetric;
  before: number;
  after: number;
  delta: number;
  label: string;
}

export interface ScenarioStoryboardFrame {
  iteration: number;
  title: string;
  caption: string;
  keyFindings: string[];
}

function smoothSeries<T extends { iteration: number }>(
  frames: T[],
  window = 3,
  projector: (frame: T) => { riskDelta: number; costDelta: number; postureShift: number }
): ImpactSparklinePoint[] {
  if (frames.length === 0) {
    return [];
  }
  const radius = Math.max(1, Math.floor(window / 2));
  return frames.map((frame, index) => {
    let riskAccumulator = 0;
    let costAccumulator = 0;
    let postureAccumulator = 0;
    let samples = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const candidate = frames[index + offset];
      if (!candidate) {
        continue;
      }
      const projected = projector(candidate);
      riskAccumulator += projected.riskDelta;
      costAccumulator += projected.costDelta;
      postureAccumulator += projected.postureShift;
      samples += 1;
    }

    return {
      iteration: frame.iteration,
      smoothedRiskDelta: Number((riskAccumulator / samples).toFixed(2)),
      smoothedCostDelta: Number((costAccumulator / samples).toFixed(2)),
      postureShift: Number((postureAccumulator / samples).toFixed(4))
    };
  });
}

function formatDelta(value: number): number {
  return Number(value.toFixed(2));
}

function describeMitigation(action: PolicyMitigationAction | undefined): string {
  if (!action) {
    return 'Mitigation backlog seeded for automated planning.';
  }
  return `${action.description} (coverage ${action.coverage.toFixed(2)})`;
}

export function buildImpactSparkline(report: PolicySimulationReport): ImpactSparklinePoint[] {
  return smoothSeries(report.frames, 5, frame => ({
    riskDelta: frame.delta.riskUsd,
    costDelta: frame.delta.costUsd,
    postureShift: frame.delta.postureShift
  }));
}

export function buildComplianceMatrix(report: PolicySimulationReport): ComplianceMatrixCell[] {
  return [
    {
      metric: 'risk',
      before: formatDelta(report.baseline.averageRiskUsd),
      after: formatDelta(report.proposed.averageRiskUsd),
      delta: formatDelta(report.delta.riskDeltaUsd),
      label: 'Average risk Δ (USD)'
    },
    {
      metric: 'cost',
      before: formatDelta(report.baseline.costUsd),
      after: formatDelta(report.proposed.costUsd),
      delta: formatDelta(report.delta.costDeltaUsd),
      label: 'Average cost Δ (USD)'
    },
    {
      metric: 'posture',
      before: formatDelta(report.baseline.scenarioScore),
      after: formatDelta(report.proposed.scenarioScore),
      delta: formatDelta(report.delta.complianceDelta),
      label: 'Posture lift (score)'
    },
    {
      metric: 'incident',
      before: Number(report.baseline.incidentProbability.toFixed(4)),
      after: Number(report.proposed.incidentProbability.toFixed(4)),
      delta: Number(report.delta.incidentDelta.toFixed(4)),
      label: 'Incident probability'
    }
  ];
}

function selectStoryboardAnchors(frames: PolicySimulationFrame[]): PolicySimulationFrame[] {
  if (frames.length === 0) {
    return [];
  }
  if (frames.length <= 3) {
    return frames;
  }
  const mid = Math.floor(frames.length / 2);
  return [frames[0], frames[mid], frames.at(-1)!];
}

export function buildScenarioStoryboard(report: PolicySimulationReport): ScenarioStoryboardFrame[] {
  const anchors = selectStoryboardAnchors(report.frames);
  const primaryMitigation = report.mitigations[0];
  return anchors.map(frame => {
    const delta = frame.delta.riskUsd;
    const captionParts = [
      `Risk delta: ${delta.toFixed(2)} USD`,
      `Cost delta: ${frame.delta.costUsd.toFixed(2)} USD`,
      `Posture shift: ${frame.delta.postureShift.toFixed(3)}`
    ];
    const keyFindings = [
      `High-risk nodes: ${report.graphInsights.highRiskNodes.slice(0, 3).join(', ') || 'none'}`,
      describeMitigation(primaryMitigation)
    ];
    if (report.graphInsights.sandboxFindings.length > 0) {
      const finding = report.graphInsights.sandboxFindings[0];
      keyFindings.push(
        `Top sandbox finding ${finding.eventId}: Δ ${finding.postureLiftUsd.toFixed(2)} USD`
      );
    }
    return {
      iteration: frame.iteration,
      title: frame.iteration === anchors[0].iteration
        ? 'Sandbox warm-up'
        : frame.iteration === anchors.at(-1)!.iteration
        ? 'Policy steady-state'
        : 'Mid-flight adjustment',
      caption: captionParts.join(' | '),
      keyFindings
    };
  });
}
