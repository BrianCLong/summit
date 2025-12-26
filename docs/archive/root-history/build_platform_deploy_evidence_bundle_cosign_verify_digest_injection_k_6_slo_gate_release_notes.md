# PR Patch: Deploy Hardening + Evidence Bundle

#

# Adds: build&publish with cosign attestations, pre-deploy verify-attestations,

# helm digest injection, k6 SLO canary gate, OPA policy wiring, release notes template.

# Files separated by `=== FILE: <path> ===`.

=== FILE: .github/workflows/build-publish-sign.yml ===
name: build-publish-sign
on:
push:
branches: [ main ]
permissions:
contents: read
id-token: write # for keyless signing
packages: write
env:
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
jobs:
  build-publish-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && corepack prepare pnpm@latest --activate
      - run: pnpm install --frozen-lockfile
      - name: Build images (turbo)
        run: pnpm turbo run docker:build -- --push
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Collect digests
        id: digests
        run: |
          # Expect a manifest list from turbo or write artifacts mapping image→digest
          # Example assumes tools/publish/manifest.json is created by build step
          echo "digests=$(cat tools/publish/manifest.json | jq -c .)" >> "$GITHUB_OUTPUT"
      - name: Cosign install
        uses: sigstore/cosign-installer@v3.6.0
      - name: Syft SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
artifact-name: sbom.spdx.json - name: Sign images (keyless)
env:
COSIGN_EXPERIMENTAL: 1
run: |
for d in $(jq -r '.[].digest' <<< '${{ steps.digests.outputs.digests }}'); do
cosign sign ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${d}
          done
      - name: Attest SBOM & Provenance
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          for d in $(jq -r '.[].digest' <<< '${{ steps.digests.outputs.digests }}'); do
cosign attest --type spdx --predicate sbom.spdx.json ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${d}
            cosign attest --type slsa-provenance --predicate tools/publish/provenance.json ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${d}
done - name: Upload evidence bundle
uses: actions/upload-artifact@v4
with:
name: evidence-bundle
path: |
tools/publish/manifest.json
sbom.spdx.json
tools/publish/provenance.json

=== FILE: tools/publish/manifest.json ===
{
"images": []
}

=== FILE: .github/workflows/deploy-verify-attest.yml ===
name: deploy-verify-attest
on:
workflow_dispatch:
inputs:
chart:
description: 'Chart path (e.g., charts/maestro)'
required: true
namespace:
description: 'K8s namespace'
required: true
release:
description: 'Helm release name'
required: true
permissions:
contents: read
id-token: write
jobs:
verify-and-deploy:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Cosign install
uses: sigstore/cosign-installer@v3.6.0 - name: Verify images (sign + attest) from values
id: verify
run: |
node tools/policy/collect-chart-images.js "${{ github.event.inputs.chart }}" > /tmp/images.txt
          while read -r ref; do
            echo "Verifying $ref"
            cosign verify $ref
            cosign verify-attestation --type spdx $ref
            cosign verify-attestation --type slsa-provenance $ref
          done < /tmp/images.txt
      - name: Helm upgrade --install
        uses: azure/setup-helm@v4
      - name: Deploy
        run: |
          helm upgrade --install "${{ github.event.inputs.release }}" "${{ github.event.inputs.chart }}" \
            --namespace "${{ github.event.inputs.namespace }}" --create-namespace

=== FILE: tools/policy/collect-chart-images.js ===
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const chart = process.argv[2];
if (!chart) throw new Error('Usage: collect-chart-images <chartPath>');
const valuesPath = path.join(chart, 'values.yaml');
const raw = fs.readFileSync(valuesPath, 'utf8');
const doc = YAML.parse(raw) || {};
function printImage(doc) {
const repo = doc.image?.repository;
const digest = doc.image?.digest;
if (repo && digest) {
console.log(`${repo}@${digest}`);
}
}
printImage(doc);

=== FILE: .github/workflows/inject-digests.yml ===
name: inject-digests-into-charts
on:
workflow_dispatch:
workflow_run:
workflows: ["build-publish-sign"]
types: [completed]
permissions:
contents: write
jobs:
inject:
runs-on: ubuntu-latest
if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
steps: - uses: actions/checkout@v4 - name: Download evidence bundle
uses: actions/download-artifact@v4
with:
name: evidence-bundle
path: artifacts - name: Inject digests
run: |
node tools/publish/inject-digest-into-values.js artifacts/tools/publish/manifest.json charts - name: Create release PR
uses: peter-evans/create-pull-request@v6
with:
title: "chore(charts): pin image digests from latest build"
commit-message: "pin image digests"
branch: chore/pin-digests
body: "Automated digest pin from evidence bundle."

=== FILE: tools/publish/inject-digest-into-values.js ===
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const manifestPath = process.argv[2];
const chartsDir = process.argv[3];
if (!manifestPath || !chartsDir) {
console.error('Usage: inject-digest-into-values <manifest.json> <chartsDir>');
process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const digests = new Map();
for (const it of manifest.images || []) {
digests.set(it.name, it.digest);
}
function walk(dir) {
return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
const p = path.join(dir, d.name);
return d.isDirectory() ? walk(p) : [p];
});
}
const files = walk(chartsDir).filter((p) => p.endsWith('values.yaml'));
for (const f of files) {
const doc = YAML.parse(fs.readFileSync(f, 'utf8')) || {};
const repo = doc.image?.repository;
if (repo && digests.has(repo)) {
doc.image = doc.image || {};
doc.image.tag = '';
doc.image.digest = digests.get(repo);
fs.writeFileSync(f, YAML.stringify(doc));
console.log(`[UPDATED] ${f} -> ${repo}@${doc.image.digest}`);
}
}

=== FILE: tests/k6/canary.js ===
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
vus: 10,
duration: '1m',
thresholds: {
http_req_failed: ['rate<0.01'],
http_req_duration: ['p(95)<700', 'p(99)<1500']
}
};

export default function () {
const res = http.get(\_\_ENV.TARGET_URL);
check(res, {
'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
});
sleep(1);
}

=== FILE: .github/workflows/slo-canary.yml ===
name: slo-canary
on:
workflow_dispatch:
inputs:
targetUrl:
description: 'Base URL to probe'
required: true
permissions: { contents: read }
jobs:
k6-canary:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Setup k6
uses: grafana/setup-k6-action@v1 - name: Run k6 canary
env:
TARGET_URL: ${{ inputs.targetUrl }}
run: k6 run tests/k6/canary.js

=== FILE: docs/release-notes-template.md ===

# Release vX.Y.Z — Notes & Evidence

## Changes

- Feature/Chore/Bug: …

## Images

- repository@sha256:… (link to GHCR)

## Security & Provenance

- Cosign verify: ✅
- Attestations: SPDX & SLSA attached (artifact: evidence-bundle)
- Trivy summary: 0 CRIT / 0 HIGH (or exceptions documented)

## SLO/Perf

- k6 canary p95: XXX ms (target ≤ 700 ms)
- Error rate: Y.Y%

## Known Risks / Rollback

- …

=== FILE: docs/policy-exceptions.md ===

# Policy Exceptions (Time-boxed)

> Any exception must include owner, rationale, risk, and expiry ≤ 7 days.

| Area | Path/Package | Rule | Owner | Rationale | Expiry |
| ---- | ------------ | ---- | ----- | --------- | ------ |
