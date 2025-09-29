import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'server/dist';
const MISSING = [];

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && p.endsWith('.js')) yield p;
  }
}

for await (const file of walk(ROOT)) {
  const src = await fs.readFile(file, 'utf8');
  for (const m of src.matchAll(/from\s+['"](\.{1,2}\/[^'\"]+)['"]/g)) {
    const spec = m[1];
    if (!/\.(mjs|cjs|js|json|node)$/.test(spec)) {
      MISSING.push(`${file} -> ${spec}`);
    }
  }
}

if (MISSING.length) {
  console.error('Missing extensions in built JS:\n' + MISSING.join('\n'));
  process.exit(1);
} else {
  console.log('All ESM import specifiers have explicit extensions.');
}

