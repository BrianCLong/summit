export type FaultLine = {
  id: string;
  boundary: string;
  stress: number;
  trigger_sensitivity: number;
  evidence_refs: string[];
};

export function detectFaultLines(): FaultLine[] {
  return [];
}
