const fs = require('fs');
// Expect newline-delimited log lines or CSV at logs/cdn.csv: ts, path, bytes
const lines = (
  fs.existsSync('logs/cdn.csv')
    ? fs.readFileSync('logs/cdn.csv', 'utf8').trim().split(/\n/)
    : []
).slice(1);
let bytes = 0,
  reqs = 0;
for (const l of lines) {
  const parts = l.split(',');
  bytes += Number(parts[2] || 0);
  reqs++;
}
fs.mkdirSync('docs/ops/finops', { recursive: true });
fs.writeFileSync(
  'docs/ops/finops/usage.json',
  JSON.stringify(
    { bytes, reqs, period: new Date().toISOString().slice(0, 10) },
    null,
    2,
  ),
);
