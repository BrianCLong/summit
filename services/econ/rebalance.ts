type Bin = { id: string; budget: number; roi: number };
export function rebalance(bins: Bin[], total: number) {
  const w = bins.map((b) => Math.max(0, b.roi));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return bins.map((b, i) => ({ id: b.id, alloc: total * (w[i] / sum) }));
}
