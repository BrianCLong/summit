# Execution Assets — 2025.10.HALLOWEEN
Scope: Example payloads & golden fixtures (JSON/CSV), CI wiring PRs (commit‑ready YAML), Grafana dashboards (filled), and a rollout calendar mapping all gates to tag `2025.10.HALLOWEEN`. Includes extensions for Frontier/Inferno+ and beyond.

Directory map (logical):
```
assets/
  fixtures/
    core/
    ai/
    analytics/
    trust/
    ops/
    interop/
    ux/
    frontier_inferno/
  ci/
    workflows/
    opa/
    k6/
  dashboards/
  rollout/
  docs/
```

---
# 1) Example Payloads & Golden Fixtures
> Use these as golden IO for CI and manual verification. Where CSV is provided, headers are canonical.

## 1.1 CORE — Provenance & Claim Ledger
**A) Claim (JSON)**
```json
{
  "subjectId": "case:8ff2a1b9",
  "claimType": "transform",
  "evidenceRefs": [
    {"type":"source","hash":"sha256:9c1f...a2"},
    {"type":"model","id":"graphrag-1.3.2","card":"v1.1"}
  ],
  "policyEval": {"policySha":"b1f0d9","result":"allow","reasons":[]},
  "hash": "sha256:1b2e...55",
  "actor": {"id":"u:analyst-42","role":"Analyst","reason":"Brief compilation"},
  "timestamp": "2025-10-26T21:12:03Z"
}
```
**B) Manifest (JSON)**
```json
{
  "exportId": "exp:BRIEF-2025-10-31-001",
  "artifactRefs": [
    {"name":"brief.pdf","sha256":"fa3c...1d"},
    {"name":"citations.json","sha256":"3cc1...aa"}
  ],
  "transformChain": [
    {"op":"nl2cypher","version":"0.9.7","seed":42},
    {"op":"pathfind","k":3,"params":{"maxHops":4}}
  ],
  "modelCard": {"id":"graphrag-1.3.2","provider":"internal","safety":"guarded"},
  "policyDecisions": [
    {"policy":"repo@b1f0d9","decision":"allow"},
    {"policy":"privacy@77aa12","decision":"allow"}
  ],
  "signer": {"kid":"key-usw2-001","alg":"Ed25519"},
  "timestamp": "2025-10-31T00:00:01Z"
}
```
**C) Verifier Request (JSON)**
```json
{"manifest":"...base64...","payloadSha":"sha256:fa3c...1d"}
```

## 1.2 AI — Evidence‑First GraphRAG
**Ask (JSON)**
```json
{
  "question": "Who coordinated between Org A and Cell X in Q3 2025?",
  "scope": {"cases":["8ff2a1b9"],"labels":["cleared:counterintel"]},
  "mode": "sandbox",
  "preferences": {"citations": true, "preview": true}
}
```
**Answer Draft (Golden) (JSON)**
```json
{
  "cypherPreview": "MATCH (p:Person)-[:CONTACTED]->(g:Group) ...",
  "citations": [
    {"entityId":"person:abc","claim":"meeting","provHash":"sha256:9c1..."},
    {"entityId":"device:imei:123","claim":"location","provHash":"sha256:de7..."}
  ],
  "answerDraft": "Coordinator likely P. Marin (prob. 0.78) connecting Org A↔Cell X via Device 123 on 2025‑09‑19; see cites [1][2]."
}
```

## 1.3 INGEST — Connector Job Config
**Job (JSON)**
```json
{
  "type": "email_imap",
  "source": {"host":"imap.example","port":993,"ssl":true},
  "authRef": "secrets/email‑feed‑prod",
  "schedule": "rate(15m)",
  "mappingRef": "maps/email_v2",
  "limits": {"rps": 4, "maxBytes": 10485760},
  "licenseId": "LIC‑A‑2025‑001"
}
```
**Mapping (CSV)**
```
src_field,dst_field,transform
from,entity.email.address,lower
subject,entity.message.subject,identity
body,entity.message.body,redact(pii)
```

