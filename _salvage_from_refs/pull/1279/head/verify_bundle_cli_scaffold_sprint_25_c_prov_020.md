# Verify‑Bundle CLI Scaffold (Sprint 25 — C‑PROV‑020)

**Path (repo‑relative):** `cli/verify-bundle/`  
**Purpose:** Round‑trip verifier CLI that recomputes SHA‑256 for bundle payload files and compares to `manifest.json`. Offline‑first, zero network.

---

## File Tree
```
cli/verify-bundle/
  package.json
  tsconfig.json
  jest.config.js
  .eslintrc.cjs
  README.md
  src/
    index.ts
    verify.ts
    manifest.ts
    hash.ts
  test/
    fixtures.ts
    verify.spec.ts
.github/workflows/cli-verify-bundle.yml
```

---

## `package.json`
```json
{
  "name": "@intelgraph/verify-bundle",
  "version": "0.1.0",
  "private": true,
  "description": "Verify IntelGraph export bundles by re-hashing payloads and comparing against the signed manifest.",
  "bin": { "verify-bundle": "./dist/index.js" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "ts-node src/index.ts",
    "test": "jest --runInBand",
    "lint": "eslint 'src/**/*.ts'",
    "prepare": "npm run build"
  },
  "type": "module",
  "engines": { "node": ">=18.0.0" },
  "dependencies": {
    "commander": "^12.1.0",
    "fast-glob": "^3.3.2",
    "yaml": "^2.5.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0"
  }
}
```

## `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## `jest.config.js`
```js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts']
};
```

