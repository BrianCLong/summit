# Repo Patch: CI build/sign for Policy Pack + COS fetch/verify client + Contract test

> Drop these files into the repo at the indicated paths. They implement:
> 1) CI packaging + signing for `contracts/policy-pack/v0`.
> 2) A minimal COS-side client to fetch, verify, and load the pack.
> 3) A basic contract test that verifies signatures and policy eval remains stable.

---

## 1) CI: Build, Digest, and Cosign the Policy Pack

**File:** `.github/workflows/policy-pack.yml`

```yaml
name: policy-pack-v0
on:
  push:
    paths:
      - 'contracts/policy-pack/v0/**'
      - '.github/workflows/policy-pack.yml'
  workflow_dispatch: {}

jobs:
  package-sign-publish:
    runs-on: ubuntu-22.04
    permissions:
      id-token: write   # for keyless signing with cosign (Fulcio)
      contents: write   # to attach artifacts / commit manifest updates (optional)
    env:
      PACK_DIR: contracts/policy-pack/v0
      OUT_DIR: dist/policy-pack/v0
      PACK_TAR: dist/policy-pack/v0/policy-pack-v0.tar
      BUNDLE_JSON: contracts/policy-pack/v0/signing/cosign.bundle.json
      MANIFEST: contracts/policy-pack/v0/manifest.json
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: 'v2.2.4'

      - name: Make dist dir
        run: |
          mkdir -p "$OUT_DIR"

      - name: Build pack tar
        run: |
          tar --sort=name \
              --owner=0 --group=0 --numeric-owner \
              -C "$PACK_DIR" \
              -cf "$PACK_TAR" \
              ./opa ./data ./README.md ./signing

      - name: Compute sha256
        id: digest
        run: |
          DIGEST=$(sha256sum "$PACK_TAR" | awk '{print $1}')
          echo "digest=$DIGEST" >> $GITHUB_OUTPUT

      - name: Update manifest.digest.value
        run: |
          jq '.manifest.digest.algorithm = "sha256" | .manifest.digest.value = "'${{ steps.digest.outputs.digest }}'"' "$MANIFEST" > tmp.manifest.json
          mv tmp.manifest.json "$MANIFEST"

      - name: Cosign sign (keyless)
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign sign-blob --yes --bundle "$BUNDLE_JSON" "$PACK_TAR"

      - name: Verify (self-check)
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign verify-blob --bundle "$BUNDLE_JSON" "$PACK_TAR"

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: policy-pack-v0
          path: |
            ${{ env.PACK_TAR }}
            ${{ env.BUNDLE_JSON }}
            ${{ env.MANIFEST }}

      - name: Commit manifest/bundle (optional)
        if: github.ref != 'refs/heads/main'
        run: |
          git config user.email "ci@intelgraph.local"
          git config user.name "intelgraph-ci"
          git add "$BUNDLE_JSON" "$MANIFEST"
          git commit -m "ci(policy-pack): update digest + cosign bundle"
          git push || true
```

**Notes**
- Uses keyless signing via OIDC (Fulcio) and writes a **bundle** for offline verification.
- Manifests are updated with the canonical `sha256` for reproducibility & audit.

---

**File:** `scripts/build_policy_pack.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PACK_DIR=${1:-contracts/policy-pack/v0}
OUT_DIR=${2:-dist/policy-pack/v0}
PACK_TAR=${3:-dist/policy-pack/v0/policy-pack-v0.tar}
mkdir -p "$OUT_DIR"
tar --sort=name \
    --owner=0 --group=0 --numeric-owner \
    -C "$PACK_DIR" \
    -cf "$PACK_TAR" \
    ./opa ./data ./README.md ./signing
sha256sum "$PACK_TAR" | awk '{print $1}'
```

**File:** `scripts/cosign_sign.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
BLOB=${1:-dist/policy-pack/v0/policy-pack-v0.tar}
BUNDLE=${2:-contracts/policy-pack/v0/signing/cosign.bundle.json}
export COSIGN_EXPERIMENTAL=1
cosign sign-blob --yes --bundle "$BUNDLE" "$BLOB"
cosign verify-blob --bundle "$BUNDLE" "$BLOB"
```

---

## 2) Server: Serve the TAR (not just JSON stub)

**Patch:** `server/src/routes/contracts.ts`

