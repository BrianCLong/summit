# Sprint Packet — Security, Governance, Provenance & Ops (Groves Workstream)

**Cadence:** 2025‑10‑01 → 2025‑10‑14 (2 weeks)  
**Role / Workstream:** Leslie Groves — Engineer’s Seat (Extreme compartmentation, accreditation, provenance, SRE)  
**Alignment:** Q3–Q4 2025 Core GA + Prov‑Ledger beta + Ops SLOs  
**Status Target:** Ship **clean/green** features with acceptance evidence; enable GA hardening

---

## 0) Scope, Inputs, and Review Notes
- **Scope (“my ambit”):** Security & Governance, Provenance/Claim Ledger, Authority Binding & OPA, Audit/Access Reasoning, DR/BCP & SRE; cost guardrails; tenant isolation & compartmentation; offline/edge sync integrity.
- **Inputs reviewed:**
  - Council Wishbooks (Final + Expanded/Exhaustive) — feature backlogs, acceptance patterns, seat‑by‑seat asks, near‑term roadmap.
  - Repo layout pointers from documents: `server/src/ai/*`, `graph-xai/`, `prov-ledger/`, `predictive-threat-suite/`, `apps/web/`, `data-pipelines/`, `ingestion/`, `helm/`, `terraform/`, `docs/project_management/*`.
- **Assumptions & constraints:** Archive artifacts referenced in planning (sprint boards, competitor sheets, October bundle) were not directly accessible; this sprint packet aligns to published roadmap, acceptance criteria, and directory structure from the wishbooks.

---

## 1) Gaps & Risks (In My Lane)
### A) Security & Governance
- **Authority Binding → Query‑time enforcement path incomplete.** Need policy labels propagated end‑to‑end (ingest → graph → gateway → UI), plus appeal/ombuds hooks.
- **OPA policies scattered / not versioned.** Policy as code lacks simulation harness and impact diffs before rollout.
- **ABAC/RBAC matrix missing golden tests.** No automated proofs that cross‑tenant and compartment boundaries are sealed (need Jepsen‑style authz checks).

### B) Provenance / Claim Ledger
- **External verification workflow not wired.** Exported bundles lack reference verifier CLI + detached proofs doc.
- **Transform chain thin on ETL enrichers.** Some enrichers (OCR/STT/redaction) not attaching step‑level hash annotations.
- **Contradiction graphs exist conceptually, not surfaced.** UI lacks “contradiction density” and claim lineage drill‑in.

### C) Auditability & Oversight
- **Reason‑for‑access prompts uneven.** Not enforced on sensitive selectors; missing audit schema for motivation text + policy at time of access.
- **Abuse/misuse tripwires not tuned.** Selector misuse & prompt‑injection red‑flags exist as patterns, but not routed to triage/ombuds queues.

### D) SRE / Ops / Reliability
- **Cost Guard not actively gating.** Budgets exist on paper; no slow‑query killer in the gateway; no budget burn dashboards.
- **Chaos/DR drills not codified.** Playbooks present, but cadence/jobs not in CI; PITR + cross‑region restore not tested weekly.
- **Offline/Edge CRDT merges lack operator UX.** Conflict resolution UI stubbed; signed resync logs not exposed to admins.

### E) Frontend Contract Gaps (enablement for above)
- **Explainability overlays** don’t yet expose: policy reasoners, provenance tooltips for every edge/node, and confidence opacity.

> **Risk posture:** Medium. Primary threats are policy drift, provenance gaps in exports, and cost spikes under load. This sprint burns these down.

---

## 2) Sprint Goals (Definition of Victory)
1) **Authority‑Bound Gateway GA‑Ready:** end‑to‑end ABAC+OPA with policy simulation & reason strings in UI; golden tests for cross‑tenant isolation.
2) **Provenance Bundle v1.0:** verifiable disclosure pack (manifest + claim ledger + transform chain) + external verifier CLI.
3) **Cost Guardrails Online:** query budgeting + slow‑query killer + tenant cost explorer MVP.
4) **Audit & Ombuds Loop:** reason‑for‑access prompts, selector‑misuse detector → triage queues + review UX stub.
5) **DR/Chaos Cadence:** weekly automated drills; PITR restore proof; cross‑region replica switch test; signed offline resync logs visible.

---

## 3) Deliverables (This Sprint)
- **D1. Gateway Policy Kit** (policy‑by‑default):
  - OPA bundle `policy/opa/` with versioned policies, unit tests, and simulation harness.
  - Policy‑impact diff tool `tools/policy-diff` to replay historical queries and show changes.
  - ABAC labels propagation: ingest → graph store → GraphQL gateway → UI headers.
