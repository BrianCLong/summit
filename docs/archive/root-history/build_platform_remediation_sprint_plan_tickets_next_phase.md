# IntelGraph Build Platform Remediation — Sprint Plan (Next Phase)

> Scope: Execute the next wave after the “highest-priority” hotfixes. This plan turns remaining **Should** items into actionable epics/stories/tasks with owners, AC/verification, code snippets, and rollout/rollback.

---

## 0) Conductor Snapshot

**Assumptions:** Highest‑priority items from prior ticket are merged to `main` (root build fix, Node 20, Python hardening on 2 services, Trivy blocking, Helm digest pins, Cosign attest+verify).  
**Goal (this phase):** Eliminate drift, tighten policy guards, and raise build/test signal quality while keeping developer UX high.  
**Timebox:** 1 sprint.  
**SLO/Cost Guardrails:** No increase in CI time > +15%; keep build green with p95 job duration ≤ prior baseline +15%.

---

## 1) Backlog — Epics → Stories → Tasks (MoSCoW, Owners, Estimates)

### Epic A — Type Safety & Coverage Gates (SHOULD)

- **Story A1:** Enforce repo‑wide type checks on changed packages only.
  - Tasks:
    - Add CI job `typecheck_smart`: `turbo run typecheck --filter=...[origin/main] --since` (Owner: Build, 2h)
    - Fail on TS errors; artifact logs persisted (Owner: Build, 1h)
  - **AC:** PRs with TS errors fail; unaffected packages are skipped.
  - **Verify:** Seed PR with an intentional TS error → red; remove → green.

- **Story A2:** Coverage thresholds & changed‑files focus
  - Tasks:
    - Configure Jest: global thresholds lines/branches `80/75`, plus changed‑lines via `--coverageProvider=v8` (Owner: App Eng, 3h)
    - CI job `test_cov`: upload coverage summary; fail < thresholds (Owner: Build, 1h)
  - **AC:** PR fails when thresholds unmet; report visible in Checks.
  - **Verify:** Seed PR with missing tests → red; add minimal test → green.

### Epic B — Policy & Supply Chain (SHOULD)

- **Story B1:** Block mutable image tags in charts
  - Tasks:
    - Add policy check script `tools/policy/check-helm-digests.ts` (Owner: Platform, 3h)
    - Add OPA/Rego rule in CI (Owner: Sec, 3h)
  - **AC:** CI fails if any `image.tag` non‑empty or digest missing.
  - **Verify:** Seed PR changing `tag: latest` → red.

- **Story B2:** Dependabot/Renovate hygiene
  - Tasks:
    - Enable updates for `pnpm`, GitHub Actions, Docker, Python (pip) (Owner: Sec CI, 2h)
    - Add automerge for dev‑deps; hold for prod deps (Owner: Sec CI, 1h)
  - **AC:** Weekly PRs open with grouped bumps; SBOM refresh runs.
  - **Verify:** Force a dependency bump cycle; observe.

### Epic C — Dev/Prod Parity & Drift (COULD → Pilot)

- **Story C1:** Compose ↔ Helm single source pilot
  - Tasks:
    - Create `values.dev.yaml`; ensure all env/ports mapped (Owner: Platform, 4h)
    - Add script to render Helm → K8s YAML; optional compose converter (Owner: Platform, 4h)
  - **AC:** Local dev uses the same images/env as charts; doc added.
  - **Verify:** Compare env diffs → zero drift on pilot service(s).

### Epic D — Terraform & Cloud Policy (SHOULD)

- **Story D1:** Backend hardening
  - Tasks:
    - Ensure S3 backend has versioning + SSE‑KMS; add DynamoDB lock table (Owner: Cloud, 3h)
    - Add `tfsec` + `checkov` and `terraform plan -detailed-exitcode` on PR (Owner: Cloud, 2h)
  - **AC:** Plans run on PR; policy violations fail; state protected.
  - **Verify:** Seed a rule violation → red; fix → green.

### Epic E — Frontend Performance Budgets (SHOULD)

- **Story E1:** Lighthouse CI budgets for web apps
  - Tasks:
    - Add `lighthouserc.json` budgets (JS ≤ 300KB, CSS ≤ 120KB, LCP ≤ 2.5s on CI env) (Owner: Frontend, 3h)
    - CI job with `treosh/lighthouse-ci-action` against PR preview (Owner: Build, 2h)
  - **AC:** Budgets enforced; regression fails PR.
  - **Verify:** Add dummy bundle bloat → red; revert → green.

### Epic F — Rollout of Python Container Baseline (COULD → Rolling)

- **Story F1:** Convert next 4 Python services to non‑root template
  - Tasks:
    - Apply Dockerfile template; add `.dockerignore`; `pip --require-hashes` (Owner: App Eng, 1d)
    - CI Trivy pass; SBOM attach (Owner: Sec, 1h)
  - **AC:** 4 more services hardened; images pass scanners.
  - **Verify:** Trivy HIGH/CRITICAL = 0 (or documented exceptions).

**Risk Tags:** `perf-regress`, `policy-break`, `developer-ux`, `timebox`  
**Dependencies:** Epic B1 before Helm deploys; Epic A before changing coverage thresholds repo‑wide.

---

## 2) RACI (by role)

- **Responsible:** Build (A1,A2), Platform (B1,C1), Cloud (D1), Frontend (E1), App Eng (F1)
- **Accountable:** Platform Lead
- **Consulted:** Security, SRE, QA
- **Informed:** Product, Compliance

---

## 3) Ticket Templates (copy/paste to GitHub)

### Template: Policy — Block mutable image tags

