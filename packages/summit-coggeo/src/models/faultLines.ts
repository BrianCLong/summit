export interface FaultLine {
  id: string;
  label: string;
  stress: number;
  trigger_sensitivity: number;
  scope: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectFaultLines(_args: { scope: string; window: string }): FaultLine[] {
  return [];
}
