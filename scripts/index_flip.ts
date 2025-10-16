import fs from 'fs';
import fetch from 'node-fetch';
async function metric(q: string) {
  const r = await fetch(
    process.env.PROM_URL + '/api/v1/query?query=' + encodeURIComponent(q),
  );
  const j = await r.json();
  return Number(j.data.result?.[0]?.value?.[1] || 0);
}
async function main() {
  const candidate = process.env.CANDIDATE!; // s3 URI
  const err = await metric('route:error_rate:ratio5m{path="/search"}');
  const p95 = await metric('route:latency:p95{path="/search"}');
  if (err > 0.03 || p95 > 1.8) throw new Error('Guardrail breached');
  const pointer = { current: candidate };
  fs.writeFileSync(
    'search/index/pointer.json',
    JSON.stringify(pointer, null, 2),
  );
  console.log('Promoted', candidate);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
