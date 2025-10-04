# Topicality — AGGRESSIVE Gap‑Closing Sprint

**Window:** Oct 2 → Oct 16, 2025 (10 working days)\
**Mission:** Close the most material gaps blocking reliability, release velocity, and provenance coverage **without duplicating** in‑flight work. We will **finish and harden** currently open threads, enforce the Golden Path, and ship proof.

---

## 0) North Star & Hard Gates

- **North Star:** “Number of provable decisions customers trust because of our provenance.”
- **Sprint‑end hard gates (must be true to call sprint DONE):**
  1. **Maestro CI red → green** with zero failing pipelines for 48h; flaky tests quarantined behind policy switch; merge queue stabilized.
  2. **Release Gate** enforced on all deployable artifacts: SBOM + SLSA provenance attached; disclosure pack generator wired.
  3. **Golden Path ‘make up && make smoke’** succeeds on a clean machine and in CI; Onboarding doc reflects reality.
  4. **GA canary v26** tracked with dashboards + auto rollback criteria; post‑cutover mini‑chaos drill executed with report.

---

## 1) Scope & Non‑Duplication

We **do not create new tickets** duplicating these open threads. We **own them to closure** and add sub‑tasks only where missing:

- **DevEx:** tune merge‑queue batch size & concurrency.
- **Ops:** document/verify migration enablement gates.
- **QA:** quarantine flaky tests per policy.
- **Reliability/Release:** post‑cutover mini‑chaos drill (T+24h), GA micro‑canary tracker (v26), Maestro build failures (multiple pipeline runs), PR dashboards (multi‑wave).

> We will reference/attach to the existing issues and close them; any new work items created must link to those as sub‑tasks.

---

## 2) Workstreams, Stories, and Definitions of Done (DoD)

### A) Maestro CI Stabilization (Owner: **Dev Infra Lead**)

**Goal:** 0 red CI within 48h; regression guardrails in place.

- **A1. Triage & Templatize CI failures**\
  *DoD:* Root‑cause doc per failing pipeline, fix merged, test added; “CI Failure Playbook” checked into `RUNBOOKS/`.
- **A2. Quarantine policy for flaky tests**\
  *DoD:* Flaky tests auto‑labeled → routed to quarantine list; CI treats quarantined as informational, with weekly burn‑down.
- **A3. Merge‑queue tuning**\
  *DoD:* Concurrency & batch size set; queue metrics (wait time, batch success rate) added to PR dashboard.
- **A4. Re‑green historical failures**\
  *DoD:* All Maestro pipeline #159–#162 and #131–#132 have green re‑runs with artifact evidence.

### B) Release Ops & Chaos (Owner: **SRE Lead**)

**Goal:** Canary confidence ↑, MTTR ↓, auto‑rollback proven.

- **B1. GA Micro‑Canary v26 tracker**\
  *DoD:* Dashboard + alerts; canary slice + success criteria codified; rollback auto‑triggers on SLO breach.
- **B2. Post‑cutover mini‑chaos drill (prod)**\
  *DoD:* 30‑min fault injection on low‑blast‑radius components; writeup with impact, detection, rollback timing, lessons.
- **B3. Migration enablement gates**\
  *DoD:* Documented gates + toggles; change calendar + freeze windows respected; sign‑off check in pipeline.

### C) Golden Path & Onboarding (Owner: **Platform PM**)

**Goal:** Any new dev can ship a demo in <60 minutes.

- **C1. Makefile golden path hardening** (`make bootstrap`, `make up`, `make smoke`)\
  *DoD:* Runs clean on fresh Mac & Linux runners; smoke test proves API + frontend + Neo4j connectivity.
- **C2. ONBOARDING.md reality pass**\
  *DoD:* Ports, versions, and steps match current compose; screenshots updated; drift check in CI.

### D) Provenance & Disclosure (Owner: **Compliance/DevSecOps**)

**Goal:** 100% provenance manifest coverage on release artifacts.

- **D1. Release Gate enforcement**\
  *DoD:* SBOM (syft) + SLSA (cosign/attest) generated in CI; artifacts blocked without both; exceptions require step‑up approval.
