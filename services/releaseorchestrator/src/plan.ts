import { buildGraph } from './graph';
import { topoOrder } from './solve';
export function planRelease(changed: string[]) {
  const g = buildGraph();
  const order = topoOrder(g);
  const affected = new Set<string>(changed);
  // bubble dependents
  let added = true;
  while (added) {
    added = false;
    for (const n of g) {
      if (n.deps.some((d) => affected.has(d)) && !affected.has(n.name)) {
        affected.add(n.name);
        added = true;
      }
    }
  }
  const queue = order.filter((x) => affected.has(x));
  return { queue, size: queue.length };
}
