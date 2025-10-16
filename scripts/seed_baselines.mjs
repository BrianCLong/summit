#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const src = path.join(ROOT, 'server/src/generated/introspection.json');
const outDir = path.join(ROOT, 'docs/generated/compat');
const targets = [
  path.join(outDir, 'baseline.N-1.json'),
  path.join(outDir, 'baseline.N-2.json'),
];

if (!fs.existsSync(src)) {
  console.error(
    '[seed-baselines] Missing server/src/generated/introspection.json. Run: cd server && npm run codegen',
  );
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const buf = fs.readFileSync(src);
for (const t of targets) {
  fs.writeFileSync(t, buf);
}
console.log(
  '[seed-baselines] Seeded baselines N-1 and N-2 from current introspection.',
);