```ts
// add near existing imports
import path from 'node:path';
import fs from 'node:fs';

// inside router definition
router.get('/policy/packs/:packId', async (req, res) => {
  const { packId } = req.params; // expect 'policy-pack-v0'
  if (packId !== 'policy-pack-v0') return res.status(404).json({ error: 'unknown pack' });
  const packTar = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
  const bundleJson = path.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  if (!fs.existsSync(packTar)) return res.status(503).json({ error: 'pack not built yet' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.setHeader('Digest', `sha-256=${manifest.manifest.digest.value}`);
  res.setHeader('X-Cosign-Bundle', fs.readFileSync(bundleJson, 'utf8'));
  fs.createReadStream(packTar).pipe(res);
});
```

> The `X-Cosign-Bundle` header lets a simple client verify without a separate fetch.

---

## 3) COS-side Policy Fetch/Verify Client (TypeScript)

**File:** `clients/cos-policy-fetcher/package.json`

```json
{
  "name": "cos-policy-fetcher",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p .",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "undici": "^6.19.8",
    "tar": "^7.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "typescript": "^5.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5"
  }
}
```

**File:** `clients/cos-policy-fetcher/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

**File:** `clients/cos-policy-fetcher/src/index.ts`

```ts
import { createWriteStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { request } from 'undici';
import { extract } from 'tar';
import { spawn } from 'node:child_process';

export type FetchOptions = { url: string; cosignPath?: string };

function sh(cmd: string, args: string[], input?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => (stdout += d.toString()));
    p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (input) p.stdin.end(input);
  });
}

export async function fetchAndVerify({ url, cosignPath = 'cosign' }: FetchOptions): Promise<string> {
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-pack-'));
  const tarPath = path.join(tmpdir, 'pack.tar');
  const { body, headers, statusCode } = await request(url, { method: 'GET' });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  const digestHeader = headers['digest'];
  const bundleHeader = headers['x-cosign-bundle'];
  if (!digestHeader || !bundleHeader) throw new Error('missing verification headers');

  const file = createWriteStream(tarPath);
  await new Promise<void>((res, rej) => { body.pipe(file); body.on('error', rej); file.on('finish', () => res()); });

  // Verify SHA-256
  const { stdout: shaOut } = await sh('sha256sum', [tarPath]);
  const sha = shaOut.trim().split(' ')[0];
  const expected = String(digestHeader).replace('sha-256=', '').trim();
  if (sha !== expected) throw new Error(`digest mismatch: ${sha} != ${expected}`);

  // Verify cosign bundle (offline)
  process.env.COSIGN_EXPERIMENTAL = '1';
  const { code, stderr } = await sh(cosignPath, ['verify-blob', '--bundle', '-', tarPath], String(bundleHeader));
  if (code !== 0) throw new Error(`cosign verify failed: ${stderr}`);

  // Extract to a directory and return path
  const extractDir = path.join(tmpdir, 'unpacked');
  await fs.mkdir(extractDir, { recursive: true });
  await extract({ file: tarPath, cwd: extractDir });
  return extractDir;
}

// Example usage when run directly
if (process.env.NODE_ENV !== 'test' && process.argv[2]) {
  fetchAndVerify({ url: process.argv[2] })
    .then((dir) => console.log('verified pack at:', dir))
    .catch((e) => { console.error(e); process.exit(1); });
}
```

> This client shells out to `cosign verify-blob` with the provided bundle (no network). It also enforces SHA-256 from the manifest header.

---

## 4) Basic Contract Test (Jest) — Verify Signature + Policy Behavior

**File:** `clients/cos-policy-fetcher/jest.config.cjs`

```js
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
};
```

**File:** `tests/contract/policy_pack.contract.test.ts`

```ts
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fetchAndVerify } from '../../clients/cos-policy-fetcher/src/index';
import { spawnSync } from 'node:child_process';

const PACK_TAR = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
const BUNDLE_JSON = path.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
const MANIFEST = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');