## 1.4 GOV — ABAC Eval Example
```json
{
  "subject": {"id":"u:analyst-42","clearance":"C2","purpose":"investigation"},
  "object": {"id":"case:8ff2a1b9","label":"need‑to‑know"},
  "action": "export",
  "context": {"mfa":"webauthn-ok","geo":"US"}
}
```

## 1.5 Analytics — Anomaly Score & Explain
```json
{"entity":"wallet:0xabc","detectors":["temporal","community"],"window":"28d"}
```
**Explain (Golden)**
```json
{"id":"score:xyz","topFeatures":[{"name":"burstiness","value":0.91},{"name":"bridge_centrality","value":0.77}],"counterfactual":{"lower_burstiness":0.31}}
```

## 1.6 Collaboration — Case Four‑Eyes Approval
```json
{"caseId":"8ff2a1b9","operation":"export","reason":"partner disclosure","approvers":["u:lead-7","u:ombuds-2"]}
```

## 1.7 Interop — STIX Import (Snippet)
```json
{"type":"bundle","objects":[{"type":"indicator","pattern":"[url:value = 'hxxp://ex[.]ample']","valid_from":"2025-09-01T00:00:00Z"}]}
```

## 1.8 UX — Command Palette Command
```json
{"cmd":"open-case","args":{"id":"8ff2a1b9"}}
```

## 1.9 Frontier — CPC Build & Replay
```json
{"datasetRefs":["s3://intel/2025q3.parquet"],"toggles":{"time_window":"2025-07..2025-09","exclude":"partner‑B"},"seed":1337}
```
**Replay Result (Golden)**
```json
{"status":"ok","delta":{"risk_score":-0.12},"receipt":"sha256:77aa..."}
```

## 1.10 Inferno — QAP Sign/Verify
```json
{"artifacts":[{"name":"manifest.json","sha256":"fa3c..."}],"sigAlg":"Dilithium3"}
```

---
# 2) CI Wiring PRs (Commit‑Ready YAML)
> Drop into `.github/workflows/`. Uses artifacts and fixtures above.

## 2.1 release‑gate.yml
```yaml
name: release-gate
on:
  pull_request:
    branches: [ main ]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install deps
        run: npm ci
      - name: SBOM & Provenance
        run: npm run sbom && npm run provenance
      - name: OPA Gate
        run: npx opa eval -i assets/fixtures/core/manifest.json -d ci/opa --format=pretty 'data.release.gate'
      - name: Upload evidence
        uses: actions/upload-artifact@v4
        with: { name: evidence, path: evidence/** }
```

## 2.2 e2e-golden.yml
```yaml
name: e2e-golden
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Seed & Headless Run
        run: |
          npm run seed -- assets/fixtures
          npm run e2e:headless
      - name: Attach Manifests
        run: npm run manifest:attach
      - name: Upload Report
        uses: actions/upload-artifact@v4
        with: { name: e2e-report, path: reports/e2e/** }
```

## 2.3 k6-synthetics.yml
```yaml
name: k6-synthetics
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch:
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: Run k6
        run: k6 run ci/k6/golden_flow.js
```

## 2.4 sarif-security.yml
```yaml
name: sarif-security
on: [push, pull_request]
jobs:
  codeql:
    uses: github/codeql-action/.github/workflows/codeql.yml@v3
  deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run dep:scan
      - uses: github/upload-sarif@v2
        with: { sarif_file: results.sarif }
```

## 2.5 docker-airgap.yml
```yaml
name: docker-airgap
on: [workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: make images
      - name: Mirror & Checksums
        run: make airgap
      - uses: actions/upload-artifact@v4
        with: { name: airgap-bundle, path: dist/airgap/** }
```

