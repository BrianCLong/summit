# PR Patch: CI/Policy Hardening (Next Phase)

#

# Drop these files into the repo at the indicated paths. Commit as a single PR.

# Files are separated by lines starting with === FILE: <path> ===

=== FILE: .nvmrc ===
20.17.0

=== FILE: package.json ===
{
"name": "intelgraph-monorepo",
"private": true,
"scripts": {
"build": "turbo run build",
"typecheck": "turbo run typecheck",
"test": "turbo run test",
"test:coverage": "turbo run test -- --coverage --coverageReporters=text-summary"
},
"engines": {
"node": ">=20 <21"
}
}

=== FILE: .github/workflows/ci-typecheck-coverage.yml ===
name: typecheck-coverage
on:
pull_request:
types: [opened, synchronize, reopened]
permissions:
contents: read
jobs:
typecheck:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with:
node-version: 20 - run: corepack enable && corepack prepare pnpm@latest --activate - run: pnpm install --frozen-lockfile - run: pnpm turbo run typecheck --filter=...[origin/main] --since
test-coverage:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with:
node-version: 20 - run: corepack enable && corepack prepare pnpm@latest --activate - run: pnpm install --frozen-lockfile - run: pnpm turbo run test -- --coverage --coverageReporters=text-summary - name: Upload coverage summary
if: always()
uses: actions/upload-artifact@v4
with:
name: coverage-summary
path: |
**/coverage/coverage-summary.json
**/coverage/lcov.info

=== FILE: .github/workflows/trivy.yml ===
name: trivy-security
on:
pull_request:
types: [opened, synchronize, reopened]
permissions:
contents: read
jobs:
trivy-fs:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: aquasecurity/trivy-action@master
with:
scan-type: fs
format: table
exit-code: '1'
severity: HIGH,CRITICAL

=== FILE: .github/workflows/policy-helm-digest.yml ===
name: policy-helm-digest
on:
pull_request:
paths: - 'charts/**' - 'tools/policy/**' - '.github/workflows/policy-helm-digest.yml'
permissions:
contents: read
jobs:
check-digests:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with:
node-version: 20 - run: npm i -g yaml - name: Verify no mutable tags in charts
run: node tools/policy/check-helm-digests.js

=== FILE: tools/policy/check-helm-digests.js ===
#!/usr/bin/env node
/_ eslint-disable no-console _/
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

function walk(dir) {
return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
const p = path.join(dir, d.name);
return d.isDirectory() ? walk(p) : [p];
});
}

function checkValuesYaml(p) {
const raw = fs.readFileSync(p, 'utf8');
const doc = YAML.parse(raw) || {};
const img = doc.image || {};
const tag = (img.tag || '').toString().trim();
const digest = (img.digest || '').toString().trim();
let errs = [];
if (tag) errs.push(`image.tag must be empty (found: ${tag})`);
if (!digest) errs.push('image.digest sha256 is required');
if (digest && !digest.startsWith('sha256:')) errs.push('image.digest must start with sha256:');
return errs;
}

const chartsDir = 'charts';
if (!fs.existsSync(chartsDir)) {
console.log('No charts/ directory found — skipping');
process.exit(0);
}

const files = walk(chartsDir).filter((p) => p.endsWith('values.yaml'));
let failed = false;
for (const f of files) {
const errs = checkValuesYaml(f);
if (errs.length) {
failed = true;
for (const e of errs) console.error(`[FAIL] ${f}: ${e}`);
} else {
console.log(`[OK] ${f}`);
}
}
process.exit(failed ? 1 : 0);

=== FILE: policy/helm_digest.rego ===
package helm.image

deny[msg] {
input.image.tag != ""
msg := sprintf("image.tag must be empty, found: %v", [input.image.tag])
}

deny[msg] {
not startswith(input.image.digest, "sha256:")
msg := "image.digest must be sha256:..."
}

=== FILE: .github/workflows/terraform-validate.yml ===
name: terraform-validate
on:
pull_request:
paths: - 'infra/terraform/\*\*'
permissions:
contents: read
jobs:
validate:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: hashicorp/setup-terraform@v3 - name: Init (no backend)
run: terraform -chdir=infra/terraform init -backend=false - name: Validate
run: terraform -chdir=infra/terraform validate - name: tfsec
uses: aquasecurity/tfsec-action@v1.0.3
with:
working_directory: infra/terraform - name: checkov
uses: bridgecrewio/checkov-action@v12
with:
directory: infra/terraform

=== FILE: lighthouserc.json ===
{
"ci": {
"collect": {
"staticDistDir": "apps/web/dist",
"numberOfRuns": 1
},
"assert": {
"assertions": {
"categories:performance": ["error", {"minScore": 0.8}],
"first-contentful-paint": ["error", {"maxNumericValue": 2000}],
"largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
"total-byte-weight": ["error", {"maxNumericValue": 450000}],
"unused-javascript": ["warn", {"maxNumericValue": 120000}]
}
}
}
}

=== FILE: .github/workflows/lighthouse-ci.yml ===
name: lighthouse-ci
on:
workflow_dispatch:
inputs:
url:
description: 'Preview URL to audit'
required: true
permissions:
contents: read
jobs:
lhci:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Run Lighthouse CI
uses: treosh/lighthouse-ci-action@v11
with:
urls: ${{ inputs.url }}
temporaryPublicStorage: true
budgetPath: lighthouserc.json

=== FILE: .github/dependabot.yml ===
version: 2
updates:

- package-ecosystem: "npm"
  directory: "/"
  schedule:
  interval: "weekly"
  open-pull-requests-limit: 10
  groups:
  dev-deps:
  patterns: - "_@types/_" - "eslint*" - "jest*" - "ts-jest*" - "vite*" - "webpack\*"
  ignore:
  - dependency-name: "react"
  - dependency-name: "react-dom"
- package-ecosystem: "github-actions"
  directory: "/"
  schedule:
  interval: "weekly"
- package-ecosystem: "docker"
  directory: "/"
  schedule:
  interval: "weekly"
- package-ecosystem: "pip"
  directory: "/"
  schedule:
  interval: "weekly"

=== FILE: docs/dev-parity.md ===

# Dev/Prod Parity (Pilot)

Use `values.dev.yaml` as the single source for local env. Render manifests with Helm and (optionally) convert to compose.

```bash
# render manifests
helm template svc charts/svc -f charts/svc/values.dev.yaml > .k8s/svc.dev.yaml
```

Guidelines:

- Do not use `image.tag`; always use `image.digest` (even in dev).
- Keep env names identical to prod; only values differ.
- Document any intentional delta.
