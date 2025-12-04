import fetch from 'node-fetch';
const PROM = process.env.PROM_URL!;
const SLO = {
  '/search': { p95: 1.2, err: 0.02 },
  '/login': { p95: 0.5, err: 0.01 },
  '/export': { p95: 2.0, err: 0.03 },
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
    if (p95 > b.p95 || er > b.err)
      bad.push(`${path} p95=${p95.toFixed(2)}s err=${(er * 100).toFixed(2)}%`);
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