- **D2. Prov‑Ledger Export & Verifier**:
  - `prov-ledger/exporter` service producing `manifest.json` (Merkle tree over evidence, transforms, licenses).
  - `tools/prov-verify` CLI validating hashes, signatures, and transform chain; README with examples.
  - UI export flow: disclosure pack builder + download; provenance panel in Report Studio.
- **D3. Cost Guard MVP**:
  - Gateway slow‑query killer with cost estimator; per‑tenant budgets; hints in error payloads.
  - `ops/cost-explorer/` Grafana dashboards fed by Prom + OTEL spans; budget burn alerts.
- **D4. Audit/Ombuds**:
  - Reason‑for‑access modal with policy context; audit schema change; ombuds queue backend with basic triage UI.
- **D5. DR/Chaos**:
  - GitHub Actions (or CI) jobs for weekly chaos suite; PITR & cross‑region restore workflows; signed resync logs browser in Admin Studio.

**Artifacts shipped:** ADRs, schemas, policy bundles, CLIs, dashboards, test fixtures, sample data, runbooks, and docs — all included below.

---

## 4) Work Breakdown (Epics → Stories → Tasks)

### EPIC A — Authority‑Bound Gateway
- **A1. ABAC Label Propagation**
  - T1. Add policy labels to ingestion mappers (origin, legal basis, purpose, sensitivity, retention).
  - T2. Persist labels in graph schema; migrations + backfill.
  - T3. Gateway context extractor: propagate labels into request authz.
- **A2. OPA Policy Bundle & Tests**
  - T1. Scaffold `policy/opa` with Rego modules (access, export, selector governance).
  - T2. Unit tests with synthetic tenants & compartments; table‑driven.
  - T3. **Policy Simulation Harness** with historical query corpus; pre‑merge CI gate.
- **A3. Isolation Golden Tests**
  - T1. Jepsen‑style authz fuzz tests across tenants/compartments.
  - T2. Build red/green test suite; badge in CI.

### EPIC B — Provenance Bundle & Verifier
- **B1. Manifest Generator**
  - T1. Define `manifest.schema.json` (evidence, transforms, licenses, authorities, signatures).
  - T2. Implement Merkle tree + SHA‑256 variant plug.
  - T3. Integrate with ETL to attach step hashes & tool identities.
- **B2. External Verifier CLI**
  - T1. Implement `prov-verify` (Go or TS) with detached signature support.
  - T2. Golden fixtures; CI conformance.
  - T3. Docs: verifier usage, failure modes, legal language template.
- **B3. UI Surfaces**
  - T1. Report Studio: “Evidence & Chain” tab with copyable manifest.
  - T2. Graph view: provenance tooltips, contradiction density badge.

### EPIC C — Cost Guard & Budgeting
- **C1. Cost Estimator & Slow‑Query Killer**
  - T1. Static cost model → estimate from persisted query plans.
  - T2. Kill switch + customer hinting; partial results with guidance.
- **C2. Budgets & Dashboards**
  - T1. Budget registry per tenant; alerts.
  - T2. Grafana dashboards; SLO burn chart; unit economics panel.

### EPIC D — Audit, Ombuds & Misuse Detection
- **D1. Reason‑for‑Access**
  - T1. Modal UX + API; store reason + policy snapshot.
- **D2. Selector‑Misuse Detector**
  - T1. Detector in feature store; thresholds; triage queue.
  - T2. Ombuds queue UI stub; assignment + disposition.

### EPIC E — DR/Chaos/Offline Integrity
- **E1. Chaos Suite Automation**
  - T1. Pod/broker kill experiments + alarms.
  - T2. PITR & cross‑region failover jobs with evidence artifacts.
- **E2. Offline/Edge Integrity**
  - T1. Signed resync logs; Admin Studio browser; conflict resolution UX pass.

**Dependencies:** Graph schema migrations; gateway deploy rights; observability stack (Prom/OTEL); Admin Studio extension hooks.

---

## 5) Architecture & Contracts (Scaffolding)

### 5.1 Policy Labels (Canonical)
```yaml
# policy/labels.yaml
labels:
  - key: origin
    enum: [osint, partner, internal]
  - key: legalBasis
    enum: [warrant, consent, contractual, public_interest, none]
  - key: sensitivity
    enum: [public, internal, confidential, secret]
  - key: purpose
    enum: [cti, dfir, fraud, hr, policy, research]
  - key: retention
    enum: [30d, 90d, 1y, 3y, 7y, indefinite]
```

