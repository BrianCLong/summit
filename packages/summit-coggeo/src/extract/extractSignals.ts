import type { Observation } from "../api/types";

export type ExtractedSignal = {
  kind: "narrative" | "frame" | "emotion" | "belief";
  id: string;
  obs_id: string;
  payload: Record<string, unknown>;
};

export function extractSignals(observation: Observation): ExtractedSignal[] {
  return [
    {
      kind: "narrative",
      id: `nar-candidate:${observation.id}`,
      obs_id: observation.id,
      payload: { label: observation.content.slice(0, 120) },
    },
  ];
}
