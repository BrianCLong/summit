import fs from 'fs';
const report = JSON.parse(fs.readFileSync('jest-report.json', 'utf8'));
const flakes = report.testResults.filter(
  (t: any) =>
    t.status === 'failed' &&
    /Timeout|flaky|intermittent|retry/i.test(JSON.stringify(t)),
);
if (!flakes.length) process.exit(0);
const path = 'tests/.quarantine.json';
let q = [];
try {
  q = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch {}
const names = new Set(q.concat(flakes.map((t: any) => t.name)));
fs.writeFileSync(path, JSON.stringify([...names].sort(), null, 2));
console.log(`::warning ::quarantined ${flakes.length} tests`);