### 5.2 OPA Bundle (Rego skeleton)
```rego
package intelgraph.authz

default allow := false

allowed_tenant(user, resource) {
  user.tenant == resource.tenant
}

compartment_ok(user, resource) {
  # need-to-know label intersection
  some c
  c := resource.labels.compartment[_]
  c == user.compartments[_]
}

legal_basis_ok(resource) {
  resource.labels.legalBasis != "none"
}

allow {
  allowed_tenant(input.user, input.resource)
  compartment_ok(input.user, input.resource)
  legal_basis_ok(input.resource)
}
```

### 5.3 Policy Simulation Harness (CLI)
```bash
# tools/policy-diff/examples
policy-diff \
  --from policy/opa@v1.3 --to policy/opa@v1.4 \
  --replay logs/query_corpus.ndjson \
  --out reports/policy-impact-2025-10-05.html
```

### 5.4 Provenance Manifest Schema (excerpt)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://intelgraph.example/schemas/prov-manifest.json",
  "type": "object",
  "required": ["bundleId", "createdAt", "evidence", "transforms", "licenses", "signatures"],
  "properties": {
    "bundleId": {"type": "string", "format": "uuid"},
    "createdAt": {"type": "string", "format": "date-time"},
    "caseId": {"type": "string"},
    "evidence": {"type": "array", "items": {"$ref": "#/defs/evidence"}},
    "transforms": {"type": "array", "items": {"$ref": "#/defs/transform"}},
    "licenses": {"type": "array", "items": {"$ref": "#/defs/license"}},
    "signatures": {"type": "array", "items": {"$ref": "#/defs/signature"}}
  },
  "defs": {
    "evidence": {
      "type": "object",
      "required": ["id", "sha256", "source", "policyLabels"],
      "properties": {
        "id": {"type": "string"},
        "sha256": {"type": "string"},
        "source": {"type": "string"},
        "policyLabels": {"type": "object"}
      }
    },
    "transform": {
      "type": "object",
      "required": ["step", "tool", "inputs", "outputs", "sha256"],
      "properties": {
        "step": {"type": "integer"},
        "tool": {"type": "string"},
        "inputs": {"type": "array", "items": {"type": "string"}},
        "outputs": {"type": "array", "items": {"type": "string"}},
        "sha256": {"type": "string"}
      }
    }
  }
}
```

### 5.5 Prov‑Verify CLI (TS sketch)
```ts
// tools/prov-verify/src/index.ts
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));

