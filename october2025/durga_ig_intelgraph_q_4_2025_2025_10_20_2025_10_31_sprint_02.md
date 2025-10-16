# DIRECTORATE J ∑ — Durga IG Workstream

**Classification:** Internal // Need‑to‑Know  
**Mode:** [JADE] Strategic Foresight + [JINX] Adversary Emulation + [JIGSAW] Narrative Defense  
**Cadence Anchor:** Q4’25 company plan (Oct 6 – Dec 28, 2025), weekly staging / bi‑weekly prod  
**This Sprint:** **S‑02: 2025‑10‑20 → 2025‑10‑31** (Prod target: **2025‑11‑05**)  
**Owner:** Durga IG (Directorate J ∑)

---

## A) Executive Thesis

- **Decisive Idea:** Turn last sprint’s primitives (Evidence Bundles, Conductor, OPA v0) into **default pathways**: every release auto‑attested, every material decision logged + queryable, policy guardrails enforced in staging with measured blast‑radius in prod.
- **Next Best Actions:** (1) **Evidence Bundles v1** with policy/test coverage gates and redaction; (2) **Conductor Search & Feeds** into IntelGraph; (3) **OPA Enforce** for tenant binding + reason‑for‑access; (4) **Recon KRI dashboard** live; (5) **Registry v0.5** tagging consent/retention on a real data path.
- **Win Condition (S‑02):** At least **two Tier‑1 services** ship green with bundles linked in release notes; OPA enforce on core policies; decision index searchable; rollback game‑day executed under policy violation.
- **Guardrails:** Feature‑flags, progressive rollout, immutable evidence storage, two‑person review for policy flips.

---

## B) COAs (Good/Better/Best)

**Scale: effort (S/M/L) × impact (Low/Med/High)**

- **Good (baseline):**
  - Evidence v1 (S×High)
  - OPA enforce core policies in staging + 10% prod (M×High)
  - Conductor search API (S×Med)
- **Better:**
  - Add **SBOM diffing** + **policy coverage heatmap** into Evidence (M×High)
  - Recon KRI dashboard (S×Med)
  - Registry v0.5 labeling one ETL path (M×Med)
- **Best:**
  - Canary **auto‑rollback on OPA violation** (S×High)
  - Narrative prebunk automation wired to evidence hashes (S×Med)

**Decision Gate (Day 5):** If OPA enforcement generates >5% deny rate or incident volume > P95 baseline, hold prod enforcement, finish Evidence/Conductor scope, and shift Registry to stretch.

---

## C) Deliverables (Ship List)

1. **Evidence Bundles v1**
   - Schema v1 (`evidence/schema/v1.json`): adds `policy_coverage`, `test_coverage`, `sbom_diff`, and `redactions`.
   - CI gate `evidence-gate.yml`: blocks release if missing attestations/tests/OPA bundle SHA.
   - Redaction tool (`tools/evidence/redactor.py`) with allow‑list fields.
   - Release note injection (`scripts/inject_evidence_links.sh`).

2. **Conductor: Search & Feeds**
   - Indexer job (`tools/conductor/indexer/`) to push decisions → IntelGraph.
   - `GET /conductor/search?q=...&service=...&since=...` (internal), RSS/Atom feeds by tag/owner.
   - CLI enhancements: `conductor relate DEC-ULID --evidence EB-ULID`.

3. **OPA Guardrails v1**
   - Policies: tenant binding, secret mount deny, admin reason‑for‑access, egress limits.
   - Mode: **enforce in staging**, **shadow → 25% prod**, feature flag `OPA_ENFORCE_CORE`.
   - Conformance suite expanded, coverage badge in README.

4. **Recon KRI Dashboard**
   - Grafana/Datadog JSON (`dashboards/recon_kris_v1.json`), alerts (`alerts/recon_kris.yml`).

5. **Registry v0.5**
   - Minimal service (`services/registry/`) with `POST /label`, `GET /lineage/:id`.
   - Sidecar filter for ETL path‑A; deny unlabeled flows in staging.

6. **Rollback Game‑day (Policy Violation)**
   - Scenario scripts (`gamedays/gd-opa-violation-01.md`), automation (`scripts/rollback_on_violation.sh`).

7. **Narrative Defense Kit v1**
   - Evidence‑aware prebunk scripts; comms checklist; message‑owner map.

---

## D) Work Breakdown & Swimlanes

**Lane A — Evidence (Release Eng)**

