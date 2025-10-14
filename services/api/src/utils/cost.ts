export function estimateCost(prompt: string){
  const p = (prompt||'').toLowerCase();
  const factors: Record<string, number> = {};
  factors.hops = /shortest|path/.test(p) ? 6 : 3;
  factors.allPaths = /(all\s+paths|expand\s+all)/.test(p) ? 2 : 0;
  factors.filters = /(where|since|as of|between|before|after)/.test(p) ? -1 : 0;
  factors.community = /(community|cluster)/.test(p) ? 1 : 0;
  const base = 8 * factors.hops + 20 * factors.allPaths + 10 * factors.community - 5 * factors.filters;
  return { score: Math.max(1, Math.round(base)), factors };
}