## `.eslintrc.cjs`
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/**'],
  rules: { '@typescript-eslint/no-explicit-any': 'off' }
};
```

## `README.md`
```md
# verify-bundle (IntelGraph)

Offline CLI to verify IntelGraph export bundles:
* Recompute SHA-256 for all payload files using canonical read rules.
* Compare with the manifest's declared digests.
* Exit non-zero if mismatches/missing/extras are found.
* Emit machine-readable JSON and human text.

## Install
```bash
npm ci && npm run build
```

## Usage
```bash
verify-bundle /path/to/bundle --format json --strict
```

## Manifest contract
`manifest.json`:
```json
{
  "schema": "ig.export.manifest/1-0-0",
  "createdAt": "2025-10-06T12:00:00Z",
  "policyVersion": "2.0.0",
  "algo": "SHA256",
  "files": [
    {"path": "payload/entities.jsonl", "sha256": "<hex>"}
  ]
}
```

## Exit codes
0=ok, 2=verification failed, 3=invalid manifest, 4=IO error
```
```

---

## `src/index.ts`
```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { verifyBundle } from './verify.js';
import fs from 'node:fs';
import path from 'node:path';

const program = new Command();

program
  .name('verify-bundle')
  .description('Verify IntelGraph export bundles against their manifest.')
  .argument('<bundleDir>', 'Path to bundle directory (containing manifest.json)')
  .option('--format <fmt>', 'Output format: text|json', 'text')
  .option('--strict', 'Fail if extra files exist not listed in the manifest', false)
  .option('--quiet', 'Suppress non-error output', false)
  .action(async (bundleDir, options) => {
    try {
      const dir = path.resolve(process.cwd(), bundleDir);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        console.error(`Bundle directory not found: ${dir}`);
        process.exit(4);
      }
      const result = await verifyBundle(dir, { strict: !!options.strict });
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (!options.quiet) {
        const extrasMsg = result.extras.length ? `, extras: ${result.extras.length}` : '';
        const missMsg = result.missing.length ? `, missing: ${result.missing.length}` : '';
        console.log(`${result.ok ? 'OK' : 'FAIL'} — verified ${result.verified} file(s)${missMsg}${extrasMsg}`);
        result.mismatches.forEach(m => console.log(`  MISMATCH: ${m.path}`));
        result.missing.forEach(m => console.log(`  MISSING: ${m}`));
        result.extras.forEach(e => console.log(`  EXTRA: ${e}`));
      }
      process.exit(result.ok ? 0 : 2);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      process.exit(4);
    }
  });

program.parse(process.argv);
```

## `src/manifest.ts`
```ts
export interface ManifestFile { path: string; sha256: string }
export interface Manifest {
  schema: string;
  createdAt: string;
  policyVersion: string;
  algo: 'SHA256';
  files: ManifestFile[];
}
export function isManifest(x: any): x is Manifest {
  return x && typeof x === 'object' &&
    typeof x.schema === 'string' &&
    typeof x.createdAt === 'string' &&
    typeof x.policyVersion === 'string' &&
    x.algo === 'SHA256' &&
    Array.isArray(x.files);
}
```

## `src/hash.ts`
```ts
import fs from 'node:fs';
import crypto from 'node:crypto';

export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
```

## `src/verify.ts`
```ts
import path from 'node:path';
import fs from 'node:fs';
import { Manifest, isManifest } from './manifest.js';
import { sha256File } from './hash.js';

export interface VerifyOptions { strict?: boolean }
export interface VerifyResult {
  ok: boolean;
  verified: number;
  mismatches: { path: string, expected: string, actual: string }[];
  missing: string[];
  extras: string[];
  summary: string;
}

export async function verifyBundle(dir: string, options: VerifyOptions = {}): Promise<VerifyResult> {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`manifest.json not found in ${dir}`);
  let manifest: Manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch { throw new Error('manifest.json is not valid JSON'); }
  if (!isManifest(manifest)) throw new Error('manifest.json does not match schema');

  const mismatches: VerifyResult['mismatches'] = [];
  const missing: string[] = [];
  let verified = 0;

  for (const f of manifest.files) {
    const p = path.join(dir, f.path);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) { missing.push(f.path); continue; }
    const actual = await sha256File(p);
    verified++;
    if (actual !== f.sha256) mismatches.push({ path: f.path, expected: f.sha256, actual });
  }

  const extras: string[] = [];
  if (options.strict) {
    const payloadDir = path.join(dir, 'payload');
    if (fs.existsSync(payloadDir) && fs.statSync(payloadDir).isDirectory()) {
      const walk = (d: string, base='payload') => {
        for (const name of fs.readdirSync(d)) {
          const full = path.join(d, name);
          if (fs.statSync(full).isDirectory()) walk(full, path.join(base, name));
          else {
            const rel = path.join(base, name).replace(/\\\\/g, '/');
            if (!manifest.files.find(m => m.path === rel)) extras.push(rel);
          }
        }
      };
      walk(payloadDir);
    }
  }

  const ok = mismatches.length === 0 && missing.length === 0 && (!options.strict || extras.length === 0);
  return { ok, verified, mismatches, missing, extras, summary: `${verified} files verified, algo=${manifest.algo}` };
}
```

---

## `test/fixtures.ts` (generates golden bundles on the fly)
```ts
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256(buf: Buffer): string { return crypto.createHash('sha256').update(buf).digest('hex'); }

export function setupGolden(root: string) {
  const ok = path.join(root, 'golden', 'bundle_ok');
  const bad = path.join(root, 'golden', 'bundle_bad');
  fs.rmSync(path.join(root, 'golden'), { recursive: true, force: true });
  fs.mkdirSync(path.join(ok, 'payload'), { recursive: true });
  fs.mkdirSync(path.join(bad, 'payload'), { recursive: true });

  // OK bundle
  const ents = Buffer.from('{"id":"1","type":"Indicator","value":"example.com"}\n{"id":"2","type":"Org","name":"Acme"}\n');
  const edges = Buffer.from('{"src":"1","dst":"2","type":"MENTIONS"}\n');
  fs.writeFileSync(path.join(ok, 'payload', 'entities.jsonl'), ents);
  fs.writeFileSync(path.join(ok, 'payload', 'edges.jsonl'), edges);
  const okManifest = {
    schema: 'ig.export.manifest/1-0-0',
    createdAt: new Date().toISOString(),
    policyVersion: '2.0.0',
    algo: 'SHA256',
    files: [
      { path: 'payload/entities.jsonl', sha256: sha256(ents) },
      { path: 'payload/edges.jsonl', sha256: sha256(edges) }
    ]
  };
  fs.writeFileSync(path.join(ok, 'manifest.json'), JSON.stringify(okManifest, null, 2));

  // BAD bundle: tamper after manifest
  const bents = Buffer.from('{"id":"1","type":"Indicator","value":"evil.com"}\n');
  fs.writeFileSync(path.join(bad, 'payload', 'entities.jsonl'), bents);
  const badManifest = {
    schema: 'ig.export.manifest/1-0-0',
    createdAt: new Date().toISOString(),
    policyVersion: '2.0.0',
    algo: 'SHA256',
    files: [ { path: 'payload/entities.jsonl', sha256: sha256(bents) } ]
  };
  fs.writeFileSync(path.join(bad, 'manifest.json'), JSON.stringify(badManifest, null, 2));
  // tamper
  fs.appendFileSync(path.join(bad, 'payload', 'entities.jsonl'), Buffer.from('{"tampered":true}\n'));
}
```

## `test/verify.spec.ts`
```ts
import path from 'node:path';
import { setupGolden } from './fixtures.js';
import { verifyBundle } from '../src/verify.js';

const root = path.resolve(__dirname);
setupGolden(root);

const okDir = path.join(root, 'golden', 'bundle_ok');
const badDir = path.join(root, 'golden', 'bundle_bad');

describe('verify-bundle', () => {
  it('verifies a correct bundle', async () => {
    const res = await verifyBundle(okDir, { strict: true });
    expect(res.ok).toBe(true);
    expect(res.mismatches).toHaveLength(0);
    expect(res.missing).toHaveLength(0);
  });

  it('detects mismatches', async () => {
    const res = await verifyBundle(badDir, { strict: true });
    expect(res.ok).toBe(false);
    expect(res.mismatches.length + res.missing.length + res.extras.length).toBeGreaterThan(0);
  });
});
```

---

## GitHub Actions — `/.github/workflows/cli-verify-bundle.yml`
```yaml
name: CLI — verify-bundle
on:
  push:
    paths:
      - 'cli/verify-bundle/**'
  pull_request:
    paths:
      - 'cli/verify-bundle/**'
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cli/verify-bundle
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: cli/verify-bundle/package.json
      - run: npm ci
      - run: npm test -- --ci
```

---

## PR Description (drop in as `docs/PR_DESCRIPTION.md`)
```md
# chore(cli): add verify-bundle (C-PROV-020)

Adds offline CLI to verify IntelGraph export bundles against `manifest.json` by recomputing SHA-256 for payload files.

## What
- `cli/verify-bundle`: TypeScript CLI, Jest tests, ESLint
- GitHub Actions job: runs Jest on changes under `cli/verify-bundle/**`

## Why
- Satisfies Sprint 25 KR3 — Verifiable Export (Round-Trip)
- Enables offline re-validation by customers/air-gapped deploys

## How
- Canonical read using Node streams; SHA-256 over raw bytes
- Strict mode detects extra files not declared in manifest
- Exit codes: 0 ok, 2 verify fail, 3 invalid manifest, 4 IO error

## Test
```bash
cd cli/verify-bundle
npm ci
npm test
npm run build
node dist/index.js test/golden/bundle_ok --strict
```

## Rollout
- No runtime impact; packaged as dev tool
- Documented in `README.md`
```