- A1 Schema v1 changes + migration guide (v0→v1).
- A2 Add SBOM diff (cosign/syft diff) → `artifacts/sbom_diff.json`.
- A3 CI gate: verify attestations (SLSA, SBOM, OPA SHA); compute policy coverage heatmap.
- A4 Redaction tool (PII deny‑list) + docs.
- A5 Release notes injection in two repos.

**Lane B — Conductor (Durga IG)**

- B1 Decision indexer to IntelGraph; ULID/timebox partitioning.
- B2 Search route + minimal RSS/Atom feeds.
- B3 CLI: relate evidence + add `--tags`, `--jira` fields.
- B4 Permission model: signer w/ org key; audit logs to evidence bundle.

**Lane C — OPA (SecOps)**

- C1 Expand Rego rules; add unit + integration tests.
- C2 Shadow in prod 100% / enforce 25%; observability for denies.
- C3 Exception workflow (`policy/exceptions.yaml`) with expiry + justification.
- C4 Runbook for flips + rollback.

**Lane D — Registry (Data Eng)**

- D1 API skeleton + in‑memory store with persistence hooks.
- D2 ETL path‑A sidecar label enforcement (staging).
- D3 Emit lineage edges to IntelGraph.

**Lane E — Recon KRIs (SRE+SecOps)**

- E1 Dash/alerts: auth failures, OPA denials, privilege escalations, anomalous access reasons, narrative spikes.
- E2 Baseline windows + thresholds; link to rollback script.

**Lane F — Narrative (Comms)**

- F1 Prebunk scripts tied to EB ids; channel hygiene checklist update.
- F2 Stakeholder brief template with evidence links.

---

## E) Scorecard & Tripwires (S‑02 Targets)

**KPIs**

- ≥95% releases include Evidence Bundle v1.
- ≥90% policy/test coverage recorded in bundle.
- OPA enforce on core policies: 100% staging / 25% prod.
- Decision search latency < 500 ms P95, index freshness < 5 min.
- Mean rollback time (staging) < 8 min.

**KRIs**

- OPA deny rate > 5% sustained 24h.
- Privileged access without reason > 0/day.
- Unlabeled data flow detected in staging.
- Narrative anomaly score > 95th percentile weekly.

**Tripwires & Rollback**

- Auto‑rollback on: SLO breach (2×), critical vuln, or OPA deny spike; attach Evidence Bundle to incident; notify feed `#release-ops` with EB/DEC ids.

---

## F) PCS — Proof‑Carrying Strategy

**Evidence Basis:** Builds on S‑01 shipped primitives; internal cadence docs & guardrails; Bravo backlog; IntelGraph API.  
**Assumptions:** IntelGraph write/search accessible; CI is GitHub Actions; cosign/syft available; Grafana/Datadog stack; OPA bundle delivery intact.  
**Confidence:** High for Evidence/Conductor/OPA; Medium for Registry sidecar; Medium for auto‑rollback.

**Falsifiers:**

- If SBOM diff rate > 20% per release for Tier‑1, require owner sign‑off gate or roll back to v0 schema.
- If OPA denies > 5% at 25% prod, freeze expansion; tune policies; re‑run shadow.
- If search P95 > 500 ms, add index cache or reduce query shape.

---

## G) Artifacts & Scaffolding (Drop‑in)

### 1) Evidence Schema v1 — `evidence/schema/v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EvidenceBundleV1",
  "type": "object",
  "allOf": [{ "$ref": "../schema/v0.json" }],
  "properties": {
    "policy_coverage": {
      "type": "object",
      "properties": {
        "rules_total": { "type": "integer" },
        "rules_enforced": { "type": "integer" },
        "services": { "type": "array" }
      }
    },
    "test_coverage": {
      "type": "object",
      "properties": {
        "unit": { "type": "number" },
        "integration": { "type": "number" },
        "conformance": { "type": "number" }
      }
    },
    "sbom_diff": { "type": "string", "format": "uri" },
    "redactions": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["policy_coverage", "test_coverage"]
}
```

### 2) CI Gate — `.github/workflows/evidence-gate.yml`

```yaml
name: Evidence Gate
on:
  push:
    tags: ['v*']
jobs:
  verify-evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Evidence Bundle
        run: python tools/evidence/validate.py evidence/latest.json
      - name: Check Required Attestations
        run: python tools/evidence/check_attestations.py evidence/latest.json
      - name: Block on Coverage
        run: python tools/evidence/check_coverage.py --min-policy 0.8 --min-tests 0.8 evidence/latest.json
```

### 3) Redaction Tool — `tools/evidence/redactor.py`

```python
import json, sys
ALLOW = {"id","created_at","release","artifacts","attestations","policy_coverage","test_coverage","sbom_diff","signatures"}
with open(sys.argv[1]) as f:
    eb = json.load(f)
