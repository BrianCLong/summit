# Sprint 13: Wiring & Gap Closure

**Cadence:** 2025-09-30 → 2025-10-14 (14 days)  
**Slug:** `mc-sprint13-gap-closure-2025-09-29`  
**Generated:** 2025-09-29T00:00:00 America/Denver

## Repository Audit (auto‑discovered from uploads)

### Repo: **extract_october2025**
Root: `/mnt/data/extract_october2025`
- Workflows: 0
- Package manager hint: []
- Engines: []
- Makefile: no; Docs: no; CODEOWNERS: no
- Policy bundle present: no; Supply-chain: no
- Observability: no; Containers/K8s/Helm: no
- Common scripts (top): []

**Detected Gaps**
- [ ] Missing CODEOWNERS for clear code ownership and review routing.
- [ ] No GitHub Actions workflows detected; CI/CD may be absent.
- [ ] No dependency bot config (Renovate or Dependabot).
- [ ] No containerization or deployment manifests detected (Docker/K8s/Helm).
- [ ] No observability assets detected (Prometheus/Grafana dashboards).
- [ ] No OPA/ABAC/policy bundle detected.
- [ ] No supply chain security artifacts (SLSA provenance, SBOM, cosign).
- [ ] No docs site or docs/ content detected.

### Repo: **summit-main**
Root: `/mnt/data/extract_summit-main_(1)/summit-main`
- Workflows (146): .github/workflows/_reusable-ci-fast.yml, .github/workflows/_reusable-ci-perf.yml, .github/workflows/_reusable-ci-security.yml, .github/workflows/_reusable-release.yml, .github/workflows/abac-policy.yml, .github/workflows/add-to-project.yml, .github/workflows/attest-provenance.yml, .github/workflows/attest-sbom.yml, .github/workflows/auto-assign.yml, .github/workflows/auto-merge-ready.yml ...
- Package manager hint: [('npm @10.8.1', 38), ('npm@10.8.1', 18), ('pnpm*', 8), ('npm@9.8.1', 2)]
- Engines: ['node:>=18', 'node:>=18.0.0', 'node:>=18.18', 'node:>=18.18 <20', 'node:>=18.18 <21', 'node:>=20.0.0', 'node:>=20.11 <21', 'npm:>=10.5', 'npm:>=8.0.0', 'pkgMgr:npm @10.8.1', 'pkgMgr:npm@10.8.1', 'pkgMgr:npm@9.8.1']
- Makefile: yes; Docs: yes; CODEOWNERS: yes
- Policy bundle present: yes; Supply-chain: yes
- Observability: yes; Containers/K8s/Helm: yes
- Common scripts (top): [('build', 842), ('test', 794), ('dev', 632), ('lint', 600), ('format', 442), ('typecheck', 353), ('start', 350), ('lint:fix', 332), ('test:coverage', 296), ('test:e2e', 289), ('preview', 200), ('test:watch', 167), ('db:migrate', 157), ('db:seed', 157), ('db:reset', 157)]

**Detected Gaps**
- [ ] No scoped/paths-filtered workflows for component-level checks.

## Sprint Objective
Close all structural/wiring gaps and achieve a “Green‑Lock” baseline: reproducible installs, deterministic builds, passing CI across all packages, and evidence of security & compliance (SBOM + provenance).

## Swimlanes & Workstreams

### CI/CD & Release
- [ ] Unify Node & pnpm versions via `.nvmrc` + `packageManager` pin; add matrix where needed.
- [ ] Ensure unified CI (build/lint/typecheck/test) and scoped component workflows with `dorny/paths-filter`.
- [ ] Add release automation (release-please) with conventional commits; generate changelogs and tags.

### Security & Supply Chain
- [ ] SBOM generation (CycloneDX) for all workspaces; push as CI artifact and to `artifacts/sbom/`.
- [ ] SLSA provenance (attest-build-provenance) or equivalent; sign images/bundles with cosign.
- [ ] Dependency automation (Renovate) weekly; security audit gate with `npm audit`/`pnpm audit` (allowlist low).

### Policy & Governance
- [ ] OPA/ABAC bundle skeleton; policy tests; CI gate for deny‑by‑default violations.
- [ ] CODEOWNERS routing & branch protections; required checks mapped to swimlanes.

### Observability & Ops
- [ ] Bootstrap Grafana dashboards for CI durations, error rates, and service health; alert thresholds documented.
- [ ] Add health/readiness endpoints and synthetic checks; wire to status page or CI smoke.

### Dev Experience
- [ ] Root Makefile targets: `bootstrap`, `doctor`, `codegen`, `lint`, `test`, `build`, `e2e`, `sbom`.
- [ ] Pre-commit hooks (lint-staged + simple-import-sort); Vitest/Jest types preflight.

### Docs & Runbooks
- [ ] Create `/docs` with Runbook Cards: CI lanes, Security Attestations, Release Process, On‑call cheat sheet.
- [ ] README badges for CI, license, coverage, SBOM, provenance.

## Definition of Done
- All CI lanes are green across all packages; flaky tests quarantined or fixed.
- SBOM + provenance artifacts produced on every main build and attached to releases.
- Policies compile; deny rules tested; CODEOWNERS enforced; branch protections verified.
- Docs updated; “Green‑Lock” checklist checked in and signed off.

## Deliverables
- PRs: CI unification, Release automation, SBOM/Provenance, OPA bundle, Renovate, CODEOWNERS.
- Artifacts: SBOMs, provenance attestations, dashboards JSON, on‑call cheat sheet.
- Docs: Runbook cards, updated CONTRIBUTING and security notes.

## Scaffolds (drop‑in)

```yaml
# .github/workflows/release-please.yml
name: release-please
on:
  push:
    branches: [ main ]
permissions:
  contents: write
  pull-requests: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          package-name: monorepo
```

```yaml
# .github/workflows/sbom.yml
name: sbom
on: [push]
jobs:
  build-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json --output-format json
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

```gitignore
# .gitignore additions
artifacts/
*.sbom.json
*.spdx.json
coverage/
```

```text
# CODEOWNERS (example)
*       @BrianCLong @review-team
/docs/  @docs-team
/apps/  @app-leads
/services/ @platform-leads
```