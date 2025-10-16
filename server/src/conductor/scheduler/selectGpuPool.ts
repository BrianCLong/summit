export function pickGpuPool(req: {
  gpus: number;
  gpuClass?: string;
  vram?: string;
}) {
  const need = req.gpus || 0;
  if (!need) return null;
  const pools = listEligible();
  const filtered = pools.filter((p) => satisfies(p, req));
  return (
    filtered.sort(
      (a, b) => (a.costHint?.gpuSec || 0) - (b.costHint?.gpuSec || 0),
    )[0] || null
  );
}

function listEligible() {
  // TODO: load dynamic pools; placeholder
  return [
    {
      name: 'gpu-a10',
      tags: ['gpu'],
      gpu: { class: 'A10', vramGi: 24, available: 8 },
      costHint: { gpuSec: 1.0 },
    },
    {
      name: 'gpu-l4',
      tags: ['gpu'],
      gpu: { class: 'L4', vramGi: 24, available: 4 },
      costHint: { gpuSec: 0.8 },
    },
  ];
}
function satisfies(pool: any, req: any) {
  const cls = pool.gpu?.class || '';
  const vram = pool.gpu?.vramGi || 0;
  const classOk = !req.gpuClass || compareGpuClass(cls, req.gpuClass);
  const vramOk = !req.vram || vram >= parseInt(String(req.vram));
  const capOk = (pool.gpu?.available || 0) >= req.gpus;
  return classOk && vramOk && capOk;
}
function compareGpuClass(have: string, want: string) {
  if (want.endsWith('+')) return have >= want.replace('+', '');
  return have === want;
}
