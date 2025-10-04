# Product Requirements Document (PRD) Pack — Wave 4
Scope: Everything referenced in the October files and other docs that wasn’t fully built in Waves 1–3: release gating, SBOM/provenance, k6 synthetics, WebAuthn step‑up + DLP, air‑gap kit, governance (IGAC), release hardening dashboards, golden‑path E2E CI, security scans/SARIF, red‑team prompts archive, Switchboard app, Makefile bundles, enablement, and SOW templates. Includes API examples, GitHub Actions, OPA policies, k6 scripts, dashboard JSON, and checklists.

Included PRDs & Packs (15):
1) IG‑REL‑R1 — OPA Release Gate & Policy Simulation (Fail‑Closed)
2) IG‑REL‑R2 — SBOM & Provenance‑Attached Releases (SCITT‑style)
3) IG‑SEC‑S1 — Security Scans & SARIF Waiver Workflow
4) IG‑SEC‑S2 — WebAuthn Step‑Up + DLP Policies on Risky Routes
5) IG‑OPS‑SYN — Synthetics & k6 Thresholds (PR + Nightly)
6) IG‑OPS‑GPE — Golden‑Path E2E CI Job with Proof Artifacts
7) IG‑OPS‑AIR — Air‑Gap Deployment Kit v1 (Dry‑Run Verified)
8) IG‑GOV‑IGAC — IntelGraph Access Council (IGAC) Governance & Sign‑Off
9) IG‑REL‑DASH — Release Hardening Dashboards (Grafana/Prom UIDs)
10) IG‑COP‑RTA — Red‑Team Prompts Archive & Guardrail Playbook
11) IG‑APP‑SWB — CompanyOS "Switchboard" (Desktop/Web) UI Shell
12) IG‑OPS‑MKF — Makefile + Templates Bundle (Release/Docs)
13) IG‑DOC‑PK — Docs & Training Enablement Pack (Analyst Assist v0.2)
14) IG‑BIZ‑SOW — Pilot Statement‑of‑Work Templates & Acceptance Gates
15) IG‑OPS‑AQA — Air‑Quality/Poisoning Sentinels (Data Health)

> Structure: Summary, Problem, Users & Jobs, Requirements (Must/Should/Could), NFRs, Architecture & APIs, Telemetry, Security & Compliance, Success Metrics, Rollout & Risks. Appendices: code/policy examples.

---
## 1) PRD — IG‑REL‑R1 OPA Release Gate & Policy Simulation
**Summary**: PR gate enforced by OPA; policies simulate in report‑only mode then flip to enforce. KPI: 100% releases pass gate; false‑block rate <0.5%.

**Requirements**
- **Must**: GitHub/CI integration; policy packs (repo, privacy, flow); simulation diff; fail‑closed on default branch; audit receipts.
- **Should**: PR annotation with reasons; policy pack versioning; owner overrides (dual‑control).
- **Could**: policy learning from historical passes.

**NFRs**: eval p95 < 3s per PR; 99.99% availability.

**APIs**: `POST /gate/eval` (bundleSHA, checks); `GET /gate/audit/{runId}`.

**Appendix — Rego Sketch**
```rego
package release.gate

deny[msg] {
  input.sbom.critical_vulns > 0
  msg := "Critical vulns present"
}
```

---
## 2) PRD — IG‑REL‑R2 SBOM & Provenance‑Attached Releases
**Summary**: Every release tag ships with SBOM, hashes, provenance manifest, and verifier CLI. KPI: 100% release assets verified.

**Requirements**
- **Must**: SBOM (SPDX/CycloneDX); provenance manifest; hash notes; verifier CLI; Git tag pinning of policy SHAs.
- **Should**: SBOM diff in PR; license report.
- **Could**: transparency log submission.

**Appendix — Release Notes Template**
```md
## Evidence
- SBOM: path
- Prov‑Manifest: path (sha256:...)
- Policies: repo@sha
```

---
## 3) PRD — IG‑SEC‑S1 Security Scans & SARIF Waiver Workflow
**Summary**: Pipeline of SAST/DAST/dep scans with SARIF uploads; waivers tracked with expiry and approvals.

**Requirements**
- **Must**: scanners → SARIF; waiver records (owner, reason, expiry); dashboard; alerts; 0 critical vulns; auto‑fail on expired waivers.
- **Should**: suggested fixes; PR bots.

**APIs**: `POST /waivers`; `GET /vulns`.

**Appendix — GitHub Actions Snippet**
```yaml
- uses: github/codeql-action/analyze@v3
- uses: github/upload-sarif@v2
  with: { sarif_file: results.sarif }
```

---
## 4) PRD — IG‑SEC‑S2 WebAuthn Step‑Up + DLP Policies
**Summary**: Step‑up authentication before sensitive actions, with contextual DLP (copy/export blocks) and audit evidence.

**Requirements**
- **Must**: WebAuthn challenge; risk routes registry; DLP rules (copy/export/print); reason‑for‑access; audit entries.
- **Should**: session cache for step‑up; device attestation.

**NFRs**: step‑up p95 < 800ms.

**Appendix — UI Flow**: action→policy check→step‑up prompt→allow/deny with reason.

---
## 5) PRD — IG‑OPS‑SYN Synthetics & k6 Thresholds
**Summary**: PR + nightly synthetics with k6 scripts and Grafana panels; thresholds enforced.

**Requirements**
- **Must**: golden user flows; k6 scripts; thresholds; CI gate; dashboards.
- **Should**: flaky test tracker.

