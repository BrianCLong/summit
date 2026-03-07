export interface OceanCurrent {
  id: string;
  label: string;
  strength: number;
  direction: string;
  time_window: string;
  explain_ref: string;
}

export function detectCurrents(_args: { window: string }): OceanCurrent[] {
  return [];
}
