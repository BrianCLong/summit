type Pool = {
  id: string;
  provider: 'gha' | 'k8s' | 'aws' | 'gcp';
  caps: string[];
  region: string;
  costPerMin: number;
  free: int;
};
export function pickPool(taskCaps: string[], pools: Pool[]) {
  return pools
    .filter((p) => taskCaps.every((c) => p.caps.includes(c)))
    .sort((a, b) => a.costPerMin - b.costPerMin || b.free - a.free)[0];
}
