# Co‑CEO Governance Workstream — Review, Gaps, and Next Sprint (v1)

**Window:** Oct 6–Oct 17, 2025 (Sprint 1 of Q4 cadence)  
**Role:** Co‑CEO (Governance, Cadence, Release Gate, Evidence)  
**Scope:** Maestro Conductor (MC), IntelGraph (IG), Disclosure Packs, Release Hardening, OPA ABAC, Switchboard repo guardrails.

---

## 1) What I Reviewed
- **Repo paths:** `/mc_release_hardening_and_dashboards_bundle/*`, `/companyos-switchboard/*`, multiple sprint docs across IG/MC/Company OS, drift rules, integration patch pack.
- **Workflows:** `release.hardened.yml` (incomplete), `ci.switchboard.yml` (present), dashboards JSON, policies.
- **Sprints:** Q4 cadence lock doc, multiple MC/IG sprint plans, drift detection plan(s).

---

## 2) Key Gaps (My Lane)
| Area | Gap | Impact | Fix (this sprint) |
|---|---|---|---|
| Release Gate | `release.hardened.yml` has placeholders (`...`) and missing SBOM build/verify steps | No enforceable evidence; releases can ship without SBOM/SLSA | Ship **complete** hardened workflow (below) with SBOM + SLSA + verify + attach + policy gate |
| Disclosure Pack | No canonical template wired into CI | Customer trust + audit friction | Add **Disclosure Pack v1** template and CI job to publish on tag |
| Maestro Attestation | No CI step to post run → Maestro with artifact hashes, budgets, rollbacks | Lost provenance chain | Add **`post-to-maestro`** step & sample API spec |
| IntelGraph Decision Log | Decision template exists in prose but not operationalized | Decisions not linkable to claims | Add **Decision.md** scaffolding + pre-commit hook to require Decision on PRs with labels |
| Canary/Rollback | Criteria mentioned but not codified/testable | Risk of slow/unsafe rollbacks | Add **canary policy** (OPA) + **rollback playbook** + canary check script |
| OPA ABAC | Basic rego only; no step‑up auth & data minimization labels | Access drift risk | Add **policy bundle v1** with origin/sensitivity/legal_basis labels & step‑up prompts |
| Switchboard CI | CI present but lacks lint/test/tauri build matrix + SBOM | Quality & supply‑chain blind spots | Expand CI: lint+test, compile, SBOM, produce attestations |
| Dashboards | JSON present, no wiring guide or env vars | Hard to adopt | Add minimal **Grafana import guide** & starter alerts |
| Risk Heatmap | Mentioned; not produced as artifact | Blind spots | Ship Markdown heatmap + owners + mitigations |

---

## 3) My Next Sprint (Oct 6–Oct 17, 2025)
**Sprint Goal:** “Every release carries a verifiable Disclosure Pack with SBOM + SLSA, logged to Maestro & IntelGraph, guarded by OPA.”

### Objectives & Deliverables
1) **Hardened Release CI** — working workflow that builds, SBOMs, signs provenance, verifies, and attaches to GitHub Release.  
   *DoD:* Tag `v0.1.0` produces assets: `sbom.json`, `provenance.intoto.jsonl`, `disclosure-pack.md`.
2) **Disclosure Pack v1** — canonical template auto‑filled from CI.  
   *DoD:* Attached to release + committed to `/releases/v0.1.0/`.
3) **Maestro Link** — CI step posts run with artifact hashes + budget.  
   *DoD:* Run URL stored in release notes; 200 OK.
4) **IntelGraph Decision** — Decision.md required on PRs labeled `release` or `schema-change`.  
   *DoD:* Pre‑commit/PR check fails without Decision block.
5) **OPA Policy Bundle v1** — ABAC with `origin/sensitivity/legal_basis` + step‑up auth prompt policy.  
   *DoD:* Policy tests pass; example queries documented.
6) **Canary/Rollback** — OPA canary policy + script; rollback runbook with criteria.  
   *DoD:* Dry‑run passes on sample metrics JSON.
7) **Switchboard CI upgraded** — test/lint/build matrix + SBOM for web and Tauri.  
   *DoD:* CI green on PR; artifacts uploaded.

