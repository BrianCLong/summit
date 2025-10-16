type Pool = {
  id: string;
  cost: { cpuSec: number; gpuSec?: number };
  tags: string[];
  gpu?: { class?: string; vramGi?: number; available?: number };
  queue?: number;
  region?: string;
};
type Req = {
  tenant: string;
  slaMs: number;
  critical?: boolean;
  resources: {
    cpu?: number;
    memGi?: number;
    gpus?: number;
    gpuClass?: string;
    vramGi?: number;
  };
  region?: string;
};

export function scorePool(
  pool: Pool,
  req: Req,
  ctx: { predictLagMs: (poolId: string) => number },
) {
  const price = req.resources.gpus
    ? pool.cost.gpuSec || Infinity
    : pool.cost.cpuSec;
  const fitGpu = req.resources.gpus ? (satisfiesGpu(pool, req) ? 0 : 1) : 0;
  const residency =
    req.region && pool.region && req.region !== pool.region ? 1 : 0;
  const qlag = Math.min(ctx.predictLagMs(pool.id) / req.slaMs, 5); // >1 risks SLA
  const queuePen = Math.min((pool.queue || 0) / 100, 2);
  // Weighted sum (lower is better)
  return (
    0.55 * normalizePrice(price) +
    0.2 * qlag +
    0.15 * queuePen +
    0.07 * residency +
    0.03 * fitGpu
  );
}
function normalizePrice(p: number) {
  return Math.log10(Math.max(1e-9, p)) + 9;
}
function satisfiesGpu(pool: Pool, req: Req) {
  if (!pool.gpu || !req.resources.gpus) return false;
  const clsOk =
    !req.resources.gpuClass ||
    geGpuClass(pool.gpu.class || '', req.resources.gpuClass);
  const vramOk =
    !req.resources.vramGi || (pool.gpu.vramGi || 0) >= req.resources.vramGi;
  const capOk = (pool.gpu.available || 0) >= (req.resources.gpus || 0);
  return clsOk && vramOk && capOk;
}
function geGpuClass(have: string, want: string) {
  // "A10+" etc. naive class order
  const order = ['T4', 'L4', 'A10', 'A100', 'H100'];
  const w = want.replace('+', '');
  const i = order.indexOf((have || '').toUpperCase()),
    j = order.indexOf(w.toUpperCase());
  return i >= j && i >= 0;
}
