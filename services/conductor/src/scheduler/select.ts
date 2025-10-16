import { scorePool } from './score';
import { listEligible } from './pools';
export function selectPool(req: any, ctx: any) {
  const eligible = listEligible(req);
  const ranked = eligible
    .map((p) => ({ p, s: scorePool(p, req, ctx) }))
    .sort((a, b) => a.s - b.s);
  return ranked[0]?.p || null;
}
