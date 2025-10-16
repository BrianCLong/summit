# Summit Maestro — GitHub Actions CI/CD Workflows & Scripts

**Last Updated:** 2025‑08‑31 • **Owner:** Platform PM/Eng

> Drop these files into the Maestro repo. Import order: create directories, add scripts, then workflows.

---

## 1) `.github/workflows/contract-tests.yml`

```yaml
name: Contract Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run contract tests (Vitest)
        run: npx vitest run --reporter=default

      - name: Upload test artifacts (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-logs
          path: |
            **/junit*.xml
            **/.vitest-log*
```

---

## 2) `.github/workflows/manifest-validate.yml`

Validates **all Workflow/Runbook manifests** (YAML/JSON) against the JSON Schemas.

```yaml
name: Manifest Validation

on:
  pull_request:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Ensure script deps
        run: |
          npm i -D ajv ajv-formats yaml glob

      - name: Validate manifests against schemas
        run: node .github/scripts/validate_manifests.js
```

---

## 3) `.github/scripts/validate_manifests.js`

```js
// Validate YAML/JSON manifests in examples/ against contracts/*.schema.json
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', '..');
const schemasDir = path.join(ROOT, 'contracts');
const wfSchemaPath = path.join(schemasDir, 'workflow.schema.json');
const rbSchemaPath = path.join(schemasDir, 'runbook.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.yaml') || file.endsWith('.yml')) return YAML.parse(raw);
  return JSON.parse(raw);
}

function formatErrors(errors = []) {
  return errors
    .map(
      (e) =>
        `  • ${e.instancePath || '/'} ${e.message}${e.params && e.params.allowedValues ? ` (allowed: ${e.params.allowedValues})` : ''}`,
    )
    .join('\n');
}

(async () => {
  const wfSchema = JSON.parse(fs.readFileSync(wfSchemaPath, 'utf8'));
  const rbSchema = JSON.parse(fs.readFileSync(rbSchemaPath, 'utf8'));
  const validateWF = ajv.compile(wfSchema);
  const validateRB = ajv.compile(rbSchema);

  const files = await glob(
    [
      'examples/workflows/**/*.{yaml,yml,json}',
      'examples/runbooks/**/*.{yaml,yml,json}',
    ],
    { nodir: true },
  );
  if (!files.length) {
    console.warn('No manifests found under examples/.');
    process.exit(0);
  }

  let failed = 0;
  for (const f of files) {
    const doc = load(f);
    const kind = doc?.kind;
    const validate =
      kind === 'Workflow' ? validateWF : kind === 'Runbook' ? validateRB : null;
    if (!validate) {
      console.error(`✖ ${f}: unknown kind ${kind}`);
      failed++;
      continue;
    }
    const ok = validate(doc);
    if (!ok) {
      console.error(
        `✖ ${f}: schema validation failed\n${formatErrors(validate.errors)}`,
      );
      failed++;
    } else {
      console.log(`✔ ${f}`);
    }
  }

  if (failed) {
    console.error(`\n${failed} file(s) failed schema validation.`);
    process.exit(1);
  }
})();
```

---

## 4) `.github/workflows/build-publish.yml`

Builds and publishes an image to GHCR, generates an SBOM, and signs the image/attestation with **cosign keyless**.

```yaml
name: Build & Publish (Control Plane)

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  packages: write
  id-token: write # for cosign keyless

env:
  IMAGE_NAME: ghcr.io/${{ github.repository }}/maestro-control-plane

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
            ${{ env.IMAGE_NAME }}:latest
          platforms: linux/amd64

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image (keyless)
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign sign --yes $IMAGE_NAME:sha-${{ github.sha }}

      - name: Generate SBOM (SPDX JSON)
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Attach SBOM as attestation
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign attest --yes \
            --predicate sbom.spdx.json \
            --type spdx \
            $IMAGE_NAME:sha-${{ github.sha }}

      - name: Upload artifacts (SBOM)
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
```

---

## 5) `.github/workflows/release.yml`

Runs tests, builds, and publishes on version tags.

```yaml
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write
  packages: write
  id-token: write

jobs:
  test:
    uses: ./.github/workflows/contract-tests.yml

  build-and-publish:
    needs: test
    uses: ./.github/workflows/build-publish.yml
```

> If your Actions plan disallows `uses:` of local workflows this way, duplicate the relevant jobs or convert to a composite action.

---

## 6) `.github/workflows/reusable-manifest-validate.yml`

Reusable validation for **other repos** to call.

```yaml
name: Reusable Manifest Validate
on:
  workflow_call:
    inputs:
      manifests_glob:
        description: 'Glob of manifests in caller repo'
        required: false
        default: 'examples/**/*.{yaml,yml,json}'
        type: string
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm i -D ajv ajv-formats yaml glob
      - name: Copy validation script
        run: |
          mkdir -p .github/scripts
          cp .github/scripts/validate_manifests.js .github/scripts/validate_manifests.js
      - name: Validate manifests
        env:
          MANIFESTS_GLOB: ${{ inputs.manifests_glob }}
        run: |
          # Optional: use env glob; script falls back to defaults
          node .github/scripts/validate_manifests.js
```

**Caller usage example (in another repo):**

```yaml
name: Validate Maestro Manifests
on: [pull_request]
jobs:
  validate:
    uses: your-org/maestro/.github/workflows/reusable-manifest-validate.yml@main
    with:
      manifests_glob: 'ops/**/*.yaml'
```

---

## 7) Optional — `.github/workflows/opa-policy-checks.yml`

Evaluate Rego policies under `policy/` against sample inputs.

```yaml
name: OPA Policy Checks
on:
  pull_request:
    paths: ['policy/**']

jobs:
  opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
      - name: Test policies
        run: |
          ./opa test policy/ -v
```

---

## 8) Notes & Secrets

- **GHCR publish** uses `${{ secrets.GITHUB_TOKEN }}`; no extra token needed.
- **Cosign keyless** requires `id-token: write` permission; set repo → Actions → Workflow permissions accordingly.
- If you host images elsewhere, update `IMAGE_NAME` and login step.

---

## 9) Next integrations (optional)

- Add **Grype** vulnerability scanning as a non‑blocking job.
- Wire **Codecov**/coverage gate if desired.
- Add **SLSA provenance** generator reusable workflow once registry policy is settled.
