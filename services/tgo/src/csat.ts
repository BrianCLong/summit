export type CTask = {
  id: string;
  secs: number;
  caps: string[];
  lane: 'gold' | 'silver' | 'bronze';
};
export type CPool = {
  id: string;
  caps: string[];
  max: int;
  costPerMin: number;
  laneShare: { gold: number; silver: number; bronze: number };
};

export function schedule(tasks: CTask[], pools: CPool[]) {
  // Respect lane reserves, capacity and caps
  const bins: Record<string, { load: number; items: CTask[] }> =
    Object.fromEntries(pools.map((p) => [p.id, { load: 0, items: [] }]));
  const fits = (t: CTask, p: CPool) => t.caps.every((c) => p.caps.includes(c));
  const laneSlots = Object.fromEntries(
    pools.map((p) => [
      p.id,
      {
        gold: Math.max(1, Math.floor(p.max * p.laneShare.gold)),
        silver: Math.max(1, Math.floor(p.max * p.laneShare.silver)),
        bronze: Math.max(1, Math.floor(p.max * p.laneShare.bronze)),
      },
    ]),
  );
  const laneUse: Record<
    string,
    { gold: number; silver: number; bronze: number }
  > = Object.fromEntries(
    pools.map((p) => [p.id, { gold: 0, silver: 0, bronze: 0 }]),
  );

  for (const t of tasks.sort((a, b) => b.secs - a.secs)) {
    const feas = pools
      .filter((p) => fits(t, p))
      .sort(
        (a, b) =>
          a.costPerMin - b.costPerMin || bins[a.id].load - bins[b.id].load,
      );
    let placed = false;
    for (const p of feas) {
      const lu = laneUse[p.id] as any,
        ls = laneSlots[p.id] as any;
      if (lu[t.lane] < ls[t.lane]) {
        bins[p.id].items.push(t);
        bins[p.id].load += t.secs;
        lu[t.lane]++;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const p = feas[0];
      bins[p.id].items.push(t);
      bins[p.id].load += t.secs;
    }
  }
  // Local improvement: swap worst/least loaded
  const ps = pools.map((p) => p.id);
  for (let k = 0; k < 32; k++) {
    const hi = ps.reduce((a, b) => (bins[a].load > bins[b].load ? a : b));
    const lo = ps.reduce((a, b) => (bins[a].load < bins[b].load ? a : b));
    const a = bins[hi].items.find((x) => true);
    const b = bins[lo].items.find((x) => true);
    if (
      a &&
      b &&
      Math.abs(
        bins[hi].load - a.secs + b.secs - (bins[lo].load - b.secs + a.secs),
      ) < Math.abs(bins[hi].load - bins[lo].load)
    ) {
      bins[hi].items.splice(bins[hi].items.indexOf(a), 1);
      bins[lo].items.push(a);
      bins[lo].items.splice(bins[lo].items.indexOf(b), 1);
      bins[hi].items.push(b);
      bins[hi].load += b.secs - a.secs;
      bins[lo].load += a.secs - b.secs;
    }
  }
  return bins;
}