### Plan & Owners
- **Owner:** Co‑CEO (you’re reading this).  **Collaborators:** Eng Lead (MC), SecOps, DevEx.  
- **Milestones:**
  - **Oct 8:** release.hardened.yml complete; local dry‑run via `act` docs.  
  - **Oct 11:** Maestro + IG hooks wired; OPA policies and tests green.  
  - **Oct 15:** Canary tests, rollback runbook, dashboards guide shipped.  
  - **Oct 17:** Tag `v0.1.0` demo with full Disclosure Pack.

---

## 4) Artifacts & Scaffolding (Drop‑in)

### 4.1 GitHub Actions — Hardened Release (Node + SBOM + SLSA + Verify + Release)
```yaml
name: release.hardened
on:
  push:
    tags: [ 'v*.*.*' ]
  workflow_dispatch:

permissions:
  contents: write
  id-token: write
  attestations: write

jobs:
  build:
    name: Build & SBOM
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: corepack enable && pnpm -v
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Generate CycloneDX SBOM
        run: |
          npx @cyclonedx/cyclonedx-npm@latest --output-format json --output-file sbom.json
      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json }

  provenance:
    name: SLSA Provenance
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download SBOM
        uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - name: Generate SLSA provenance
        uses: slsa-framework/slsa-github-generator@v2.0.0
        with:
          base64-subjects: ${{ secrets.PROVENANCE_SUBJECT_B64 || '' }}
      - name: Save provenance
        run: |
          echo "$SLSA_PROVENANCE" > provenance.intoto.jsonl
      - name: Upload provenance artifact
        uses: actions/upload-artifact@v4
        with: { name: provenance, path: provenance.intoto.jsonl }

  verify:
    name: Verify Evidence
    needs: [build, provenance]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - name: Basic checks
        run: |
          test -s sbom.json
          test -s provenance.intoto.jsonl
          jq . sbom.json >/dev/null
          jq -r '.[0].predicateType' provenance.intoto.jsonl | grep -qi provenance || exit 1

  disclosure_pack:
    name: Generate Disclosure Pack
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - name: Render disclosure-pack.md
        run: |
          cat .github/templates/disclosure-pack.tmpl.md \
          | sed "s/{{TAG}}/${GITHUB_REF_NAME}/" \
          | sed "s/{{COMMIT}}/${GITHUB_SHA}/" \
          > disclosure-pack.md
      - name: Upload disclosure pack
        uses: actions/upload-artifact@v4
        with: { name: disclosure, path: disclosure-pack.md }

  release:
    name: GitHub Release with Evidence
    needs: [verify, disclosure_pack]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - uses: actions/download-artifact@v4
        with: { name: disclosure, path: . }
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }} (Hardened)
          body_path: disclosure-pack.md
          files: |
            sbom.json
            provenance.intoto.jsonl
            disclosure-pack.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Place at:** `/mc_release_hardening_and_dashboards_bundle/.github/workflows/release.hardened.yml`

---

### 4.2 Disclosure Pack v1 (Template)
**Path:** `.github/templates/disclosure-pack.tmpl.md`
```md
# Disclosure Pack — {{TAG}}

**Commit:** {{COMMIT}}

## Evidence
- SBOM: `sbom.json`
- Provenance: `provenance.intoto.jsonl`
- Maestro Run: (URL)
- IntelGraph Decision(s): (IDs)

## Risk & Rollback
- Canary slice & success criteria
- Auto‑rollback triggers
- Residual risks & compensating controls

## Changes
- Summary of features
- Schema & policy changes

## Compliance & Data Handling
- Policy labels: origin, sensitivity, legal_basis
- DPA/DPIA: (if applicable)
```

---

### 4.3 Maestro Post Hook (CI step snippet)
```bash
# .github/scripts/post_to_maestro.sh
set -euo pipefail
ARTIFACT_SHA=$(sha256sum sbom.json | awk '{print $1}')
PAYLOAD=$(jq -n \
  --arg tag "$GITHUB_REF_NAME" \
  --arg commit "$GITHUB_SHA" \
  --arg sha "$ARTIFACT_SHA" \
  '{tag:$tag, commit:$commit, artifacts:[{type:"sbom", sha256:$sha}]}' )

curl -sS -X POST "$MAESTRO_URL/api/runs" \
  -H "Authorization: Bearer $MAESTRO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD"
