#!/usr/bin/env node
// Golden Prompts validity gate (scaffold)
// Counts Cypher files and checks naive syntax (ends with ';' and contains MATCH/RETURN)
const fs = require('fs');
const path = require('path');

const dir = process.env.PROMPTS_DIR || 'samples/golden-prompts/cypher';
const threshold = parseFloat(process.env.THRESHOLD || '0.95');
const minCount = parseInt(process.env.MIN_COUNT || '50', 10);

if (!fs.existsSync(dir)) {
  console.error(`[golden] prompts dir missing: ${dir}`);
  process.exit(2);
}
const files = fs.readdirSync(dir).filter(f => f.endsWith('.cql'));
if (files.length < minCount) {
  console.error(`[golden] insufficient prompts: have=${files.length} need>=${minCount}`);
  process.exit(3);
}

let valid = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8').trim();
  const ok = /MATCH\b/i.test(s) && /RETURN\b/i.test(s) && s.endsWith(';');
  if (ok) valid++;
}
const ratio = valid / files.length;
console.log(`[golden] valid=${valid} total=${files.length} ratio=${ratio.toFixed(3)} (threshold=${threshold})`);
if (ratio < threshold) {
  console.error('[golden] FAIL: validity ratio below threshold');
  process.exit(1);
}
console.log('[golden] PASS');
