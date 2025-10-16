import fs from 'fs';
import path from 'path';
const MIG_DIR = 'server/src/migrations';
const bad = [
  /ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+\w+\s+(?!NULL)/i, // adding NOT NULL w/out default
  /\bDROP\s+TABLE\b/i,
  /\bALTER\s+TABLE\s+\w+\s+RENAME\s+COLUMN\b/i,
];
const requireSafe = [
  /ADD\s+COLUMN.*DEFAULT/i,
  /CREATE\s+INDEX\s+CONCURRENTLY/i,
];

let errors: string[] = [],
  warns: string[] = [];
for (const f of fs
  .readdirSync(MIG_DIR)
  .filter((x) => x.endsWith('.sql') || x.endsWith('.ts'))) {
  const s = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
  for (const r of bad) if (r.test(s)) errors.push(`${f}: violates rule ${r}`);
  // heuristics: if adding non-null column, must include DEFAULT + backfill window comments
  if (/ADD\s+COLUMN/i.test(s) && !requireSafe.some((r) => r.test(s)))
    warns.push(`${f}: column add must include DEFAULT or backfill plan`);
  // require “-- ONLINE:” marker to document approach
  if (!/--\s*ONLINE:/i.test(s))
    warns.push(`${f}: missing '-- ONLINE:' rationale`);
  // require down/rollback section
  if (!/--\s*DOWN:/.test(s))
    warns.push(`${f}: missing rollback plan ('-- DOWN:' section)`);
}
if (errors.length) {
  console.error('❌ migration errors:\n' + errors.join('\n'));
  process.exit(1);
}
if (warns.length) {
  console.warn('⚠️ migration warnings:\n' + warns.join('\n'));
}
console.log('✅ migrations look safe-ish');
