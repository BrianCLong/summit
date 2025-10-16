const fs = require('fs');
// Expect NDJSON events in docs/ops/tta/log.ndjson too; merge for demo
const out = { p50: { LCP: null, INP: null, CLS: null } };
fs.mkdirSync('docs/ops/telemetry', { recursive: true });
fs.writeFileSync('docs/ops/telemetry/cwv.json', JSON.stringify(out));
