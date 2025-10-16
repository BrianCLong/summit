type Job = { id: string; vram: number; ms: number; prio: number };
export function pack(jobs: Job[], cap: number) {
  const q = jobs.slice().sort((a, b) => b.vram - a.vram);
  const bins: number[] = [];
  const alloc: Record<string, number> = {};
  for (const j of q) {
    let i = bins.findIndex((x) => x + j.vram <= cap);
    if (i < 0) {
      i = bins.push(0) - 1;
    }
    bins[i] += j.vram;
    alloc[j.id] = i;
  }
  return alloc;
}
