import { Graph, Intervention, RunResult } from './types';
import { neighbors } from './graph';

/**
 * Simple independent-cascade-like diffusion with interventions.
 * belief[i] in [0,1] represents probability of believing the payload.
 */
export function simulate(g: Graph, seedIds: string[], interventions: Intervention[], steps=20): RunResult {
  const belief: Record<string, number> = {};
  for (const n of g.nodes) belief[n.id] = seedIds.includes(n.id) ? 1 : 0;

  const intervsByT = new Map<number, Intervention[]>();
  for (const iv of interventions) intervsByT.set(iv.t, [...(intervsByT.get(iv.t)||[]), iv]);

  const curve: number[] = [];
  for (let t=0; t<steps; t++) {
    // apply interventions
    const ivs = intervsByT.get(t) || [];
    for (const iv of ivs) {
      if (iv.type === 'publish_proof') {
        // reduce belief where trust is high (proof resonates more)
        for (const n of g.nodes) belief[n.id] *= (1 - 0.4 * n.trust);
      } else if (iv.type === 'influencer_rebuttal') {
        for (const nei of neighbors(g, '0')) { // node 0 = influencer hub in star
          belief[nei] *= 0.5;
        }
      } else if (iv.type === 'prebunk') {
        for (const n of g.nodes) belief[n.id] *= (1 - 0.2); // pre-trained skepticism
      }
    }

    // propagate
    const next = { ...belief };
    for (const n of g.nodes) {
      const ns = neighbors(g, n.id);
      const inf = ns.reduce((acc, m) => acc + belief[m], 0) / Math.max(1, ns.length);
      const adoptProb = n.susceptibility * inf * (1 - n.trust);
      next[n.id] = Math.min(1, Math.max(belief[n.id], adoptProb));
    }
    Object.assign(belief, next);

    const avg = g.nodes.reduce((a,n)=>a+belief[n.id],0)/g.nodes.length;
    curve.push(avg);
  }
  const peak = Math.max(...curve);
  const auc = curve.reduce((a,x)=>a+x,0);
  return { beliefCurve: curve, peak, auc };
}