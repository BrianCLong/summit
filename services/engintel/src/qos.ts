export type Lane = 'gold' | 'silver' | 'bronze';
export function laneFor(pr: {
  labels: string[];
  risk: string;
  confidence: number;
}): Lane {
  if (pr.labels.includes('hotfix') || pr.risk === 'high') return 'gold';
  if (pr.confidence >= 85 && pr.risk === 'low') return 'silver';
  return 'bronze';
}
