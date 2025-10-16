import autocannon from 'autocannon';
import { writeFileSync } from 'fs';
async function run() {
  const r = await autocannon({
    url: process.env.URL || 'http://localhost:4000/health',
    duration: 10,
  });
  writeFileSync(
    'perf.json',
    JSON.stringify({ p95: r.latency.p95, rps: r.requests.average }),
  );
}
run();
