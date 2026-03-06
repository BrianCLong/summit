import type { Narrative } from "../api/types";

export type GravityWell = {
  id: string;
  label: string;
  strength: number;
  evidence_refs: string[];
};

export function detectGravityWells(narratives: Narrative[]): GravityWell[] {
  if (!narratives.length) return [];
  return [
    {
      id: "well:seed",
      label: "Emergent Convergence Basin",
      strength: 0.42,
      evidence_refs: narratives.slice(0, 3).map((item) => item.id),
    },
  ];
}
