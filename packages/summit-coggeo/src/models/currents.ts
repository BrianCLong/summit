export type OceanCurrent = {
  id: string;
  origin: string;
  destination: string;
  strength: number;
  evidence_refs: string[];
};

export function detectOceanCurrents(): OceanCurrent[] {
  return [];
}