redacted = {k:v for k,v in eb.items() if k in ALLOW}
print(json.dumps(redacted, indent=2))
```

### 4) Conductor — Search API (Express) `services/conductor/api.js`

```javascript
import express from 'express';
import { searchDecisions, feedByTag } from './store.js';
const app = express();
app.get('/conductor/search', async (req, res) => {
  const { q, service, since } = req.query;
  const out = await searchDecisions({ q, service, since });
  res.json({ results: out, took_ms: out.took });
});
app.get('/conductor/feed/:tag.rss', async (req, res) => {
  const xml = await feedByTag(req.params.tag);
  res.set('content-type', 'application/rss+xml').send(xml);
});
export default app;
```

### 5) OPA — Core Policies v1 (`policy/opa/`)

```rego
package guard.core

deny[msg] { input.tenant != input.ns_tenant; msg := "cross-tenant" }

deny[msg] { input.req.path == "/admin"; not input.req.headers["x-reason-for-access"]; msg := "missing reason" }

deny[msg] { input.egress.dest not in {"svc-a","svc-b"}; msg := sprintf("egress to %v disallowed", [input.egress.dest]) }
```

### 6) Exceptions Workflow — `policy/exceptions.yaml`

```yaml
- id: EX-2025-001
  rule: guard.core.cross-tenant
  scope: service:svc-a
  owner: secops@org
  reason: hotfix until 2025-10-25
  expires: 2025-10-25
```

### 7) Recon KRIs Dashboard — `dashboards/recon_kris_v1.json`

```json
{
  "title": "Recon & Policy KRIs",
  "panels": [
    {
      "type": "timeseries",
      "title": "OPA Denies by Tenant",
      "targets": [{ "expr": "sum by(tenant)(rate(opa_denies_total[5m]))" }]
    },
    {
      "type": "timeseries",
      "title": "Priv Access w/o Reason",
      "targets": [{ "expr": "sum(rate(priv_no_reason_total[5m]))" }]
    },
    {
      "type": "timeseries",
      "title": "Auth Failures",
      "targets": [{ "expr": "sum(rate(auth_fail_total[5m]))" }]
    }
  ]
}
```

### 8) Registry v0.5 — DDL & API

```sql
-- ddl.sql
create table labels(id text primary key, subject text, consent text, retention text, created_at timestamptz default now());
create table lineage(parent text, child text, ts timestamptz default now());
```

```bash
# sidecar.sh (staging deny on unlabeled)
if ! curl -sf $REGISTRY/label?id=$FLOW_ID; then
  echo "UNLABELED_FLOW"; exit 1; fi
```

### 9) Game‑day Script — `scripts/rollback_on_violation.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
svc=$1
if opa query --fail violations.$svc; then
  ./scripts/rollback.sh $svc
  ./scripts/attach_evidence.sh $svc
fi
```

### 10) Narrative Kit v1 — Stakeholder Brief

```md
# Stakeholder Brief — Release <tag>

- Evidence: EB‑<id>
- Decision(s): DEC‑<ids>
- Policy status: OPA enforce <pct>, exceptions <ids>
- Risks & mitigations (links)
- Rollback criteria & status
```

---

## H) RACI & Resourcing

- **Responsible:** Durga IG (Conductor/Search), Release Eng (Evidence v1), SecOps (OPA v1), Data Eng (Registry v0.5), SRE (KRIs), Comms (Narrative).
- **Accountable:** CTO / Director Sec.
- **Consulted:** Legal, DPO, Infra.
- **Informed:** Exec staff, Board (monthly).

---

## I) Milestones & Calendar

- **M1 (Oct 22):** Evidence v1 schema merged + CI gate green in staging.
- **M2 (Oct 24):** Conductor search live (internal) + feeds.
- **M3 (Oct 28):** OPA enforce 100% staging / 25% prod.
- **M4 (Oct 30):** Game‑day rollback executed; report attached to EB.
- **M5 (Oct 31):** Release notes injection working in two Tier‑1 repos.

---

## J) Governance & Provenance

- Evidence bundles immutable (7y), audit logs 18m, exception records expiring; all changes gitable; EB/DEC IDs cross‑referenced in IntelGraph.

---

## K) DoD‑J (Definition of Done)

- Two Tier‑1 services ship with **Evidence v1** and injected links; **OPA enforce** in staging and 25% prod; **Decision search** available; **rollback** tested; scorecard green or justified amber with remediation plan.
