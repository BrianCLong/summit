import YAML from 'yaml';
import {
  listPools,
  currentPricing,
  pickCheapestEligible,
} from './conductor/scheduling/pools.js';

export async function advise({ runbookYaml }: { runbookYaml: string }) {
  const rb: any = YAML.parse(runbookYaml);
  const pools = await listPools();
  const pricing = await currentPricing();
  const recs: any[] = [];
  let savedUsd = 0;
  const estFor = (_n: any) => ({ cpuSec: 60, gbSec: 1, egressGb: 0.02 });
  for (const n of rb?.graph?.nodes || []) {
    const est = estFor(n);
    const residency = rb?.policy?.residency;
    const best = pickCheapestEligible(pools, pricing, est, residency);
    if (best) {
      recs.push({ stepId: n.id, to: best.id, estPrice: best.price });
      savedUsd += Math.max(0, best.price * 0.1); // placeholder savings estimate
    }
  }
  return { savedUsd, recs };
}
