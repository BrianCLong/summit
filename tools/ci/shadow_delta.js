const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
async function probe(url) {
  const t = Date.now();
  const r = await fetch(url);
  return { s: r.status, t: Date.now() - t };
}
(async () => {
  const routes = [
    '/health',
    '/api/ops/capacity?tenant=acme&from=2025-09-01&to=2025-09-07',
    '/api/sites/stream',
  ];
  let errors = 0,
    d95 = [];
  for (const p of routes) {
    const A = await probe(process.env.STAGING_BASE + p);
    const B = await probe(process.env.PREVIEW_BASE + p);
    if (B.s >= 500 || (A.s < 500 && B.s >= 400)) errors++;
    d95.push(B.t / A.t);
  }
  const errDelta = errors / routes.length;
  const p95Delta =
    d95.sort((x, y) => x - y)[Math.floor(d95.length * 0.95) - 1] || 1;
  if (errDelta > 0.25 || p95Delta > 1.1) {
    console.error(`Shadow delta too high: err=${errDelta}, p95x=${p95Delta}`);
    process.exit(1);
  }
  console.log(`shadow ok: err=${errDelta}, p95x=${p95Delta}`);
})();
