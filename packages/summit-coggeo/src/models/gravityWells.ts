export interface GravityWell {
  id: string;
  label: string;
  strength: number;
  time_window: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectGravityWells(_args: { window: string }): GravityWell[] {
  return [];
}
