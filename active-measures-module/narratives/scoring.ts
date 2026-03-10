import { Claim } from './schema';

export function computeNarrativeShare(claims: Claim[], narrativeId: string): number {
  const total = claims.length || 1;
  return claims.filter(c => c.narrativeIds?.includes(narrativeId)).length / total;
}
