import fetch from 'node-fetch';
const PROM = process.env.PROM_URL!;
const DEFAULT_BURN_RATE = Number(process.env.BURN_RATE_THRESHOLD ?? '2');
const SLO: Record<
  string,
  { p95: number; err: number; burnRate?: number; description?: string }
> = {
  '/search': { p95: 1.2, err: 0.02, description: 'Search results' },
  '/login': { p95: 0.5, err: 0.01, description: 'User authentication' },
  '/export': { p95: 2.0, err: 0.03, description: 'CSV/Excel export' },
};
async function q(expr: string) {
  const r = await fetch(
    `${PROM}/api/v1/query?query=${encodeURIComponent(expr)}`,
  );
  const json: any = await r.json();
  return Number(json.data.result?.[0]?.value?.[1] || '0');
}
(async () => {
  let bad: string[] = [];
  for (const [path, b] of Object.entries(SLO)) {
    const p95 = await q(`route:latency:p95{path="${path}"}`);
    const er = await q(`route:error_rate:ratio5m{path="${path}"}`);
    const burnLimit = b.burnRate ?? DEFAULT_BURN_RATE;
    const burnRate = b.err > 0 ? er / b.err : 0;
    const breachedLatency = p95 > b.p95;
    const breachedErrors = er > b.err;
    const breachedBurn = burnRate > burnLimit;
    const label = b.description ? `${path} (${b.description})` : path;
    const summary = `${label} p95=${p95.toFixed(
      2,
    )}s err=${(er * 100).toFixed(2)}% burn=${burnRate.toFixed(
      2,
    )}x (limit ${burnLimit.toFixed(2)}x)`;
    if (breachedLatency || breachedErrors || breachedBurn) {
      const reasons = [
        breachedLatency ? 'latency' : '',
        breachedErrors ? 'error-rate' : '',
        breachedBurn ? 'burn-rate' : '',
      ]
        .filter(Boolean)
        .join(', ');
      bad.push(`${summary} [${reasons}]`);
    } else {
      console.log(`✅ ${summary}`);
    }
  }
  if (bad.length) {
    console.error('❌ Route budgets breached:\n' + bad.join('\n'));
    process.exit(1);
  }
  console.log('✅ All route budgets healthy');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