- **D2. Disclosure Pack generator**\
  *DoD:* One command outputs the disclosure bundle (claims ledger + sources + hashes + SBOM + SLSA + rollback plan); linked from Releases.

### E) PR Dashboards & Observability (Owner: **Analytics Eng**)

**Goal:** Make work visible; reduce review latency.

- **E1. PR Dashboard Wave 1**\
  *DoD:* Live board: queue depth, aged PRs, reviewer SLA, flakiness rate, CI success by branch.
- **E2. Wave 2**\
  *DoD:* Merge‑queue efficiency, canary outcomes, change failure rate (DORA), p95 latency SLO overlays.

---

## 3) Plan — Day‑by‑Day (10 Business Days)

**D0 (Kickoff — Today):**

- Lock sprint scope; assign owners; convert missing tasks into sub‑tasks under existing issues.
- Freeze non‑critical merges until CI is green or behind feature flags.

**D1–D2:**

- A1 triage & fixes for CI; C1 golden path smoke green on CI runners; B1 canary dashboard scaffold.

**D3–D4:**

- A2 flaky quarantine wiring; A3 merge‑queue tuning; D1 release gate wired in dry‑run; C2 onboarding reality pass.

**D5:**

- B2 mini‑chaos drill executed during low‑risk window; publish incident‑style report; D2 disclosure pack generator MVP.

**D6–D7:**

- Re‑run/redress Maestro historical builds; E1 PR dashboard Wave 1 live; B3 migration gates doc + approvals.

**D8–D9:**

- E2 dashboards; D1 enforcement switched from warn→block; system‑wide audit for provenance coverage.

**D10 (Close):**

- 48h green CI evidence; release v26 canary post‑mortem; sprint review + retro; convert residuals into next sprint.

---

## 4) Success Metrics

- **CI health:** 0 failing pipelines for 48h; <1% flaky rate; merge‑queue wait time p50 < 15m.
- **Change failure rate:** ≤ 10%; **MTTR:** < 30m during drill; auto‑rollback verified.
- **Time‑to‑first‑value:** New dev up in ≤ 60m; demo path verified end‑to‑end.
- **Provenance coverage:** 100% of release artifacts with SBOM + SLSA + disclosure pack.
- **Review latency:** p50 < 4h; aged PRs (> 3 days) reduced by 75%.

---

## 5) Risks & Mitigations

- **Hidden CI infra drift** → Mitigate with container‑locked runners; snapshot images used in CI.
- **Flaky test masking bugs** → Quarantine with owner + SLA; weekly burn‑down; do not mute without ticket.
- **Canary false positives** → Tune thresholds using historical SLOs; require manual confirm before full rollback in week 1.
- **Provenance perf cost** → Cache SBOM layers; parallelize attestations; measure CI cost delta.

---

## 6) Owners & Cadence

- **Daily (15‑min) standup:** Blockers, plan, evidence links.
- **Twice‑weekly exec sync:** Risk heat + decision memo review.
- **Owners** (fill in): Dev Infra Lead, SRE Lead, Platform PM, Compliance/DevSecOps, Analytics Eng.

---

## 7) Deliverables (Artifacts)

- CI Failure Playbook (`RUNBOOKS/ci-failures.md`)
- Chaos Drill Report (`artifacts/chaos/<date>/report.md`)
- Onboarding update (`docs/ONBOARDING.md` + screenshots)
- Release Gate pipeline (`.maestro/` + policy in `governance/`)
- Disclosure Pack generator (`tools/disclosure-pack/` CLI)
- PR Dashboards (`grafana/dashboards/pr-*.json`) and README

---

## 8) Exit Criteria Check (to run on D10)

-

> **Cheer:** B‑E aggressive! B‑E A‑G‑G R‑E‑S‑S‑I‑V‑E! Let’s ship proof, not promises.



---

## 9) Execution Orders (EO) — Do These Now

> Concrete, non‑duplicative steps mapped to existing threads. Use as sub‑tasks under current issues; **do not open parallel parent tickets.**