**Appendix — k6 Template**
```js
import http from 'k6/http';
export let options = { thresholds: { http_req_duration: ['p(95)<800'] }};
export default function () { http.get('https://app/health'); }
```

---
## 6) PRD — IG‑OPS‑GPE Golden‑Path E2E CI Job
**Summary**: Deterministic E2E covering create→ingest→analyze→report with proof artifacts.

**Requirements**
- **Must**: seed data; headless UI run; artifact export; manifest attach; failure triage; flake quarantine.

**NFRs**: runtime < 12m; flake < 1%.

---
## 7) PRD — IG‑OPS‑AIR Air‑Gap Deployment Kit v1
**Summary**: Offline bundle with checksums, reproducible build notes, and dry‑run transcript.

**Requirements**
- **Must**: artifacts mirror; checksum manifest; install script; air‑gap playbook; dry‑run transcript; emergency patch path.

**Appendix — Checklist**
- Verify checksums
- Run install in sandbox
- Capture transcript & hashes

---
## 8) PRD — IG‑GOV‑IGAC Governance Council
**Summary**: IGAC process for sign‑off on releases and policies; policy SHAs pinned.

**Requirements**
- **Must**: meeting templates; quorum; sign‑off records; dissent capture (CDC hooks); calendar & SLAs.

**Success**: 100% releases signed; dissent resolved < 7 days.

---
## 9) PRD — IG‑REL‑DASH Release Hardening Dashboards
**Summary**: Grafana dashboards for CI health, PR health, flaky tests; UIDs versioned.

**Requirements**
- **Must**: dashboards JSON; UID registry; alerts; ownership.

**Appendix — Dashboard Index**
- `ci_overview.json`
- `pr_health.json`
- `flaky_tests.json`

---
## 10) PRD — IG‑COP‑RTA Red‑Team Prompts Archive
**Summary**: Curated adversarial prompts, outcomes, and mitigations; guardrail tests in CI.

**Requirements**
- **Must**: prompt sets; expected blocks; trace store; CI job; regression tracker.

---
## 11) PRD — IG‑APP‑SWB CompanyOS Switchboard UI Shell
**Summary**: Desktop/Web shell for quick actions, dashboards, and command palette.

**Requirements**
- **Must**: Next.js/Tauri app; Switchboard component; command palette; status tiles; deep links; auth handoff.
- **Should**: plugin slots; offline cache.

**NFRs**: TTFI < 2s; p95 action < 150ms.

---
## 12) PRD — IG‑OPS‑MKF Makefile + Templates Bundle
**Summary**: One‑command targets for release, docs, verify, air‑gap build; templates for rollouts.

**Requirements**
- **Must**: `make release`, `make docs`, `make verify`, `make airgap`; templated notes; owner fields.

---
## 13) PRD — IG‑DOC‑PK Docs & Training Enablement Pack
**Summary**: Analyst Assist v0.2 docs, exemplars, quick‑starts, and video scripts.

**Requirements**
- **Must**: quick‑starts; exemplar notebooks; glossary; video scripts; a11y.

---
## 14) PRD — IG‑BIZ‑SOW Pilot SOW Templates
**Summary**: Contract templates with acceptance gates tied to PCQ, governance, and SLOs.

**Requirements**
- **Must**: scope; milestones; acceptance tests; deliverables; evidence manifests.

---
## 15) PRD — IG‑OPS‑AQA Air‑Quality/Poisoning Sentinels
**Summary**: Data health monitors for ingest streams and models (poison/quality/anomaly).

**Requirements**
- **Must**: sentinel library; thresholds; quarantine; provenance links; alerting.

---
# Global Sections
**Security & Compliance**: SBOM, encryption, ABAC/OPA, DPIA, legal hold, export manifests.

**Telemetry & Analytics**: adoption, task‑time, block reasons, gate pass/fail trends, cost.

**Rollout**: feature flags; shadow; report‑only → enforce; enablement; partner pilots.

**Risks**: policy drift; false blocks; pipeline flakes; offline failures; mitigations provided.

---
# Appendices (Executable Assets)

## A) GitHub Actions — Release Gate
```yaml
name: release-gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run OPA
        run: |
          npm ci && npm run gate
      - name: Upload evidence
        uses: actions/upload-artifact@v4
        with: {name: evidence, path: evidence/**}
```

## B) OPA Policies (Rego) — Repo/Privacy/Flow (sketch)
```rego
package repo

deny[msg] {
  input.changes[file] == "secrets.env"
  msg := "Secret in repo"
}
```

## C) SBOM & Provenance Manifest (JSON Sketch)
```json
{"artifacts":[{"name":"api","sha256":"..."}],"sbom":"spdx.json","policies":{"repo":"sha","privacy":"sha"}}
```

## D) k6 Script — Golden Flow Skeleton
```js
export let options={vus:10,duration:'2m',thresholds:{http_req_duration:['p(95)<800']}};
```

## E) Air‑Gap Checklist
- Build reproducible images
- Mirror registries
- Produce checksums + transcript

## F) Grafana Dashboard UID Registry
```json
{"dashboards":[{"name":"CI Overview","uid":"ci-ovw-202510"}]}
```

## G) WebAuthn API (Sketch)
```http
POST /webauthn/challenge
POST /webauthn/verify
```

## H) SOW Template Outline
- Objectives; Deliverables; Evidence; SLOs; Acceptance; Runbooks; Support.

