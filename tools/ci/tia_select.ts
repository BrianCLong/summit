import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const base = process.env.GITHUB_BASE_REF || 'origin/main';
const changed = execSync(`git diff --name-only ${base}...HEAD`)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

function findTestsTouching(files: string[]) {
  // heuristic: co-located tests + same feature dirs + simple import graph
  const tests = new Set<string>();
  for (const f of files) {
    const dir = path.dirname(f);
    for (const ext of ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx']) {
      const guess = path.join(dir, path.basename(f).replace(/\.tsx?$/, ext));
      if (fs.existsSync(guess)) tests.add(guess);
    }
  }
  // fallback: run tests under any top-level feature touched
  for (const f of files) {
    const top = f.split(path.sep)[0];
    for (const ext of ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx']) {
      for (const g of glob(`{server,services,client,apps}/**/*${ext}`))
        if (g.startsWith(top)) tests.add(g);
    }
  }
  return [...tests];
}

// tiny glob without deps
function glob(pattern: string) {
  try {
    return execSync(`ls -1 ${pattern}`, { shell: 'bash' })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

const out = findTestsTouching(changed);
fs.writeFileSync('tia-tests.txt', out.join('\n'));
console.log(`::notice ::TIA selected ${out.length} tests`);