**EO‑001 — Freeze & Green the Pipes (Today 10:00–14:00 MT)**

- Temporarily pause non‑flagged merges while CI goes green.
- Enable/update branch protections: required checks = `build`, `test`, `lint`, `release-gate`.
- Set merge‑queue batch size=2, max concurrency=1 until pass rate > 95% for 24h.
- Evidence: screenshot of queue metrics + `gh run list --limit 50 --json status,conclusion` export attached to issue.

**EO‑002 — CI Failure Intake (D1)**

- Runbook: `RUNBOOKS/ci-failures.md` (create if missing).
- Script (drop under `.ci/tools/ci-intake.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
owner="${1:-BrianCLong/summit}"
# Recent red workflows → CSV for triage
gh run list --repo "$owner" --limit 200 --json databaseId,name,workflowName,conclusion,headBranch,headSha,updatedAt \
  | jq -r '.[] | select(.conclusion=="failure" or .conclusion=="cancelled") | [.databaseId,.workflowName,.headBranch,.headSha,.updatedAt] | @csv' \
  > .evidence/ci/last200_failures.csv
```

- DoD: CSV committed; each failing workflow has a root‑cause note or linked fix PR.

**EO‑003 — Flaky Test Quarantine (D2)**

- Create label: `flaky-test` and policy doc `RUNBOOKS/flaky-policy.md`.
- Add quarantine list `.ci/flaky-tests.txt`; CI step marks tests as skipped when listed.
- Weekly burn‑down: create Project view “Flaky Burn‑down” filtered by label.

**EO‑004 — Merge‑Queue Tuning (D3)**

- Start: batch=2, concurrency=1. If 3 consecutive batches pass → batch=3, concurrency=2.
- Add metrics to PR dashboard: p50 wait, batch failure rate, retries.

**EO‑005 — Release Gate (Warn→Block) (D3→D8)**

- New job `release-gate` in CI:

```yaml
# .github/workflows/release-gate.yml
name: release-gate
on: [push]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build artifact
        run: make build   # ensure this emits dist/ or image tag
      - name: SBOM (syft)
        uses: anchore/sbom-action@v0
        with: { path: ".", format: "spdx-json", output-file: "sbom.spdx.json" }
      - name: Sign & Attest (cosign)
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign version
          cosign generate-key-pair k8s://summit/ci || true
          cosign attest --predicate sbom.spdx.json --type spdx ./dist/*.tar || true
      - name: Policy Check
        run: ./governance/policy/release_gate.sh sbom.spdx.json
      - name: Upload Evidence
        uses: actions/upload-artifact@v4
        with: { name: evidence-release-gate, path: "sbom.spdx.json" }
```

- D3–D7 run in **warn** mode; D8 switch to **block** without SBOM+SLSA.

**EO‑006 — Disclosure Pack Generator (D5 MVP)**

- Scaffold `tools/disclosure-pack/pack.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-disclosure-pack}
mkdir -p "$OUT"/claims "$OUT"/sbom "$OUT"/slsa "$OUT"/risks
cp sbom.spdx.json "$OUT"/sbom/ 2>/dev/null || true
cp -R .evidence "$OUT"/claims/ 2>/dev/null || true
cp governance/risk/*.md "$OUT"/risks/ 2>/dev/null || true
printf "rollback:
  criteria:
  - SLO breach x2 windows
  - security finding
" > "$OUT"/rollback.yaml
zip -r "$OUT".zip "$OUT"
```

- DoD: Pack attached to Release notes; link in README.

## **EO‑007 — Golden Path Harden (D1–D3)**


---

# Next Sprint — **ACCELERATE & AUTOMATE** (Oct 17 → Oct 31, 2025)
**Theme:** Convert stability into speed and revenue. Automate provenance, harden governance-by-default, and ship a white‑label demo path that closes design partners.

## 0) Hard Gates (Must Be True by Oct 31)
1. **Provenance Automation v1:** IntelGraph claim‑ledger auto‑ingest running in CI for 3 artifact types (container image, binary, dashboard). 100% of Releases include a machine‑readable claims manifest.
2. **Governance Default‑On:** OPA ABAC bundle enforced in CI + runtime for at least 2 high‑value decisions; WebAuthn/FIDO2 step‑up required for policy exceptions.
3. **Disclosure Pack v1.0:** One‑command pack with **evidence index** (run IDs, source hashes), DPIA/DPA templates, and rollback criteria—linked from Releases.
4. **Golden Path: Demo Generator:** `make demo` produces the tri‑pane demo (graph, conductor run, disclosure) in <10 min on fresh machine.
5. **GTM Proof:** Two (2) design‑partner pitches delivered with **Customer Value Memo** + ROI hypothesis + demo recording.

> **Capacity guardrail:** Reserve **≤ 20%** for carry‑over from the current sprint; anything else moves to a backlog triage doc.

## 1) Scope & Non‑Duplication
- Build **on top of** the just‑completed gates (CI green, Release Gate, Canary, Golden Path). No rework unless it’s a blocker.
- New tickets must be created **as sub‑tasks** under the parent epics already in flight (Provenance, Governance, Demo, PR Dashboards).

## 2) Workstreams & DoD

### A) IntelGraph Provenance Automation (Owner: **Graph Lead**)
- **A1. Claims Extractors** for 3 artifact types: container image, binary, dashboard JSON.
  - *DoD:* `tools/claims/extractors/{image,binary,dashboard}.py` emit normalized claims + SHA256; unit tests passing.
- **A2. CI Wiring**
  - *DoD:* GitHub Actions job `claims.yml` writes `claims/*.json` + uploads to `.evidence/claims/`.
- **A3. Claims Ledger → Graph**
  - *DoD:* `intelgraph/ingest_claims.go` (or job) upserts Claim nodes with `origin,sensitivity,legal_basis` labels.
- **A4. Minimal Evidence UI**
  - *DoD:* `/evidence` route lists artifacts → claims → sources with copy‑link to disclosure pack.

### B) Maestro Budgets & Canary-as-Code (Owner: **Dev Infra Lead**)
- **B1. Cost/SLO Budgets**
  - *DoD:* `budgets.yaml` checked in; CI gate refuses merges breaching per‑request cost or p95 latency budgets.
- **B2. Canary Playbooks**
  - *DoD:* `RUNBOOKS/canary-playbooks.md` with templated success criteria; auto‑attach to PR via bot comment.

### C) Golden Path v2 — Demo Generator (Owner: **Platform PM**)
- **C1. `make demo`**
  - *DoD:* Seeds sample dataset, runs a Maestro run, renders IntelGraph view, produces disclosure pack.
- **C2. Sample Scenarios**
  - *DoD:* Two scenarios: (1) **Release decision**; (2) **Policy exception** with step‑up approval.

### D) Governance Default‑On (Owner: **Compliance/DevSecOps**)
- **D1. OPA ABAC Policy Bundle**
  - *DoD:* `governance/policy/bundle/` with decisions for release and data export; CI + runtime enforcement toggled by env var.
- **D2. WebAuthn/FIDO2 Step‑Up**
  - *DoD:* Step‑up flow required for policy overrides; audit log event with user, reason, decision link.
- **D3. DLP Redactions**
  - *DoD:* Redaction rules applied to disclosure exports; watermarking enabled by default.

### E) PR Dashboards Wave 2 (Owner: **Analytics Eng**)
- **E1. DORA Metrics**
  - *DoD:* Change Failure Rate, Deployment Frequency, MTTR calculated and displayed.
- **E2. Queue Efficiency**
  - *DoD:* Merge‑queue success, retries, and reviewer SLA overlayed; weekly PDF snapshot auto‑posted.

### F) GTM & Design Partners (Owner: **GTM Lead**)
- **F1. ICP → Pain → Proof**
  - *DoD:* 1‑pager per prospect: problem, proof plan (≤ 2 weeks), metrics to win.
- **F2. Pricing Guardrails**
  - *DoD:* Tiered pricing worksheet with margin targets; discount policy and floor.
- **F3. Two Pitches Delivered**
  - *DoD:* Recording + sent deck + demo link + next step date.

## 3) Plan — Day‑by‑Day (10 Business Days)
**D0 (Oct 17):** Kickoff; freeze carry‑over scope to ≤20%; create sub‑tasks only; owners assigned.

**D1–D2:** A1 extractors; B1 budgets scaffold; D1 policy bundle skeleton; C1 `make demo` scaffolding.

**D3–D4:** A2 CI wiring; B2 canary playbooks; D2 step‑up stub; E1 DORA queries; F1 ICP sheets drafted.

**D5:** C2 scenarios implemented; D3 DLP redactions on disclosure output; F2 pricing guardrails v0.9.

**D6–D7:** A3 graph ingest + Evidence UI; E2 queue efficiency; run demo end‑to‑end and record.

**D8–D9:** Harden governance default‑on; dry‑run two prospect demos; produce disclosure pack v1.0.

**D10 (Oct 31):** Exec review + retro; two pitches delivered; publish Metrics Pack + Disclosure Pack v1.0.

## 4) Success Metrics
- **Time‑to‑first‑demo:** ≤ 10 min via `make demo`.
- **Provenance coverage:** 100% Releases with claims manifest.
- **Governance adoption:** OPA bundle enforced on ≥ 2 decisions; 100% policy exceptions require step‑up.
- **GTM:** ≥ 2 prospect meetings with defined next step; **design_partners_signed:** ≥ 1 in pipeline stage “contracting”.
- **DORA:** Cfr ≤ 10%, MTTR < 30m, deploy freq ≥ 3/week.

## 5) Risks & Mitigations
- **Extractor drift across artifact types** → Define a claims schema and fixtures; validate in CI.
- **Governance friction** → Start with warn mode; enable default‑on after day 7.
- **Demo flakiness** → Snapshot demo data and runner images; nightly demo test.
- **GTM slippage** → Pre‑book pitch slots by D2; have a backup self‑serve demo link.

## 6) Deliverables
- `tools/claims/extractors/*`
- `claims/*.json` + `.evidence/claims/`
- `governance/policy/bundle/` (+ tests)
- `tools/disclosure-pack` v1.0
- `Makefile` with `demo` target + `RUNBOOKS/demo.md`
- Grafana dashboards: `dora.json`, `queue-efficiency.json`
- Two **Customer Value Memos** + pitch recordings

## 7) Execution Orders (EO) — Day 0/1 Snippets
```bash
# Scaffold claims extractors
mkdir -p tools/claims/extractors claims .evidence/claims

# CI job for claims
cat > .github/workflows/claims.yml <<'YAML'
name: claims
on: [push]
jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Extract claims
        run: |
          python tools/claims/extractors/image.py > claims/image.json
          python tools/claims/extractors/binary.py > claims/binary.json
          python tools/claims/extractors/dashboard.py > claims/dashboard.json
      - uses: actions/upload-artifact@v4
        with: { name: claims, path: claims/ }
YAML

# OPA bundle skeleton
mkdir -p governance/policy/bundle && cat > governance/policy/bundle/release.rego <<'REGO'
package release
allow {
  input.sbom_attested == true
  input.slsa_provenance == true
}
REGO
```

## 8) Owners & Cadence
- **Daily standup:** blockers → plan → evidence links.
- **Mid‑sprint exec check‑in (Oct 24):** gate status + GTM pipeline.
- **EOW demo (Oct 31):** `make demo` + Disclosure Pack v1.0 + 2 pitch recordings.

## 9) Exit Criteria Checklist
- [ ] Claims extractors + CI wiring merged; manifests in Releases
- [ ] OPA ABAC bundle enforced on 2 decisions; step‑up live
- [ ] Disclosure Pack v1.0 attached to Release
- [ ] `make demo` end‑to‑end in <10 minutes on fresh runner
- [ ] Two design‑partner pitches delivered with memos + next steps

> **Cheer 2:** More speed, more proof. **B‑E Aggressive!**