function startStubServer(): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url?.includes('/v1/policy/packs/policy-pack-v0')) {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
        res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
        res.setHeader('Digest', `sha-256=${manifest.manifest.digest.value}`);
        res.setHeader('X-Cosign-Bundle', fs.readFileSync(BUNDLE_JSON, 'utf8'));
        fs.createReadStream(PACK_TAR).pipe(res);
      } else { res.statusCode = 404; res.end(); }
    });
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}/v1/policy/packs/policy-pack-v0`, close: () => srv.close() });
    });
  });
}

// Utility: opa eval via CLI to confirm policy semantics did not drift
function opaEval(query: string, input: object, policyDir: string) {
  const r = spawnSync('opa', ['eval', query, '--format', 'values', '--data', path.join(policyDir, 'opa'), '--input', '-'], {
    input: JSON.stringify(input), encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
}

describe('Policy Pack contract', () => {
  it('verifies signature and enforces ABAC allow for same-tenant', async () => {
    // Precondition: artifacts exist (built + signed)
    expect(fs.existsSync(PACK_TAR)).toBe(true);
    expect(fs.existsSync(BUNDLE_JSON)).toBe(true);

    const { url, close } = await startStubServer();
    try {
      const unpacked = await fetchAndVerify({ url });
      const decision = opaEval('data.cos.abac.allow', {
        subject: { tenant: 't1', purpose: 'investigation' },
        resource: { tenant: 't1', retention_until: '2099-01-01T00:00:00Z' }
      }, unpacked);
      expect(decision).toEqual('true');
    } finally { close(); }
  });

  it('denies cross-tenant access', async () => {
    const { url, close } = await startStubServer();
    try {
      const unpacked = await fetchAndVerify({ url });
      const decision = opaEval('data.cos.abac.allow', {
        subject: { tenant: 'tA', purpose: 'investigation' },
        resource: { tenant: 'tB', retention_until: '2099-01-01T00:00:00Z' }
      }, unpacked);
      expect(decision).toEqual('false');
    } finally { close(); }
  });
});
```

**How this test works**
- Spins up a tiny HTTP server that mimics `GET /v1/policy/packs/policy-pack-v0` with the same headers your real route sets.
- Uses the COS client to fetch + verify (digest + cosign bundle) **offline**.
- Runs `opa eval` against the unpacked `cos.abac.rego` to assert canonical decisions.

> **Dependencies for test runner:** `cosign` and `opa` CLIs must be installed on the CI agent (or add setup steps in a workflow).

---

## 5) Add CI for Contract Tests

**File:** `.github/workflows/contract-tests.yml`

```yaml
name: contract-tests
on:
  push:
    paths:
      - 'contracts/policy-pack/v0/**'
      - 'clients/cos-policy-fetcher/**'
      - 'tests/contract/**'
      - '.github/workflows/contract-tests.yml'
  pull_request:
    paths:
      - 'contracts/policy-pack/v0/**'
      - 'clients/cos-policy-fetcher/**'
      - 'tests/contract/**'

jobs:
  run:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: sigstore/cosign-installer@v3
        with: { cosign-release: 'v2.2.4' }
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
          sudo mv opa /usr/local/bin/opa
      - name: Node setup
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build pack (if not present)
        run: |
          bash scripts/build_policy_pack.sh
          bash scripts/cosign_sign.sh
      - name: Install deps for client
        working-directory: clients/cos-policy-fetcher
        run: npm ci && npm run build
      - name: Run contract tests
        env:
          COSIGN_EXPERIMENTAL: 1
        run: npx jest --runInBand
```

---

## 6) COS Integration Hook (optional example)

**File:** `companyos/src/policy/loader.ts`

```ts
import { fetchAndVerify } from '../../../clients/cos-policy-fetcher/src/index';

export async function loadPolicyPack(url: string) {
  const dir = await fetchAndVerify({ url });
  // Here you would hot-reload OPA bundle (e.g., via sidecar or local engine)
  // For sidecar: POST /v1/policies with tar; for embedded: point to `dir/opa`
  return { dir };
}
```

---

## 7) Developer UX — Makefile targets

**File:** `Makefile`

```makefile
.PHONY: pack sign verify contract-test

pack:
	bash scripts/build_policy_pack.sh

sign:
	bash scripts/cosign_sign.sh

verify:
	COSIGN_EXPERIMENTAL=1 cosign verify-blob --bundle contracts/policy-pack/v0/signing/cosign.bundle.json dist/policy-pack/v0/policy-pack-v0.tar

contract-test:
	npx jest --runInBand tests/contract/policy_pack.contract.test.ts
```

---

## 8) Operational Notes & Guardrails

- **Offline/air‑gapped:** The cosign bundle is embedded in the response header and included in the repo; verification path requires **no network**.
- **Immutability:** Any change to `opa/` or `data/` regenerates the tar and SHA; CI updates `manifest.digest.value` and the bundle.
- **Backwards compatibility:** Contract tests are your red flag—if ABAC decisions change for the same inputs, the PR must include a migration note and an updated acceptance pack.
- **Serving security:** Consider adding `Cache-Control: no-store` and ETag headers, and include `Signature-Input`/`Signature` (HTTP Message Signatures) later for end-to-end transport integrity.

---

## 9) Next Hardening (follow-up PRs)

