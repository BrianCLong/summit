const fs = require('fs');
const out = { ts: new Date().toISOString(), warnings: 0, errors: 0 };
// Hook your build output parsing here; this is a stub
fs.mkdirSync('docs/ops/telemetry', { recursive: true });
fs.writeFileSync('docs/ops/telemetry/build.json', JSON.stringify(out, null, 2));