function sha256(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

// verify evidence hashes
for (const ev of manifest.evidence) {
  const bytes = readFileSync(`evidence/${ev.id}`);
  const sum = sha256(bytes);
  if (sum !== ev.sha256) throw new Error(`Hash mismatch: ${ev.id}`);
}
console.log('evidence ok');
// TODO: verify Merkle root + signatures
```

### 5.6 GraphQL Gateway — Reason‑for‑Access
```graphql
mutation reasonForAccess($resourceId: ID!, $reason: String!) {
  recordAccessReason(resourceId: $resourceId, reason: $reason) {
    id
    at
    policySnapshot
  }
}
```

### 5.7 Audit Schema Change (SQL)
```sql
ALTER TABLE audit_events
  ADD COLUMN access_reason TEXT,
  ADD COLUMN policy_snapshot JSONB,
  ADD COLUMN ombuds_ticket_id UUID NULL;
```

### 5.8 Cost Guard — Persisted Query Hints
```json
{
  "id": "q:path_k_shortest",
  "max_cost": 2000,
  "timeout_ms": 1200,
  "partial_ok": true
}
```

### 5.9 Chaos & DR — CI Jobs (YAML)
```yaml
name: weekly-chaos
on:
  schedule: [{ cron: '0 9 * * 1' }] # Mondays 09:00 UTC
jobs:
  kill-broker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: inject-failure
        run: kubectl delete pod -n broker $(kubectl get po -n broker -o name | head -1)
      - name: assert-slo
        run: ./ops/assert-slo.sh
```

### 5.10 Offline Resync Logs — Signed
```bash
# ops/offline/signer.sh
zip -r bundle.zip local_case/
sha256sum bundle.zip > bundle.sha256
cosign sign-blob --key cosign.key --output-signature bundle.sig bundle.zip
```

---

## 6) Acceptance Criteria (per Goal)
- **Authority‑Bound Gateway**
  - 100% of sensitive queries blocked without legal basis; UI shows human‑readable reason + appeal path.
  - Isolation tests pass: no cross‑tenant/compartment leakage across 10k randomized attempts.
  - Policy change PRs blocked until simulation report attached; impact ≤ agreed thresholds.
- **Provenance Bundle**
  - Export includes manifest with hashes + transform chain; external CLI verifies; demo pack published.
  - ETL enrichers attach step hashes and identities (OCR/STT/redaction).
- **Cost Guard**
  - ≥95% of queries receive cost estimates; slow‑query killer engaged for overruns; dashboards live.
- **Audit/Ombuds**
  - Reason‑for‑access recorded for ≥98% of sensitive views; selector‑misuse alerts routed with MTTR < 1h.
- **DR/Chaos**
  - PITR restore proven <15m; cross‑region failover proven <10m; runbooks updated with evidence.

---

## 7) Test Plan & Fixtures
- **Authz/Policy:** table‑driven Rego tests; fuzz corpus of 50k synthetic requests; golden deny/allow sets.
- **Provenance:** sample case with 12 exhibits; deterministic hashes; negative tests (tampered evidence).
- **Cost Guard:** replay 500 persisted queries; ensure budget violations kill w/ hints.
- **Audit/Ombuds:** simulated selector misuse; verify triage queue creation; closure workflow.
- **DR/Chaos:** scripted pod/broker kills; PITR restore; replica promotions; screenshots & logs archived.

---

## 8) Dashboards & Ops
- **Grafana:** SLO burn, query latency heatmap, budget burn, selector‑misuse, chaos drill outcomes.
- **Prom/OTEL:** instrument gateway cost estimator, policy denials, audit writes, prov‑export timings.

---

## 9) Documentation & ADRs
- **ADRs:**
  - ADR‑042: Authority Binding at Query Time (labels, OPA flow, snapshots).
  - ADR‑043: Provenance Manifest & Verifier Format (Merkle + detached sigs).
  - ADR‑044: Query Cost Model & Kill Policy.
  - ADR‑045: Audit/Ombuds Data Model & SLAs.
  - ADR‑046: DR/Chaos Drill Cadence & Evidence.
- **Playbooks:**
  - PB‑A01: Policy Change Simulation & Rollout.
  - PB‑P01: Building Disclosure Packs & Verifying.
  - PB‑C01: Budget Alert Response.
  - PB‑R01: PITR & Failover Procedure.

---

## 10) RACI & Cadence
- **R:** Groves Workstream (Security/Gov/Prov/Ops).  
- **A:** CTO/Chief Architect.  
- **C:** Ombudsman, Legal, SRE, Data Steward.  
- **I:** Seat owners (Wolf, Inman, le Carré), Frontend lead.

**Ceremonies:** Daily stand‑up; Mid‑sprint demo (2025‑10‑08); Sprint review (2025‑10‑14); Retro + next sprint planning.

---

## 11) Dependencies & Integration Points
- Graph schema migration service; Gateway team for persisted query hints; UI team for overlays/modals; Observability stack; Admin Studio hooks.

---

## 12) Out‑of‑Scope (tracked for next)
- Full Graph‑XAI overlays for ER & forecasts (coordinate next sprint).  
- Federated multi‑graph search controls.  
- Marketplace compliance scans.

---

## 13) Backlog (Ready for Next Sprint)
- Prov‑ledger contradiction graph visualizations (heatmap + drill‑through).  
- Per‑case vector index governance (retention & purpose).  
- Enclave compute option for sensitive transforms.

---

## 14) Shipping Checklist (Clean & Green)
- [ ] CI green on policy, authz fuzz, provenance fixtures, cost guard tests.  
- [ ] Security scan zero criticals; SBOM updated.  
- [ ] Docs/ADRs merged; Playbooks published.  
- [ ] Dashboards live; alerts tuned.  
- [ ] Demo script + sample datasets checked in.  
- [ ] Rollback instructions tested.

---

## 15) Go‑to‑Market & Enablement (Internal)
- **Demo flow:** Ingest → Policy‑blocked query (with explanation) → Link analysis → Export disclosure pack → External verify → Cost guard in action.  
- **Training:** 30‑min “Policy & Provenance 101” + 15‑min hands‑on lab.

---

## 16) Appendix — Sample Data & Fixtures
- `fixtures/policy/tenants.yaml` — tenants/compartments/users.  
- `fixtures/prov/case‑alpha/` — 12 exhibits + manifest + tampered negative case.  
- `fixtures/queries/` — persisted query corpus with expected costs.  
- `fixtures/audit/` — selector‑misuse sequences and expected tickets.

---

**Finish the drill.** Ship it clean, prove it with evidence, and leave no gaps. 