## 2.6 release-tag.yml
```yaml
name: release-tag
on:
  workflow_dispatch:
    inputs:
      tag: { description: 'Release tag', default: '2025.10.HALLOWEEN' }
jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create tag
        run: |
          git tag ${{ inputs.tag }}
          git push origin ${{ inputs.tag }}
```

---
# 3) Grafana Dashboards (Filled JSON)
> Place JSON under `dashboards/` and import. UIDs are stable.

## 3.1 CI Overview — `ci_overview.json`
```json
{
  "uid":"ci-ovw-202510","title":"CI Overview (Halloween)","panels":[
    {"type":"stat","title":"PR Gate Pass %","targets":[{"expr":"sum(pr_pass)/sum(pr_total)"}]},
    {"type":"graph","title":"E2E Duration (m)","targets":[{"expr":"avg_over_time(e2e_duration_minutes[7d])"}]},
    {"type":"table","title":"Flaky Tests","targets":[{"expr":"topk(20, flake_count)"}]}
  ]
}
```

## 3.2 SLO & Error Budget — `slo_budget.json`
```json
{
  "uid":"slo-202510","title":"SLO & Error Budget","panels":[
    {"type":"graph","title":"Availability","targets":[{"expr":"(1 - rate(http_requests_total{code=~\"5..\"}[30d]) / rate(http_requests_total[30d]))"}]},
    {"type":"stat","title":"Budget Spent %","targets":[{"expr":"sum(error_budget_spent)"}]}
  ]
}
```

## 3.3 Cost Guard — `cost_guard.json`
```json
{
  "uid":"cost-guard-202510","title":"Cost Guard","panels":[
    {"type":"graph","title":"$ per insight","targets":[{"expr":"rate(cost_usd[1d]) / rate(insights[1d])"}]},
    {"type":"stat","title":"Tiering Saves (30d)","targets":[{"expr":"sum(tiering_savings_30d)"}]}
  ]
}
```

## 3.4 Release Gate — `release_gate.json`
```json
{
  "uid":"rel-gate-202510","title":"Release Gate","panels":[
    {"type":"stat","title":"Gate Pass %","targets":[{"expr":"sum(gate_pass)/sum(gate_total)"}]},
    {"type":"table","title":"Top Deny Reasons","targets":[{"expr":"topk(10, deny_reason_count)"}]}
  ]
}
```

## 3.5 Red‑Team & Guardrails — `redteam_guard.json`
```json
{
  "uid":"rt-guard-202510","title":"Red‑Team & Guardrails","panels":[
    {"type":"table","title":"Prompt Blocks (24h)","targets":[{"expr":"sum by (category) (prompt_blocks_24h)"}]},
    {"type":"graph","title":"Policy Blocks Over Time","targets":[{"expr":"sum by (policy) (policy_block_total)"}]}
  ]
}
```

---
# 4) Rollout Calendar — Tag `2025.10.HALLOWEEN`
Timezone: America/Denver (UTC‑6/‑7 per DST). Target tag date: **Oct 31, 2025 (Fri)**.

## Week of Oct 6 (T‑3w)
- **Freeze criteria** drafted; OPA Gate in **report‑only**.
- k6 thresholds baselined; SBOM pipeline green; IGAC calendar locked.
- Owners: EM Core, GRC Lead, SRE On‑call.

## Week of Oct 13 (T‑2w)
- **Feature freeze**; e2e‑golden mandatory; flake rate <1%.
- Red‑Team prompts sweep; WebAuthn step‑up enabled on risky routes (shadow).
- Cost Guard budget caps simulated.

## Week of Oct 20 (T‑1w)
- **Gate: Enforce** (OPA → fail‑closed); SBOM+Provenance attached on RC tags.
- IGAC sign‑off session 1; Dissent (CDC) window open 48h.
- Air‑gap bundle dry‑run; disaster rollback drill.

