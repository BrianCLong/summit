import { BeliefState, DriftVector, NarrativeFrame, PerceptionState } from "./narrative-model";

export interface PerceptionEdge {
  from: string;
  to: string;
  relation: "FRAMES" | "SHAPES" | "DRIVES";
  weight: number;
}

export interface PhenomenologyGraph {
  nodes: Array<NarrativeFrame | BeliefState | PerceptionState | DriftVector>;
  edges: PerceptionEdge[];
}

export function buildPerceptionEdges(
  frame: NarrativeFrame,
  belief: BeliefState,
  perception: PerceptionState
): PerceptionEdge[] {
  return [
    {
      from: frame.id,
      to: belief.id,
      relation: "FRAMES",
      weight: belief.certainty,
    },
    {
      from: belief.id,
      to: perception.id,
      relation: "SHAPES",
      weight: belief.emotionalValence,
    },
  ];
}

export function buildPhenomenologyGraph(
  frame: NarrativeFrame,
  belief: BeliefState,
  perception: PerceptionState,
  drift?: DriftVector
): PhenomenologyGraph {
  const nodes = drift ? [frame, belief, perception, drift] : [frame, belief, perception];
  const edges = buildPerceptionEdges(frame, belief, perception);

  if (drift) {
    edges.push({
      from: perception.id,
      to: `${drift.audienceId}:${drift.metric}`,
      relation: "DRIVES",
      weight: Math.abs(drift.delta),
    });
  }

  return { nodes, edges };
}
