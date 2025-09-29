import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'server/dist';
const REL = /(from\s+['"])(\.{1,2}\/[^'".][^'"]*)(['"])/g; // ./ or ../ without ext

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && p.endsWith('.js')) yield p;
  }
}

let changed = 0;
for await (const file of walk(ROOT)) {
  const src = await fs.readFile(file, 'utf8');
  const out = src.replace(REL, (m, a, spec, z) => `${a}${spec}.js${z}`);
  if (out !== src) {
    await fs.writeFile(file, out);
    changed++;
  }
}
console.log(`[fix-esm-extensions] Patched ${changed} files in ${ROOT}`);