```md
**Title:** Block mutable image tags in Helm (digest‑only)

**Why:** Prevents image drift & supply‑chain risk; enforces provenance alignment.

**What:**

- Add `tools/policy/check-helm-digests.ts`
- Add OPA rule `policy/helm_digest.rego`
- Wire to CI (PR block)

**AC:**

- [ ] CI fails when `image.tag` not empty
- [ ] CI fails when `image.digest` missing
- [ ] Docs updated in `charts/README.md`

**Verification:** Seed PR with `tag: latest` → CI red; fix → green.
```

### Template: CI — Smart typecheck & coverage

```md
**Title:** Smart typecheck & coverage thresholds on changed packages

**Why:** Faster signal; fewer flaky full‑repo runs.

**What:**

- `turbo run typecheck --filter=...[origin/main] --since`
- Jest thresholds lines≥80 branches≥75; changed‑files focus

**AC:**

- [ ] Type errors block PR
- [ ] Coverage report uploaded; failures block < thresholds

**Verification:** Seed failing TS + missing tests → red; remediate → green.
```

### Template: Terraform hardening

```md
**Title:** Harden Terraform backend + add tfsec/checkov

**What:**

- S3 versioning + SSE‑KMS; DynamoDB lock
- PR plan; tfsec + checkov gates

**AC:**

- [ ] Backend secured
- [ ] PR plans visible; policy violations block

**Verification:** Introduce failing rule; CI blocks; fix; CI passes.
```

---

## 4) Snippets — CI Workflows & Policies

### 4.1 CI: Smart Typecheck & Coverage

```yaml
# .github/workflows/ci-typecheck-coverage.yml
name: typecheck-coverage
on: [pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && corepack prepare pnpm@latest --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run typecheck --filter=...[origin/main] --since
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && corepack prepare pnpm@latest --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test -- --coverage --coverageReporters=text-summary
```

### 4.2 CI: Helm Digest Enforcement

```yaml
# .github/workflows/policy-helm-digest.yml
name: policy-helm-digest
on: [pull_request]
jobs:
  check-digests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify no mutable tags in charts
        run: node tools/policy/check-helm-digests.js
```

### 4.3 Script: check-helm-digests.js

```js
// tools/policy/check-helm-digests.js
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

const chartPaths = walk('charts').filter((p) => p.endsWith('values.yaml'));
let failed = false;
for (const p of chartPaths) {
  const doc = YAML.parse(fs.readFileSync(p, 'utf8')) || {};
  const img = doc.image || {};
  const tag = (img.tag || '').trim();
  const digest = (img.digest || '').trim();
  if (tag) {
    console.error(`[FAIL] ${p}: image.tag must be empty (found: ${tag})`);
    failed = true;
  }
  if (!digest) {
    console.error(`[FAIL] ${p}: image.digest sha256 is required`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
```

### 4.4 OPA/Rego: deny mutable tags

```rego
# policy/helm_digest.rego
package helm.image

deny[msg] {
  input.image.tag != ""
  msg := sprintf("image.tag must be empty, found: %v", [input.image.tag])
}

deny[msg] {
  not startswith(input.image.digest, "sha256:")
  msg := "image.digest must be sha256:..."
}
```

### 4.5 Terraform CI gate

```yaml
# .github/workflows/terraform-validate.yml
name: terraform-validate
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform -chdir=infra/terraform init -backend=false
      - run: terraform -chdir=infra/terraform validate
      - uses: aquasecurity/tfsec-action@v1.0.3
        with: { working_directory: infra/terraform }
      - uses: bridgecrewio/checkov-action@v12
        with: { directory: infra/terraform }
```

---

## 5) Dev/Prod Parity — Values & Compose (pilot)

**values.dev.yaml (example)**

```yaml
image:
  repository: ghcr.io/brianclong/svc
  digest: sha256:DEADBEEF
env:
  NODE_ENV: development
  LOG_LEVEL: debug
ports:
  http: 8080
```

**Doc:** `docs/dev-parity.md` — how to render K8s YAML for dev, mapping to compose as needed; note that image digests in dev can be locally built and tagged with a temporary digest, never `latest`.

---

## 6) Rollout & Rollback

- **Rollout order:** B1 → A1 → A2 → D1 → E1 → C1 → F1.
- **Rollback:**
  - Policy failures: temporarily allowlist the path under `policy/allowlist.json` (time‑boxed 7 days) with owner + issue link.
  - Terraform: revert via `terraform apply` to last known good plan; state protected by versioning.
  - Coverage/typecheck: gate can be set to “warn” for first 48h via CI input `soft_fail=true`.

---

## 7) Evidence & Reporting

- CI artifacts:
  - Typecheck logs, coverage summary, policy check logs, tfsec/checkov reports, Lighthouse HTML.
- Weekly snapshot in Release Notes:
  - % packages covered by typecheck, coverage % trend, # of policy violations prevented, CI duration delta vs baseline.

---

## 8) Communications

- Daily Slack standup thread `#build-platform`: post CI gate incidents & fixes.
- End‑of‑sprint demo: show a PR prevented by policy (mutable tag) and a perf regression caught by Lighthouse.

---

## 9) Ready-to-Create Issues (one‑liner)

1. **CI:** Add smart typecheck job with Turbo `--since` (A1)
2. **CI:** Enforce coverage thresholds & upload report (A2)
3. **Policy:** Helm digest enforcement script + OPA rule (B1)
4. **Bots:** Dependabot/Renovate for pnpm, pip, actions, docker (B2)
5. **TF:** Backend hardening + tfsec/checkov (D1)
6. **FE:** Lighthouse CI budgets on PR previews (E1)
7. **Containers:** Convert 4 Python services to hardened template (F1)

> After this sprint, we’ll graduate C1 (Compose↔Helm parity) from pilot to standard and expand F1 to remaining Python services.
