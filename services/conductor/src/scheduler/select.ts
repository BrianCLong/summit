import { scorePool } from './score';

export function selectPool(req: any, ctx: any) {
  const eligible = (ctx.listEligible || (() => []))(req) as any[];
  const ranked = eligible
    .map((p) => ({ p, s: scorePool(p, req, ctx) }))
    .sort((a, b) => a.s - b.s);
  return ranked[0]?.p || null;
}