- Add pact-like tests for the REST seam when you evolve beyond the single pack id.
- Provide a `/v1/policy/packs/:id/attestation` endpoint so COS can fetch bundle separately if you choose to omit `X-Cosign-Bundle`.
- Add an AnalysisTemplate in Argo that calls the Evidence GraphQL to gate canaries on latest SLO snapshot.
- Swap shelling out to `cosign` for a library call when `sigstore-js` adds stable offline bundle verification APIs.
```



---

## 10) Pack Route Hardening: **Dev Auto-Build (opt‑in)** + **Dedicated Attestation Endpoint**

### Why this approach
- **Security & determinism:** Never rebuild on a GET in prod. For dev convenience, allow an **opt‑in** auto‑build guarded by `MC_DEV_AUTO_BUILD_PACK=true` **and** `NODE_ENV!=="production"`.
- **Interoperability:** A separate attestation endpoint (`/v1/policy/packs/:id/attestation`) lets COS fetch the bundle out‑of‑band when you decide to omit `X-Cosign-Bundle` or want stronger cacheability.

### Server changes

**Patch:** `server/src/routes/contracts.ts`
```ts
// add near existing imports
import { spawnSync } from 'node:child_process';

function ensurePackBuiltDevOnly() {
  const devAutoBuild = process.env.MC_DEV_AUTO_BUILD_PACK === 'true' && process.env.NODE_ENV !== 'production';
  if (!devAutoBuild) return;
  const r = spawnSync('bash', ['scripts/build_policy_pack.sh'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('[pack:auto-build] failed:', r.stderr);
  } else {
    // attempt sign if bundle missing (best-effort)
    const s = spawnSync('bash', ['scripts/cosign_sign.sh'], { encoding: 'utf8' });
    if (s.status !== 0) console.warn('[pack:auto-sign] warn:', s.stderr);
  }
}

router.get('/policy/packs/:packId', async (req, res) => {
  const { packId } = req.params; // expect 'policy-pack-v0' for now
  if (packId !== 'policy-pack-v0') return res.status(404).json({ error: 'unknown pack' });

  const packTar = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
  const bundleJson = path.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');

  if (!fs.existsSync(packTar)) {
    ensurePackBuiltDevOnly();
  }
  if (!fs.existsSync(packTar)) return res.status(503).json({ error: 'pack not built yet' });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = manifest.manifest?.digest?.value;

  // Caching headers
  res.setHeader('ETag', `W/"sha-256:${digest}"`);
  res.setHeader('Cache-Control', 'public, max-age=60, immutable');
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.setHeader('Digest', `sha-256=${digest}`);

  // Optional inline bundle for single-call verification
  if (process.env.MC_INLINE_BUNDLE === 'true') {
    res.setHeader('X-Cosign-Bundle', fs.readFileSync(bundleJson, 'utf8'));
  }

  const stat = fs.statSync(packTar);
  res.setHeader('Content-Length', String(stat.size));
  fs.createReadStream(packTar).pipe(res);
});

// HEAD support for lightweight probing
router.head('/policy/packs/:packId', (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0') return res.status(404).end();
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  if (!fs.existsSync(manifestPath)) return res.status(503).end();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = manifest.manifest?.digest?.value;
  res.setHeader('ETag', `W/"sha-256:${digest}"`);
  res.setHeader('Digest', `sha-256=${digest}`);
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.status(200).end();
});

// Dedicated attestation endpoint
router.get('/policy/packs/:packId/attestation', (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0') return res.status(404).json({ error: 'unknown pack' });
  const bundleJson = path.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  if (!fs.existsSync(bundleJson) || !fs.existsSync(manifestPath)) return res.status(503).json({ error: 'attestation not available' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = manifest.manifest?.digest?.value;

  res.setHeader('Content-Type', 'application/vnd.sigstore.bundle+json');
  res.setHeader('ETag', `W/"sha-256:${digest}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(fs.readFileSync(bundleJson, 'utf8'));
});
```

> **Defaults:** Inline bundle disabled (`MC_INLINE_BUNDLE != 'true'`), dev auto‑build disabled. Enable only for local DX.

### COS changes (optional but recommended)

**Patch:** `clients/cos-policy-fetcher/src/index.ts` — add attestation fetch path
```ts
export async function fetchAttestation(url: string): Promise<string> {
  const { body, statusCode } = await request(url, { method: 'GET' });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  let data = '';
  for await (const chunk of body) data += chunk.toString('utf8');
  return data;
}

export async function fetchAndVerify({ url, cosignPath = 'cosign' }: FetchOptions): Promise<string> {
  // ... existing code above ...
  const attUrl = url.endsWith('/attestation') ? url : `${url}/attestation`;
  const bundle = bundleHeader ?? await fetchAttestation(attUrl);
  // use `bundle` in verify-blob call
  const { code, stderr } = await sh(cosignPath, ['verify-blob', '--bundle', '-', tarPath], String(bundle));
  // ... rest unchanged ...
}
```

### OpenAPI (new)

**File:** `docs/contracts/policy-pack.openapi.yaml`
```yaml
openapi: 3.0.3
info:
  title: IntelGraph Policy Pack Contracts
  version: 0.1.0
paths:
  /v1/policy/packs/{packId}:
    get:
      summary: Download signed policy pack tarball
      parameters:
        - in: path
          name: packId
          required: true
          schema: { type: string, enum: [policy-pack-v0] }
      responses:
        '200':
          description: OK
          headers:
            Digest: { description: sha-256 of tar, schema: { type: string } }
            ETag: { description: Weak ETag keyed to digest, schema: { type: string } }
            X-Cosign-Bundle: { description: Optional inline Sigstore bundle, schema: { type: string } }
          content:
            application/vnd.intelgraph.policy+tar: { schema: { type: string, format: binary } }
        '503': { description: Pack not built }
    head:
      summary: Probe for digest/etag without body
      parameters:
        - $ref: '#/paths/~1v1~1policy~1packs~1{packId}/get/parameters/0'
      responses:
        '200': { description: OK }
  /v1/policy/packs/{packId}/attestation:
    get:
      summary: Fetch Sigstore verification bundle (for offline verify)
      parameters:
        - $ref: '#/paths/~1v1~1policy~1packs~1{packId}/get/parameters/0'
      responses:
        '200':
          description: OK
          headers:
            ETag: { description: Weak ETag keyed to pack digest, schema: { type: string } }
          content:
            application/vnd.sigstore.bundle+json: { schema: { type: object, additionalProperties: true } }
        '503': { description: Attestation not available }
```

### Docs additions

**Patch:** `docs/contracts/README.md`
```
- The pack tar is available at `/v1/policy/packs/policy-pack-v0`.
- The Sigstore verification bundle is exposed at `/v1/policy/packs/policy-pack-v0/attestation`.
- For local DX, you may set `MC_DEV_AUTO_BUILD_PACK=true` and `MC_INLINE_BUNDLE=true`.
- Never enable `MC_DEV_AUTO_BUILD_PACK` in production; CI should be the only producer of artifacts.
```

### Makefile helpers

**Patch:** `Makefile`
```makefile
.PHONY: serve-pack
serve-pack:
	MC_DEV_AUTO_BUILD_PACK=true MC_INLINE_BUNDLE=true NODE_ENV=development yarn dev
```

### Acceptance Criteria (for this change)
- **Prod safety:** In production (`NODE_ENV=production`), GET **never** triggers a build; server returns 503 if pack missing.
- **Attestation:** `/v1/policy/packs/policy-pack-v0/attestation` returns the exact cosign bundle used in CI; COS client can verify with it offline.
- **Caching:** `ETag` and `Digest` are set; HEAD responds with the same headers.
- **DX:** With `MC_DEV_AUTO_BUILD_PACK=true`, a fresh repo can serve the pack locally without running CI first.



---

## 11) Developer QoL + HTTP 304s: OPA installer & Conditional GET

### A) npm script: local OPA install (dev-only)

**File:** `scripts/dev_install_opa.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
unameOut="$(uname -s)" # Linux or Darwin
arch="$(uname -m)"     # x86_64 or arm64
case ${unameOut} in
  Linux*)  os=linux ;;
  Darwin*) os=darwin ;;
  *)       echo "Unsupported OS: ${unameOut}"; exit 1 ;;
endcase
case ${arch} in
  x86_64|amd64) cpu=amd64 ;;
  arm64|aarch64) cpu=arm64 ;;
  *) echo "Unsupported arch: ${arch}"; exit 1 ;;
endcase
version=${1:-latest}
url="https://openpolicyagent.org/downloads/${version}/opa_${os}_${cpu}"
mkdir -p .bin
curl -fsSL -o .bin/opa "$url"
chmod +x .bin/opa
# put .bin on PATH for this shell and echo hint for shells
if ! grep -q "\.bin" <<< "$PATH"; then
  echo "
Add to your shell rc: export PATH=\"$(pwd)/.bin:$PATH\""
fi
.bin/opa version || true
```

**Patch:** `package.json` (root)
```json
{
  "scripts": {
    "dev:opa": "bash scripts/dev_install_opa.sh",
    "dev:opa:version": ".bin/opa version || opa version"
  }
}
```

> Run `npm run dev:opa` (or `yarn dev:opa`) to drop a project-local `opa` binary at `.bin/opa`, keeping global env clean.

### B) Conditional GET for policy pack (ETag + Last-Modified → 304)

**Patch:** `server/src/routes/contracts.ts`
```ts
router.get('/policy/packs/:packId', async (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0') return res.status(404).json({ error: 'unknown pack' });

  const packTar = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
  const bundleJson = path.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');

  if (!fs.existsSync(packTar)) ensurePackBuiltDevOnly();
  if (!fs.existsSync(packTar)) return res.status(503).json({ error: 'pack not built yet' });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = manifest.manifest?.digest?.value;
  const stat = fs.statSync(packTar);
  const etag = `W/"sha-256:${digest}"`;
  const lastMod = stat.mtime.toUTCString();

  // Precondition checks
  const ifNoneMatch = req.headers['if-none-match'];
  const ifModifiedSince = req.headers['if-modified-since'];
  if ((ifNoneMatch && ifNoneMatch === etag) || (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime)) {
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', lastMod);
    res.status(304).end();
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.setHeader('Digest', `sha-256=${digest}`);
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastMod);
  res.setHeader('Cache-Control', 'public, max-age=60, immutable');

  if (process.env.MC_INLINE_BUNDLE === 'true') {
    res.setHeader('X-Cosign-Bundle', fs.readFileSync(bundleJson, 'utf8'));
  }

  res.setHeader('Content-Length', String(stat.size));
  fs.createReadStream(packTar).pipe(res);
});
```

**HEAD route** (match headers)
```ts
router.head('/policy/packs/:packId', (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0') return res.status(404).end();
  const packTar = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  if (!fs.existsSync(packTar) || !fs.existsSync(manifestPath)) return res.status(503).end();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = manifest.manifest?.digest?.value;
  const stat = fs.statSync(packTar);
  res.setHeader('ETag', `W/"sha-256:${digest}"`);
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  res.setHeader('Digest', `sha-256=${digest}`);
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.status(200).end();
});
```

### C) Tests for conditional GET

**File:** `tests/contract/policy_pack.etag.test.ts`
```ts
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PACK_TAR = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
const MANIFEST = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');

function startRealServer() {
  const app = require('../../server/dist/app').default; // assuming build emits app default export
  return new Promise<{ url: string; close: () => void }>((resolve) => {
    const srv = http.createServer(app);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => srv.close() });
    });
  });
}

describe('ETag / 304 behavior', () => {
  it('returns 304 when If-None-Match matches current ETag', async () => {
    expect(fs.existsSync(PACK_TAR)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const etag = `W/"sha-256:${manifest.manifest.digest.value}"`;

    const { url, close } = await startRealServer();
    try {
      const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, {
        method: 'GET', headers: { 'If-None-Match': etag }
      });
      expect(res.status).toBe(304);
      expect(res.headers.get('ETag')).toBe(etag);
    } finally { close(); }
  });
});
```

**Patch:** `.github/workflows/contract-tests.yml` — run new test file
```yaml
      - name: Run contract tests
        env:
          COSIGN_EXPERIMENTAL: 1
        run: npx jest --runInBand tests/contract/**/*.test.ts
```

### D) Docs

**Patch:** `docs/contracts/README.md`
```
- Conditional GET is supported via `ETag` (sha-256 keyed) and `Last-Modified`.
- Clients SHOULD send `If-None-Match`; servers will respond `304 Not Modified` when the digest matches.
- For local OPA setup: `npm run dev:opa` downloads a project-local binary to `.bin/opa`.
```

### Acceptance Criteria
- `GET /v1/policy/packs/policy-pack-v0` returns **304** when `If-None-Match` matches the current ETag, and includes `ETag` + `Last-Modified` on both 200/304.
- `HEAD /v1/policy/packs/policy-pack-v0` mirrors headers without a body.
- `npm run dev:opa` places an executable at `.bin/opa` and prints its version.


---

## 12) Argo Rollouts — Evidence‑Gated Promotion (GraphQL) + 304 Test Coverage

### A) 304 test coverage (wired to built server)

**File:** `tests/contract/policy_pack.conditional-get.test.ts`
```ts
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

function startBuiltServer(): Promise<{ url: string; close: () => void }> {
  // assumes `server/dist/app.js` exports default express app
  // if not, adjust import to your build output
  // you can run `tsc` or your build script in CI before this test
  // e.g., add a step: `npm run build:server`
  // and ensure outDir is `server/dist`
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const app = require('../../server/dist/app').default;
  return new Promise((resolve) => {
    const srv = http.createServer(app);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => srv.close() });
    });
  });
}

describe('Policy pack route — conditional GET', () => {
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  const tarPath = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');

  beforeAll(() => {
    expect(fs.existsSync(tarPath)).toBe(true);
  });

  it('responds 304 with matching If-None-Match', async () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const etag = `W/"sha-256:${manifest.manifest.digest.value}"`;
    const { url, close } = await startBuiltServer();
    try {
      const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, { headers: { 'If-None-Match': etag } });
      expect(res.status).toBe(304);
      expect(res.headers.get('ETag')).toBe(etag);
      expect(res.headers.get('Last-Modified')).toBeTruthy();
    } finally { close(); }
  });

  it('responds 200 with body when ETag does not match', async () => {
    const { url, close } = await startBuiltServer();
    try {
      const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, { headers: { 'If-None-Match': 'W/"sha-256:deadbeef"' } });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/vnd.intelgraph.policy+tar');
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.byteLength).toBeGreaterThan(0);
    } finally { close(); }
  });
});
```

**Workflow tweak:** `.github/workflows/contract-tests.yml`
```yaml
      - name: Build server
        run: npm run build --workspace=server || (cd server && npm run build || true)
      - name: Run contract tests (all)
        env:
          COSIGN_EXPERIMENTAL: 1
        run: npx jest --runInBand tests/contract/**/*.test.ts
```

---

### B) Evidence‑Gated Promotion via Argo Rollouts

> Two provider options are included:
> 1) **Web provider** (native HTTP POST to MC GraphQL). Requires Argo Rollouts v1.7+.
> 2) **Job provider** (curl in a pod). More portable; works everywhere.

#### 1) GraphQL query (ConfigMap)

**File:** `server/k8s/production/configmap-evidence-query.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mc-evidence-query
  namespace: production
data:
  query.graphql: |
    query EvidenceOk($service: String!, $releaseId: ID!) {
      evidenceOk(service: $service, releaseId: $releaseId) {
        ok
        reasons
        snapshot {
          service p95Ms p99Ms errorRate window
        }
        cost { graphqlPerMillionUsd ingestPerThousandUsd }
      }
    }
```

> **Server side:** implement `evidenceOk(service, releaseId)` in MC GraphQL to apply thresholds: reads ≤350ms p95, writes ≤700ms (if split), errorRate ≤2%, cost caps; return structured reasons.

#### 2) Secret for MC access token

**File:** `server/k8s/production/secret-mc-token.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mc-api-token
  namespace: production
type: Opaque
stringData:
  token: "${MC_API_TOKEN}"
```

#### 3) AnalysisTemplate — **Web provider**

**File:** `server/k8s/production/analysis-template-evidence-web.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: at-evidence-gql-web
  namespace: production
spec:
  args:
    - name: mcUrl
    - name: service
    - name: releaseId
  metrics:
    - name: evidence-ok
      interval: 60s
      successCondition: result.ok == true
      failureLimit: 1
      provider:
        web:
          url: "{{args.mcUrl}}/graphql"
          method: POST
          timeout: 15s
          headers:
            - key: Content-Type
              value: application/json
            - key: Authorization
              valueFrom:
                secretKeyRef: { name: mc-api-token, key: token }
          jsonBody:
            queryFrom:
              configMapKeyRef: { name: mc-evidence-query, key: query.graphql }
            variables:
              service: "{{args.service}}"
              releaseId: "{{args.releaseId}}"
          jsonPath: "$.data.evidenceOk"
```

#### 4) AnalysisTemplate — **Job provider** (portable)

**File:** `server/k8s/production/analysis-template-evidence-job.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: at-evidence-gql-job
  namespace: production
spec:
  args:
    - name: mcUrl
    - name: service
    - name: releaseId
  metrics:
    - name: evidence-ok
      successCondition: asInt(result) == 1
      failureLimit: 1
      provider:
        job:
          spec:
            template:
              spec:
                restartPolicy: Never
                containers:
                  - name: check
                    image: curlimages/curl:8.10.1
                    command: ["/bin/sh","-c"]
                    env:
                      - name: MC_URL
                        value: "{{args.mcUrl}}"
                      - name: SERVICE
                        value: "{{args.service}}"
                      - name: RELEASE_ID
                        value: "{{args.releaseId}}"
                      - name: TOKEN
                        valueFrom:
                          secretKeyRef: { name: mc-api-token, key: token }
                    args:
                      - >-
                        curl -sS -H "Authorization: $TOKEN" -H 'Content-Type: application/json' \
                        -d '{"query":"query($service:String!,$releaseId:ID!){evidenceOk(service:$service,releaseId:$releaseId){ok}}","variables":{"service":"'$SERVICE'","releaseId":"'$RELEASE_ID'"}}' \
                        $MC_URL/graphql | jq -r '.data.evidenceOk.ok | if . then 1 else 0 end'
```

#### 5) Wire into Rollout

**Patch:** `server/k8s/production/rollout.yaml`
```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 20
        - analysis:
            templates:
              - templateName: at-evidence-gql-web   # or at-evidence-gql-job
                args:
                  - name: mcUrl
                    value: https://mc.prod.example.com
                  - name: service
                    value: companyos
                  - name: releaseId
                    valueFrom:
                      fieldRef: { fieldPath: metadata.labels['release-id'] }
        - pause: { duration: 60 }
        - setWeight: 50
        - analysis:
            templates:
              - templateName: at-evidence-gql-web
                args:
                  - name: mcUrl
                    value: https://mc.prod.example.com
                  - name: service
                    value: companyos
                  - name: releaseId
                    valueFrom:
                      fieldRef: { fieldPath: metadata.labels['release-id'] }
        - setWeight: 100
```

> Ensure your Rollout or Pod template sets a `release-id` label. MC should populate Evidence bundles using the same `releaseId`.

#### 6) MC GraphQL — server stub (TypeScript)

**File:** `server/src/graphql/schema.evidenceOk.ts`
```ts
import { gql } from 'apollo-server-express';

export const evidenceOkTypeDefs = gql/* GraphQL */`
  type CostSnapshot { graphqlPerMillionUsd: Float, ingestPerThousandUsd: Float }
  type EvidenceOk {
    ok: Boolean!
    reasons: [String!]!
    snapshot: SLOSnapshot!
    cost: CostSnapshot
  }
  extend type Query {
    evidenceOk(service: String!, releaseId: ID!): EvidenceOk!
  }
`;
```

**File:** `server/src/graphql/resolvers/evidenceOk.ts`
```ts
import type { IResolvers } from '@graphql-tools/utils';

const READ_P95_BUDGET = 350; // ms
const WRITE_P95_BUDGET = 700; // ms (if you split metrics by op, adapt accordingly)
const ERROR_RATE_BUDGET = 0.02; // 2%
const GRAPHQL_COST_BUDGET = 2.0; // $/1M calls

export const evidenceOkResolvers: IResolvers = {
  Query: {
    async evidenceOk(_root, { service, releaseId }, ctx) {
      // TODO: pull latest Evidence bundle for (service, releaseId)
      // This is a stub using ctx.dataSources or repo; replace with actual store
      const snapshot = { service, p95Ms: 320, p99Ms: 800, errorRate: 0.01, window: '15m' };
      const cost = { graphqlPerMillionUsd: 1.8, ingestPerThousandUsd: 0.08 };
      const reasons: string[] = [];
      if (snapshot.p95Ms > READ_P95_BUDGET) reasons.push(`p95 ${snapshot.p95Ms}ms > ${READ_P95_BUDGET}ms`);
      if (snapshot.errorRate > ERROR_RATE_BUDGET) reasons.push(`errorRate ${snapshot.errorRate} > ${ERROR_RATE_BUDGET}`);
      if ((cost.graphqlPerMillionUsd ?? 0) > GRAPHQL_COST_BUDGET) reasons.push(`graphql cost ${cost.graphqlPerMillionUsd} > ${GRAPHQL_COST_BUDGET}`);
      return { ok: reasons.length === 0, reasons, snapshot, cost };
    },
  },
};
```

**Wire schema/resolvers:**
- Import `evidenceOkTypeDefs` into your schema index and merge.
- Import `evidenceOkResolvers` into resolvers index and merge.

#### 7) Acceptance Criteria
- **Analysis passes:** Rollout proceeds only when `evidenceOk.ok == true` at each step; otherwise it halts/aborts with reasons recorded in the analysis run.
- **Token security:** MC token stored in Secret; no tokens embedded in AnalysisTemplates.
- **Portability:** If Web provider isn’t available, Job provider template succeeds with same semantics.
- **Traceability:** AnalysisRun stores the GraphQL response payload (
