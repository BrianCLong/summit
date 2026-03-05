import type { CoordinationEvent } from "./types";

export interface CoordinationMetrics {
  decisionLatencyDeltaPct: number;
  dependencyChurnRate: number;
  handoffCountReductionPct: number;
  crossTeamGraphDensity: number;
}

export interface CoordinationBaseline {
  avgDecisionLatencyMs: number;
  avgDependencyChangesPerEvent: number;
  avgHandoffsPerEvent: number;
  avgCrossTeamLinksPerEvent: number;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeCoordinationMetrics(
  events: CoordinationEvent[],
  baseline: CoordinationBaseline
): CoordinationMetrics {
  const avgLatency = average(events.map((event) => event.decisionLatencyMs));
  const avgDependencies = average(events.map((event) => event.dependencyIds.length));
  const avgHandoffs = average(events.map((event) => Math.max(event.actors.length - 1, 0)));

  const actorPairs = events.flatMap((event) => {
    if (event.actors.length < 2) {
      return [];
    }

    const pairs: string[] = [];
    for (let i = 0; i < event.actors.length; i += 1) {
      for (let j = i + 1; j < event.actors.length; j += 1) {
        pairs.push([event.actors[i], event.actors[j]].sort().join("::"));
      }
    }

    return pairs;
  });

  const uniquePairs = new Set(actorPairs);
  const totalActors = new Set(events.flatMap((event) => event.actors)).size;
  const maxPairs = totalActors > 1 ? (totalActors * (totalActors - 1)) / 2 : 1;

  return {
    decisionLatencyDeltaPct:
      baseline.avgDecisionLatencyMs === 0
        ? 0
        : ((baseline.avgDecisionLatencyMs - avgLatency) / baseline.avgDecisionLatencyMs) * 100,
    dependencyChurnRate:
      baseline.avgDependencyChangesPerEvent === 0
        ? avgDependencies
        : avgDependencies / baseline.avgDependencyChangesPerEvent,
    handoffCountReductionPct:
      baseline.avgHandoffsPerEvent === 0
        ? 0
        : ((baseline.avgHandoffsPerEvent - avgHandoffs) / baseline.avgHandoffsPerEvent) * 100,
    crossTeamGraphDensity:
      baseline.avgCrossTeamLinksPerEvent === 0
        ? uniquePairs.size / maxPairs
        : uniquePairs.size / maxPairs / baseline.avgCrossTeamLinksPerEvent,
  };
}