## Oct 27–30 (T‑4→T‑1d)
- RC2 burn‑in; partner interop (STIX/ZK) smoke tests; CPC replay reproducibility audit.
- Grafana dashboards pinned; runbook handoffs; comms to field.

## Oct 31 — Release Day
- Create tag `2025.10.HALLOWEEN` via workflow; publish release notes with evidence block.
- Post‑release watch: 24h; error‑budget tracking; partner notifications.

## Nov 3–7 — Stabilization
- Hotfix window; metrics review; retro; policy diffs; flake triage closure.

Milestone Gates & SLAs:
- Gate Pass ≥ 98%, SBOM 100%, Prov‑Manifest 100%, E2E Duration < 12m p95, SLO error budget ≤ 5% spent weekly.

---
# 5) Beyond Inferno — Forward Tracks (Q1–Q2 2026)
- **PNE (Proof‑of‑Non‑Existence)** pilot harness & auditor UI.
- **VEX/HDS** partner lab with bounded‑blast experiments.
- **RS/HW/IFD/AWP** safety‑gated studies with rollback playbooks and receipts.
- **Multi‑Graph Federation GA** with PCQ across shards.

---
# 6) Docs & Enablement Stubs
- **Runbook**: `docs/runbooks/release_hardening.md` — checklist mirroring calendar.
- **Training**: `docs/training/analyst_assist_v0_2.md` — 8 quick‑starts, 3 exemplar notebooks.
- **SOW**: `docs/sow/pilot_template.md` — scope, deliverables, acceptance tied to PCQ & SLOs.

---
# 7) OPA Policy Bundle (Sketch)
```
ci/opa/
  release.rego
  privacy.rego
  repo.rego
  flow.rego
  data/
    thresholds.json
```
**release.rego (excerpt)**
```rego
package release.gate

deny[msg] {
  input.sbom.critical_vulns > 0
  msg := "Critical vulns present"
}

deny[msg] {
  input.provenance.coverage < 1
  msg := "Missing provenance manifest"
}
```

---
# 8) k6 Golden Flow (Filled)
```js
import http from 'k6/http';
export let options = {
  vus: 20,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    checks: ['rate>0.99']
  }
};
export default function() {
  let r = http.get(`${__ENV.BASE_URL}/health`);
  if (r.status !== 200) { throw new Error('Health failed'); }
}
```

---
# 9) Example CSV Fixtures
**anomaly_benchmark.csv**
```
entity_id,ts,feature_1,feature_2,label
wallet:0xabc,2025-09-01T00:00:00Z,0.12,1.03,0
wallet:0xabc,2025-09-02T00:00:00Z,0.91,1.22,1
```
**stix_roundtrip_map.csv**
```
stix_field,canonical_field
indicator.pattern,entity.indicator.pattern
indicator.valid_from,entity.indicator.valid_from
```

---
# 10) Release Notes (Markdown Skeleton)
```md
# 2025.10.HALLOWEEN
## Highlights
- Core GA hardening; GraphRAG evidence‑first; PCQ; ZK deconfliction; Admin Studio; Offline/Edge kits; Governance gates.

## Evidence
- SBOM: link
- Provenance Manifest: link (sha256:...)
- Policy Pack: repo@sha
- Gate Report: artifact link

## Known Issues
- (none)
```

---
# 11) Owner Matrix (RACI Snapshot)
```
Area,Responsible,Accountable,Consulted,Informed
Release Gate,SecEng Lead,CTO,GRC,Ombuds
SBOM/Prov,Build Eng,EM Core,Legal,Support
Dashboards,SRE,Head of SRE,FinOps,Field
Rollout,PM,EMs,All,All
```

---
# 12) Import Steps
1. Commit `ci/` workflows and `opa/` bundle.
2. Import Grafana JSONs; set datasource; verify UIDs.
3. Seed fixtures; run `e2e-golden` workflow.
4. Flip OPA from report‑only → enforce in T‑1w.
5. Run `release-tag` workflow on Oct 31, 2025.

— End —

