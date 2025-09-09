import fetch from 'node-fetch';

const PROM = process.env.PROM_URL!; // e.g. https://prometheus.dev.svc
const Q = 'sum(rate(http_requests_total{code=~"5.."}[5m]))/sum(rate(http_requests_total[5m]))';
const THRESH = parseFloat(process.env.ERROR_BUDGET_THRESH || '0.02');

async function main(){
  const r = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(Q)}`);
  const j = await r.json();
  const v = parseFloat(j.data.result?.[0]?.value?.[1] || '0');
  if (isNaN(v)) throw new Error('No metric value');
  if (v > THRESH) {
    console.error(`❌ Error budget burn ${v} > ${THRESH}`);
    process.exit(1);
  }
  console.log(`✅ Error budget burn ${v} <= ${THRESH}`);
}
main().catch(e => { console.error(e); process.exit(1); });