```

Add to workflow after `verify` and before `release`.

---

### 4.4 IntelGraph Decision Template + PR Guard
**Path:** `.github/decision/Decision.md`
```md
# Decision
**Context**:
**Options**:
**Decision**:
**Reversible?**: yes/no
**Risks**:
**Owners**:
**Checks**:
**IntelGraph IDs**:
```

**Pre‑commit/CI check (simplified):**
```bash
# .github/scripts/check_decision.sh
set -euo pipefail
if [[ "$PR_LABELS" == *"release"* || "$PR_LABELS" == *"schema-change"* ]]; then
  test -s .github/decision/Decision.md || { echo "Missing Decision.md"; exit 1; }
fi
```

---

### 4.5 OPA ABAC Policy Bundle v1 (Step‑Up + Labels)
**Path:** `/companyos-switchboard/policies/policy.bundle.rego`
```rego
package access

default allow = false

input.user.roles := roles
input.resource := res

# Step‑up required for sensitive actions
step_up_required { res.sensitivity == "high"; not input.mfa_passed }

# ABAC: origin/sensitivity/legal_basis
allow {
  some r
  r := res
  r.origin == input.context.origin
  r.legal_basis in input.user.legal_bases
  (r.sensitivity == "low" ; input.user.role in roles)
}
```

**Policy Test (example):**
```bash
opa test policies/ -v
```

---

### 4.6 Canary Policy + Rollback Playbook
**Canary policy (OPA):** `policies/canary.rego`
```rego
package canary

# success if error_rate<=X and latency_p95<=Y and cost_req<=Z
success { input.error_rate <= input.budget.error_rate
          input.latency_p95 <= input.budget.latency_p95
          input.cost_per_req <= input.budget.cost_per_req }
```

**Check script:** `scripts/canary_check.sh`
```bash
jq -e '. as $m | ($m|has("error_rate") and $m|has("latency_p95") and $m|has("cost_per_req"))' metrics.json
opa eval -I -d policies/canary.rego \
  --input <(jq '{error_rate, latency_p95, cost_per_req, budget:{error_rate: .budget.error_rate, latency_p95: .budget.latency_p95, cost_per_req: .budget.cost_per_req}}' metrics.json) \
  'data.canary.success'
```

**Rollback runbook (excerpt):**
1) Auto‑rollback when any criterion fails 2x window.
2) Freeze window respected; notify oncall; attach Maestro run link.
3) Record Decision.md (rollback) + update Disclosure Pack.

---

### 4.7 Switchboard CI Upgrade (matrix + SBOM)
**Path:** `/companyos-switchboard/.github/workflows/ci.switchboard.yml` (extend)
```yaml
jobs:
  build_test:
    runs-on: ubuntu-latest
    strategy: { matrix: { node: [18, 20] } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }}, cache: 'pnpm' }
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: pnpm lint && pnpm test -- --ci
      - run: pnpm build
      - run: npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json }
```

---

### 4.8 Grafana Dashboards — Quick Wire Guide
1) Import JSONs under `mc_release_hardening_and_dashboards_bundle/dashboards/*`  
2) Create folder "Release & CI Health"  
3) Add alerts: flaky test rate > 3% (7‑day), PR median time > 24h, CI failure > 10% daily

---

## 5) Definitions of Done (DoD)
- Evidence attached to any tagged release (SBOM + SLSA + Disclosure Pack).
- Maestro run created and linked; IntelGraph Decision created for release PRs.
- OPA policies tested; canary script passes sample; rollback playbook approved.
- Switchboard CI runs lint/test/build and uploads SBOM.
- Dashboards live; alerts configured; owners on Risk Heatmap.

---

## 6) Risk Heatmap (Q4 Start)
| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Evidence gaps in releases | Med | High | DevEx | Hardened CI + gates |
| Access drift | Med | Med | SecOps | OPA ABAC v1 + tests |
| Canary false‑negatives | Low | High | SRE | Tighten thresholds + double‑window rule |
| Disclosure inconsistency | Med | Med | PM | Template + CI render |

---

## 7) Change Log (this workstream)
- v1 (2025‑09‑30): Initial review, gaps, sprint plan, and scaffolding.

---

## 8) Hand‑Off Notes
- All artifacts are copy‑paste ready.  
- Prioritize wiring secrets: `MAESTRO_URL`, `MAESTRO_TOKEN`, optional `PROVENANCE_SUBJECT_B64`.  
- Align tag calendar with Q4 cadence doc; first demo tag `v0.1.0`.

