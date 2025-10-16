#!/usr/bin/env node
/**
 * Monorepo healer for pnpm+TypeScript workspaces.
 * - Ensures every workspace has a build script (TS -> "tsc -b", JS -> no-op)
 * - Makes internal deps use "workspace:*"
 * - Ensures "type":"module" and coherent "main"/"types"/"exports"
 * - Writes local tsconfig.json for TS packages (extends root tsconfig)
 * - Syncs TS project references (root + per-package) from internal dep graph
 */
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const GROUPS = ['apps', 'packages', 'services', 'contracts'];
const ROOT_TSCONFIG = path.join(ROOT, 'tsconfig.json');

const exists = async (p) => !!(await fs.stat(p).catch(() => 0));
const readJSON = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJSON = (p, obj) =>
  fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n');

async function listPkgs() {
  const all = [];
  for (const g of GROUPS) {
    const base = path.join(ROOT, g);
    if (!(await exists(base))) continue;
    for (const name of await fs.readdir(base)) {
      const dir = path.join(base, name);
      const pj = path.join(dir, 'package.json');
      if (!(await exists(pj))) continue;
      all.push({ group: g, name, dir, pj });
    }
  }
  return all;
}

async function hasTs(dir) {
  const src = path.join(dir, 'src');
  if (!(await exists(src))) return false;
  const files = await fs.readdir(src);
  return files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
}

function mergeDeps(pj) {
  return Object.assign(
    {},
    pj.dependencies,
    pj.devDependencies,
    pj.peerDependencies,
  );
}

async function main() {
  const pkgs = await listPkgs();
  if (pkgs.length === 0) {
    console.error('No workspaces found.');
    process.exit(2);
  }

  // build a name->dir map
  const nameToDir = new Map();
  for (const p of pkgs) {
    const pj = await readJSON(p.pj);
    if (!pj.name) {
      pj.name = `@${p.group}/${p.name}`;
      await writeJSON(p.pj, pj);
    }
    nameToDir.set(pj.name, p.dir);
    p.meta = pj;
  }

  // 1) normalize each package.json + local tsconfig if TS
  for (const p of pkgs) {
    const pj = p.meta;
    pj.type ??= 'module';
    pj.scripts ??= {};
    const ts = await hasTs(p.dir);

    // build script
    if (!pj.scripts.build) pj.scripts.build = ts ? 'tsc -b' : 'echo skip';

    // internal deps => workspace:*
    const depSets = ['dependencies', 'devDependencies', 'peerDependencies'];
    for (const dkey of depSets) {
      if (!pj[dkey]) continue;
      for (const [dep, ver] of Object.entries(pj[dkey])) {
        if (nameToDir.has(dep) && ver !== 'workspace:*')
          pj[dkey][dep] = 'workspace:*';
      }
    }

    // exports/main/types for TS
    if (ts) {
      pj.main ??= 'dist/index.js';
      pj.types ??= 'dist/index.d.ts';
      if (!pj.exports) {
        pj.exports = {
          '.': {
            types: './dist/index.d.ts',
            import: './dist/index.js',
          },
        };
      } else if (typeof pj.exports === 'object') {
        const root = pj.exports['.'] ?? {};
        root.types ??= './dist/index.d.ts';
        root.import ??= './dist/index.js';
        pj.exports['.'] = root;
      }
      // ensure local tsconfig.json
      const tscPath = path.join(p.dir, 'tsconfig.json');
      const rel = path.relative(p.dir, ROOT_TSCONFIG) || './tsconfig.json';
      const tsc = {
        extends: rel,
        compilerOptions: {
          composite: true,
          outDir: './dist',
          rootDir: './src',
        },
        include: ['src'],
        references: [],
      };
      await writeJSON(tscPath, tsc);
    }

    await writeJSON(p.pj, pj);
  }

  // 2) sync TS references based on internal deps graph
  const rootTs = (await exists(ROOT_TSCONFIG))
    ? await readJSON(ROOT_TSCONFIG)
    : {
        files: [],
        references: [],
        compilerOptions: {
          composite: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          lib: ['ES2022', 'DOM'],
          strict: true,
          skipLibCheck: true,
          outDir: './dist',
          rootDir: '.',
          types: ['node', 'vitest'],
        },
      };

  const references = new Set();
  const pkgByName = new Map(pkgs.map((p) => [p.meta.name, p]));

  for (const p of pkgs) {
    const tsHere = await hasTs(p.dir);
    const tscPath = path.join(p.dir, 'tsconfig.json');
    if (!tsHere || !(await exists(tscPath))) continue;

    const pj = p.meta;
    const deps = Object.keys(mergeDeps(pj) || {});
    const internalDeps = deps.filter((d) => pkgByName.has(d));

    const relRefs = [];
    for (const d of internalDeps) {
      const depDir = pkgByName.get(d).dir;
      const rel = './' + path.relative(p.dir, depDir).replace(/\\/g, '/');
      relRefs.push({ path: rel });
    }

    const localTs = await readJSON(tscPath);
    localTs.references = relRefs;
    await writeJSON(tscPath, localTs);

    // root references: include group wildcards for presence
    references.add(`./${p.group}/*`);
  }

  rootTs.references = Array.from(
    new Set([
      ...(rootTs.references || []).map((r) => r.path || r),
      ...references,
    ]),
  ).map((p) => ({ path: p }));
  await writeJSON(ROOT_TSCONFIG, rootTs);

  console.log(
    '✓ Monorepo healed: scripts, exports, workspace deps, tsconfigs, and references synced.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
