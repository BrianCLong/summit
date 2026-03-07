export interface WorldviewPlate {
  id: string;
  label: string;
  velocity: number;
  scope: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectPlates(_args: { scope: string; window: string }): WorldviewPlate[] {
  return [];
}
