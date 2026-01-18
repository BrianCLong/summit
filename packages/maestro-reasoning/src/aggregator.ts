import type { AggregationDecision, Aggregator, LaneResult } from './types.js';
import { evidenceScore } from './evidence.js';

const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, val]) => [key, sortObjectKeys(val)]));
  }
  return value;
};

export const claimsSignature = (result: LaneResult): string => {
  const normalized = sortObjectKeys(result.structuredClaims);
  return JSON.stringify(normalized);
};

export const defaultAggregator: Aggregator = {
  aggregate(results: LaneResult[]): AggregationDecision {
    const scoreByLane: Record<string, number> = {};
    results.forEach((result) => {
      scoreByLane[result.laneId] = evidenceScore(result.evidenceArtifacts) + result.confidence;
    });

    const ranked = [...results].sort((left, right) => {
      return scoreByLane[right.laneId] - scoreByLane[left.laneId];
    });

    const signatures = new Set(results.map(claimsSignature));
    const disagreement = signatures.size > 1;

    const selected = ranked[0];

    return {
      selectedLaneId: selected.laneId,
      finalAnswer: selected.finalAnswer,
      scoreByLane,
      disagreement,
      rationale: disagreement
        ? 'Lane claims diverged; selected highest-evidence lane.'
        : 'Lane claims converged; selected highest-evidence lane.',
    };
  },
};
