[MODE: WHITE]

# DIRK IG — Counter‑Threat & Intel Director Workstream (Q4 2025)
**Classification:** Internal // Need‑to‑Know • **Owner:** DIRK IG (Directorate K++) • **Date:** 2025‑09‑30 (America/Chicago)

---

## A) Executive Summary (Decisions & Next Steps)
- **Adopt this DIRK IG workstream** aligned to the October pack and repo state; cadence is **biweekly Wednesday sprints** with weekly staging cuts and biweekly prod releases.
- **Three priority thrusts:** (1) **Provable Compliance** (provenance, attestations, policy‑as‑code), (2) **Operational Hardening** (detections, runbooks, cost/safety guardrails), (3) **Delivery Conductor** (release evidence bundles and GA readiness gates).
- **Start now:** Kick off **Sprint 2025‑10‑01 → 2025‑10‑14** with scope and DoD below; stand‑up the Victory Ledger and Evidence Bundle pipeline on Day 1.
- **Gap‑closers** included here as actionable tasks (cheap, fast, high‑impact) to seal edges in the existing October plans.

---

## B) Findings & Rationale (What, Why, So‑What)
**Sources reviewed (high‑level):** October pack (numerous sprint files incl. `intelgraph_mc_sprint_2025_10_01_v_1_0.md` and follow‑ons), Switchboard docs, GA release notes drafts, installer/infra packs, and Summit repo (extensive CI/CD workflows, security docs, salvage archives). ZIP provenance (SHA‑256):
- `october2025.zip` → `92ab340ee190b0078199dad06befe50ca15e7537347f6100b7cd5a7bdd726702`
- `summit-main (1).zip` → `27f925b91197b7354da23bbf09b5c4a9d45803d5d39fca7acd058355e7679388`

**Key observations**
1) **Cadence pre‑defined**: October pack sets **biweekly Wednesday sprints** with weekly staging cuts; aligns with GA preparation—keep it.
2) **Strong deployable‑first ethos** in IntelGraph; however, **proof‑carrying artifacts** (attestations/tests) are inconsistently generated at release time.
3) **Security posture present** (SECURITY docs, SBOM/Signing), but **telemetry→detections→runbooks** chain is incomplete across graph ingest, NL→Cypher ops, and Conductor actions.
4) **Operational risks** around: secrets rotation, environment drift, cost overruns on LLM/RAG paths, and change‑approval evidence.
5) **Governance & audit**: many pieces exist; **need a unified Victory/Evidence Ledger** with immutability, hashes, and bundle manifest per release.

**So‑What:** Converge delivery around a **single conductor** that enforces policy gates, emits evidence bundles, and backs every release with verifiable proofs. This reduces blast radius, increases auditability, and accelerates GA.

---

## C) Recommendations (Prioritized; Effort × Impact)
**Quick Wins (Week 1):**
1. **Victory Ledger bootstrap** (low effort, high impact): repo folder + schema + signing; enable per‑PR evidence manifests.
2. **OPA deny‑by‑default bundle** for Conductor actions (low, high): ship a minimal bundle + tests (samples below).
3. **Detections v0** for NL→Cypher and ingest anomalies (low, high): two Sigma/TTP rules + Grafana panels.
4. **Cost guardrails** (low, high): request caps + alerts on token/egress; kill‑switches via feature flags.

**Near‑Term (Sprints 1–3):**
5. **Evidence Bundle at Release** (med, high): signed SBOM, policy test report, pipeline provenance, dataset lineage.
6. **Secrets & Identity** (med, high): rotation playbook + vault CSI enforcement + scoped service accounts.
7. **Incident Playbooks** (med, high): BEC (supply‑chain), data leak, pipeline compromise—tabletop‑first with RACI.

**Strategic (Q4):**
8. **Bitemporal registry + consent gates** integrated in ER pipeline (med, high).
9. **Adjudication UI + audit trail** (med, high).
10. **Golden Path conformance tests** in CI (med, high).

---

## D) Sprint Cadence (Oct → Dec 2025)
**Operating principle:** weekly **staging** cut; **production** every other Wednesday.

| Sprint | Window (Weds→Tues) | Prod Release | Theme | DoD‑V (Definition of Done – Victory) |
|---|---|---|---|---|
| **S‑01** | **2025‑10‑01 → 2025‑10‑14** | 2025‑10‑15 | Conductor Bootstrap + Evidence v0 | Victory Ledger online; OPA bundle v0 with unit tests; 2 detections live; cost guard v0; signed evidence bundle emitted on cut. |
| **S‑02** | **2025‑10‑15 → 2025‑10‑28** | 2025‑10‑29 | Ingest & NL→Cypher Hardening | More detections; runbooks v1; secrets rotation dry‑run; staging chaos‑day; evidence v1 (SBOM + test report). |
| **S‑03** | **2025‑10‑29 → 2025‑11‑11** | 2025‑11‑12 | Consent & Provenance Gates | ER bitemporal hooks; consent checks; policy gate SLOs; audit trail endpoints. |
| **S‑04** | **2025‑11‑12 → 2025‑11‑25** | 2025‑11‑26 | Adjudication & GraphRAG Guardrails | Adjudication UI (MVP), RL controller guardrails, hallucination/PII detectors. |
| **S‑05** | **2025‑11‑26 → 2025‑12‑09** | 2025‑12‑10 | GA Readiness I | Golden Path conformance suite; DR tabletop; cost targets met. |
| **S‑06** | **2025‑12‑10 → 2025‑12‑23** | 2025‑12‑24 | GA Readiness II (Freeze+Docs) | Evidence catalog, operator runbooks finalized, change mgmt sign‑offs. |

**Ceremonies (all CST):**
- **Wed 09:00** Kickoff (scope, risks, gates) • **Wed 16:00** Staging cut • **Fri 10:00** Risk review • **Tue 14:00** Demo & retro • **Prod** every other Wed 16:30 with release notes + evidence bundle.

---

## E) DIRK IG Workstream (Backlog by Stream)
### W1 — Provable Compliance & Evidence
- Victory Ledger repo structure and signing
- Evidence Bundle generator (SBOM, policy tests, lineage)
- Release gates (OPA): deny‑by‑default with scoped allow rules
- Audit endpoints & hash registry; immutability storage hook

### W2 — Operational Hardening (Graph/Conductor)
- Detections for ingest anomalies, NL→Cypher abuse, long‑running jobs
- Cost guard: token/egress caps, autoscale policy, kill‑switches
- Runbooks: incident triage, rotation, rollback; RACI & comms templates
- Golden Path CI: `make up` / smoke tests as blocking gate

### W3 — Data Governance & Consent
- Bitemporal schema + time‑travel reads; consent/contract enforcement
- Adjudication UI & audit: decision logs, appeal path, retention clocks
- Dataset/feature lineage capture integrated with Evidence Bundle

---

## F) Gap‑Closers (Seeing Around Corners)
1. **Evidence Orphans**: releases without complete proofs → **Action:** fail release if Evidence Bundle missing required sections (policy tests, SBOM, lineage hashes).
2. **Secrets Drift**: ad‑hoc secrets in env → **Action:** enforce Vault CSI; PR check fails if raw secret found; rotation runbook + schedule.
3. **Cost Overrun** on LLM paths → **Action:** per‑tenant budget ceilings; alerting + auto‑throttle; weekly cost report to Victory Ledger.
4. **Unmodeled NL→Cypher abuse** → **Action:** detections + query shape limits; blocklist/allowlist; anomaly alerts.
5. **Change Approval Ambiguity** → **Action:** Conductor policy requiring named approvers, signed notes, and hash references in release PR.
6. **Disaster Recovery** gaps → **Action:** tabletop + restore test (RTO/RPO), documented in Evidence Bundle.
7. **SBOM/Signing coverage** uneven → **Action:** move to pipeline‑generated, signed SBOMs; verify on deploy.

---

## G) Artifacts (Ready‑to‑Ship Templates)
### 1) OPA/ABAC Bundle (skeleton)
```
package conductor.release

# Default‑deny
default allow := false

# Allow release when evidence bundle proves required checks
allow {
  input.evidence.sbom.signed == true
  input.evidence.tests.pass == true
  input.evidence.provenance.hashes_valid == true
  input.change.approvals["security"] == "approved"
  input.change.approvals["qa"] == "approved"
}

# Block if cost guard not enabled for tenant
deny["cost_guard_missing"] {
  not input.runtime.cost_guard.enabled
}
```

**OPA Bundle Layout**
```
opa-bundle/
  policies/
    conductor.rego
  data/
    required_checks.json
  tests/
    conductor_test.rego
  manifest.json
```

### 2) Sigma Detections (TTP→Rule)
**A) NL→Cypher Abuse (excessive CREATE/DETACH)**
```
title: IG NL2Cypher Excessive Graph Mutation
id: d6a1b8e0-ig-001
status: experimental
logsource:
  product: intelgraph
  service: nl2cypher
  category: application
selection:
  operation: ["CREATE", "DETACH", "DELETE"]
  count_gt: 50
  window: 5m
condition: selection
fields: [user, tenant, model, tokens, ip]
level: high
```
**B) Ingest Anomaly (schema drift)**
```
title: IG Ingest Schema Drift Spike
id: d6a1b8e0-ig-002
status: experimental
logsource:
  product: intelgraph
  service: ingest
selection:
  error_type: ["UnknownProperty", "MissingConstraint"]
  count_gt: 20
  window: 10m
condition: selection
level: medium
```

### 3) Runbook (Incident: Pipeline Compromise)
**Trigger:** unsigned artifact detected in release pipeline.
**Roles:** IC (A), Sec (R), SRE (R), PM (C), Legal/Comms (I)
**Steps:**
1. Freeze pipeline; revoke tokens; capture build logs & hashes.
2. Compare SBOM vs. expected; run signature verification; snapshot infra state.
3. Root‑cause; rotate credentials; patch; re‑run with heightened logging.
4. Post‑Action: Evidence Bundle report + risk entry update.

### 4) Dashboard (KPIs/KRIs)
- **TTD/MTTR**, **control coverage %**, **evidence completeness %**, **cost per 1k tokens**, **egress per tenant**, **anomaly rates**.
- Panels sourcing: pipeline events, OPA decisions, Sigma alerts, cost meter, SBOM signer.

### 5) Risk Ledger Entries (initial)
| ID | Risk | Likelihood | Impact | Owner | Mitigation | Residual |
|---|---|---|---|---|---|---|
| R‑01 | Evidence gap on release | Med | High | MC | Evidence gate w/ OPA | Low |
| R‑02 | Secrets drift | Med | High | Sec | Vault CSI + scans | Low |
| R‑03 | LLM cost surge | Med | Med | Eng | Budget caps + alerts | Low |
| R‑04 | NL→Cypher abuse | Low‑Med | High | Eng | Detections + limits | Med |
| R‑05 | Supply‑chain/signing break | Low | High | SRE | Sign/verify mandatory | Low |

---

## H) Proof‑Carrying Analysis (PCA)
**Assumptions:** October pack and Summit repo are source‑of‑truth for cadence and backlog; GA target requires verifiable evidence on release. No access beyond provided artifacts; no production data touched.

**Evidence:** Hashes above; sampled sprint files (e.g., 2025‑10‑01 plan) show biweekly cadence and evidence intent; IntelGraph README enforces deployable‑first golden path.

**Caveats:** ZIP snapshots may trail the GitHub tip; some documents show draft status; exact infra (cloud/provider) unspecified.

**Checks:**
- Cadence dates normalized to **Wednesdays** (CST) and mapped to sprint files (Oct→Dec).
- All recommendations align to **deny‑by‑default**, **minimum‑necessary access**, and **audit‑ready** artifacts.

---

## I) Kickoff Agenda (Sprint 2025‑10‑01)
1. Confirm owners & RACI for Evidence Bundle.
2. Approve OPA required checks (min set above).
3. Wire cost guard toggles + alerting.
4. Land two detections + one dashboard; demo in staging.
5. Define rollback paths and freeze criteria for prod cut 2025‑10‑15.

---

## J) Definition of Done — Victory (DoD‑V)
- **Win conditions met** per sprint table.
- **Proofs attached** (signed Evidence Bundle with SBOM, policy tests, lineage, approvals).
- **Rollback verified** (dry‑run) and **owners assigned** for follow‑through.

---

*Prepared by DIRK IG (Directorate K++). This document is auditable and designed for sprint execution immediately.*


---

## S‑02 Detailed Sprint Plan (2025‑10‑15 → 2025‑10‑28)
**Timezone:** America/Phoenix • **Prod Cut:** 2025‑10‑29 @ 16:30 • **Theme:** Ingest & NL→Cypher Hardening • **Leads:** Eng (A), Sec (R), SRE (R), PM (C)

### Objectives (what we must ship)
1) **Evidence Bundle v1** on staging & prod cuts (adds SBOM + policy test report).
2) **Secrets rotation dry‑run** with Vault CSI enforcement and PR secret scan gate.
3) **Detections expansion**: four new high‑signal rules + Grafana panels.
4) **Runbooks v1** for ingest/NL→Cypher incidents, with on‑call drill.

### Scope → Stories
- **EB‑101** Evidence Generator adds SBOM (CycloneDX) + Test Report (JUnit XML). DoD: bundle signed, hash recorded in Victory Ledger.
- **SEC‑112** Vault CSI required for `ingest`, `nl2cypher`, `conductor` pods. DoD: pod admission policy blocks non‑CSI secrets.
- **SEC‑113** Pre‑merge secret scan (trufflehog‑like) + deny on match; false‑positive override requires security approval.
- **DET‑201..204** Implement four Sigma rules (below), route to alert bus, wire panels.
- **OPS‑130** On‑call drill: simulate NL→Cypher abuse & ingest schema drift (tabletop + timed response).
- **COST‑090** Token/egress caps per tenant; alert to #ops and Victory Ledger weekly report.

### Definition of Done — Sprint S‑02
- Evidence Bundle v1 emitted on staging cut + prod; signatures verified in pipeline.
- Vault CSI policy live; rotation dry‑run executed and logged.
- 6 total detections active (2 from S‑01 + 4 new); dashboards show events & MTTR.
- Runbooks v1 published; on‑call drill results added to Evidence Bundle.

### Risks & Mitigations
- **Schema validation noise** → tighten thresholds, add suppression with owner.
- **Secret scan false positives** → documented override path with signed justification.
- **Cost cap blocking legit jobs** → staged rollout with per‑tenant dry‑run first.

---

## Expanded Artifacts for S‑02

### 1) OPA Bundle — Unit Tests & Required Checks (Rego)
```rego
package conductor.release

# Default deny
default allow := false

# Required checks data (can be overridden via data/required_checks.json)
required := {
  "sbom_signed": true,
  "tests_min_pass_rate": 0.95,
  "provenance_ok": true,
  "approvals": {"security": "approved", "qa": "approved"}
}

allow {
  input.evidence.sbom.signed == required.sbom_signed
  input.evidence.tests.pass_rate >= required.tests_min_pass_rate
  input.evidence.provenance.hashes_valid == required.provenance_ok
  input.change.approvals["security"] == required.approvals.security
  input.change.approvals["qa"] == required.approvals.qa
  not deny[_]
}

# Deny if cost guard disabled for tenant
deny["cost_guard_missing"] {
  not input.runtime.cost_guard.enabled
}

# Deny if unsigned artifacts detected
deny[reason] {
  some a
  input.evidence.artifacts[a].signed == false
  reason := sprintf("unsigned_artifact:%s", [a])
}
```

**Unit Tests (Rego)**
```rego
package conductor.release
import data.conductor.release

test_allow_when_all_checks_pass {
  input := {
    "evidence": {
      "sbom": {"signed": true},
      "tests": {"pass_rate": 0.99},
      "provenance": {"hashes_valid": true},
      "artifacts": {"api": {"signed": true}}
    },
    "change": {"approvals": {"security": "approved", "qa": "approved"}},
    "runtime": {"cost_guard": {"enabled": true}}
  }
  allow with input as input
}

test_deny_when_unsigned_artifact {
  input := {
    "evidence": {
      "sbom": {"signed": true},
      "tests": {"pass_rate": 0.99},
      "provenance": {"hashes_valid": true},
      "artifacts": {"api": {"signed": false}}
    },
    "change": {"approvals": {"security": "approved", "qa": "approved"}},
    "runtime": {"cost_guard": {"enabled": true}}
  }
  not allow with input as input
}

test_deny_when_cost_guard_missing {
  input := {
    "evidence": {"sbom": {"signed": true}, "tests": {"pass_rate": 0.99}, "provenance": {"hashes_valid": true}},
    "change": {"approvals": {"security": "approved", "qa": "approved"}},
    "runtime": {"cost_guard": {"enabled": false}}
  }
  not allow with input as input
}
```

**Bundle Data — required_checks.json**
```json
{
  "sbom_signed": true,
  "tests_min_pass_rate": 0.95,
  "provenance_ok": true,
  "approvals": {"security": "approved", "qa": "approved"}
}
```

### 2) Sigma Detections — New Rules (S‑02)
**C) LLM Cost Surge Per Tenant**
```
title: IG Tenant LLM Cost Surge
id: d6a1b8e0-ig-003
status: experimental
logsource:
  product: intelgraph
  service: llm_gateway
  category: application
selection:
  metric: "cost_per_10k_tokens_usd"
  delta_pct_gt: 100
  window: 15m
condition: selection
level: medium
fields: [tenant, model, route, tokens_10k, cost_usd]
```

**D) NL→Cypher Anomalous Query Shape (fan‑out)**
```
title: IG NL2Cypher Fan-out Anomaly
id: d6a1b8e0-ig-004
status: experimental
logsource:
  product: intelgraph
  service: nl2cypher
selection:
  estimated_nodes_touched_gt: 50000
  query_type: "READ"
  window: 5m
condition: selection
level: high
```

**E) Privilege Escalation Attempt (Conductor Policy Bypass)**
```
title: IG Conductor Policy Bypass Attempt
id: d6a1b8e0-ig-005
status: experimental
logsource:
  product: conductor
  service: release
selection:
  decision: "deny"
  reason: /cost_guard_missing|unsigned_artifact|approvals_missing/
  attempts_ge: 3
  window: 30m
condition: selection
level: high
```

**F) Unexpected Outbound Egress Spike**
```
title: IG Unexpected Egress Spike
id: d6a1b8e0-ig-006
status: experimental
logsource:
  product: infra
  service: egress_meter
selection:
  egress_gb_delta_gt: 10
  window: 10m
condition: selection
level: high
fields: [tenant, namespace, node, dest_cidr]
```

### 3) Evidence Bundle Manifest — JSON Schema (Draft 2020‑12)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit/intelgraph/evidence-bundle.schema.json",
  "title": "EvidenceBundle",
  "type": "object",
  "required": ["version", "release", "sbom", "tests", "provenance", "approvals", "hashes", "signatures"],
  "properties": {
    "version": {"type": "string", "pattern": "^v[0-9]+\.[0-9]+$"},
    "release": {
      "type": "object",
      "required": ["tag", "commit", "timestamp"],
      "properties": {
        "tag": {"type": "string"},
        "commit": {"type": "string", "pattern": "^[a-f0-9]{7,40}$"},
        "timestamp": {"type": "string", "format": "date-time"}
      }
    },
    "sbom": {
      "type": "object",
      "required": ["format", "location", "signed"],
      "properties": {
        "format": {"type": "string", "enum": ["CycloneDX", "SPDX"]},
        "location": {"type": "string"},
        "signed": {"type": "boolean"}
      }
    },
    "tests": {
      "type": "object",
      "required": ["pass_rate", "report"],
      "properties": {
        "pass_rate": {"type": "number", "minimum": 0, "maximum": 1},
        "report": {"type": "string"}
      }
    },
    "provenance": {
      "type": "object",
      "required": ["pipeline", "materials", "hashes_valid"],
      "properties": {
        "pipeline": {"type": "string"},
        "materials": {"type": "array", "items": {"type": "string"}},
        "hashes_valid": {"type": "boolean"}
      }
    },
    "approvals": {
      "type": "object",
      "required": ["security", "qa"],
      "properties": {
        "security": {"type": "string", "enum": ["approved", "rejected"]},
        "qa": {"type": "string", "enum": ["approved", "rejected"]}
      }
    },
    "hashes": {
      "type": "object",
      "additionalProperties": {"type": "string", "pattern": "^[a-f0-9]{64}$"}
    },
    "signatures": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["signer", "sig", "algo"],
        "properties": {
          "signer": {"type": "string"},
          "sig": {"type": "string"},
          "algo": {"type": "string", "enum": ["ed25519", "ecdsa"]}
        }
      }
    }
  }
}
```

### 4) CI/CD Snippets (non‑binding examples)
**GitHub Actions — Evidence Bundle Gate**
```yaml
name: release
on:
  workflow_dispatch:
  push:
    tags: ["v*"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        run: make sbom
      - name: Run Tests
        run: make test && make test-report
      - name: Build Evidence Bundle
        run: make evidence
      - name: OPA Gate
        uses: open-policy-agent/opa-action@v2
        with:
          policy-path: opa-bundle/policies
          input: evidence/bundle.json
```

---

## PCA (for S‑02 Additions)
- **Assumptions:** Same as prior PCA; adds cost guard & Vault CSI enforcement.
- **Checks:** Unit tests ensure OPA gate behavior; JSON Schema validates bundle. Dashboards confirm rule firing in staging.
- **Confidence:** Medium‑High; tune thresholds post‑tabletop.


---

## Pre‑wired Artifacts (S‑02 Support)

### A) Grafana Dashboard JSON (starter)
```json
{
  "uid": "ig-ops-v1",
  "title": "IntelGraph Ops — Controls & Cost",
  "schemaVersion": 38,
  "version": 1,
  "time": {"from": "now-24h", "to": "now"},
  "panels": [
    {
      "type": "timeseries",
      "title": "Sigma Alerts by Rule (rate)",
      "id": 1,
      "datasource": {"type": "prometheus", "uid": "prom"},
      "targets": [{
        "expr": "sum by(rule_id) (rate(intelgraph_sigma_alerts_total[5m]))",
        "legendFormat": "{{rule_id}}"
      }]
    },
    {
      "type": "timeseries",
      "title": "OPA Decisions (allow vs deny)",
      "id": 2,
      "datasource": {"type": "prometheus", "uid": "prom"},
      "targets": [{
        "expr": "sum by(decision) (rate(conductor_opa_decisions_total[5m]))",
        "legendFormat": "{{decision}}"
      }]
    },
    {
      "type": "timeseries",
      "title": "LLM Cost per 10k Tokens (by tenant)",
      "id": 3,
      "datasource": {"type": "prometheus", "uid": "prom"},
      "targets": [{
        "expr": "sum by(tenant) (rate(ig_llm_cost_usd_per_10k_tokens[5m]))",
        "legendFormat": "{{tenant}}"
      }]
    },
    {
      "type": "timeseries",
      "title": "Egress GB (by namespace)",
      "id": 4,
      "datasource": {"type": "prometheus", "uid": "prom"},
      "targets": [{
        "expr": "sum by(namespace) (rate(infra_egress_gb_total[5m]))",
        "legendFormat": "{{namespace}}"
      }]
    },
    {
      "type": "stat",
      "title": "Evidence Bundle Completeness % (last cut)",
      "id": 5,
      "datasource": {"type": "prometheus", "uid": "prom"},
      "targets": [{
        "expr": "100 * (ig_evidence_checks_passed / ig_evidence_checks_required)",
        "legendFormat": "completeness"
      }]
    }
  ]
}
```

**Notes:**
- Prometheus metric names are placeholders; wire to your emitters (Sigma, OPA decision exporter, cost meter, egress meter, evidence checker).
- Import via Grafana UI → Dashboards → Import → paste JSON.

### B) Vault CSI Admission Policy (Kyverno)
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-vault-csi-and-block-raw-secrets
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: block-raw-secret-volumes
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        message: "Raw Secret volumes are not allowed; use Vault CSI (secrets-store.csi.k8s.io)."
        pattern:
          spec:
            =(volumes):
              - X(all):
                  X(anyPattern):
                    - X(not):
                        secret: "*"
    - name: require-vault-csi-volume
      match:
        any:
          - resources:
              kinds: [Pod]
              namespaces: ["ingest", "nl2cypher", "conductor"]
      validate:
        message: "Pods must mount a CSI volume using secrets-store.csi.k8s.io"
        pattern:
          spec:
            volumes:
              - csi:
                  driver: secrets-store.csi.k8s.io
```

**Optional (Gatekeeper variant)**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredCSIVolume
metadata:
  name: require-vault-csi
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["ingest", "nl2cypher", "conductor"]
  parameters:
    driver: secrets-store.csi.k8s.io
```

### C) Mock Evidence Bundle (staging sample)
```json
{
  "version": "v1.0",
  "release": {
    "tag": "v0.9.2-rc1",
    "commit": "9f3b1c7",
    "timestamp": "2025-10-15T21:30:00Z"
  },
  "sbom": {
    "format": "CycloneDX",
    "location": "s3://artifacts/staging/v0.9.2-rc1/sbom.json",
    "signed": true
  },
  "tests": {
    "pass_rate": 0.98,
    "report": "s3://artifacts/staging/v0.9.2-rc1/junit.xml"
  },
  "provenance": {
    "pipeline": "github-actions:release@main",
    "materials": [
      "docker://ghcr.io/summit/conductor@sha256:63...",
      "git+ssh://github.com/BrianCLong/summit@9f3b1c7"
    ],
    "hashes_valid": true
  },
  "approvals": {"security": "approved", "qa": "approved"},
  "hashes": {
    "bundle": "a3f1b0e9d2a4c1e6f7a0b9c8d7e6f5a4c3b2a1908f7e6d5c4b3a291817161514",
    "sbom": "b9c1a7d3e5f6089a1b2c3d4e5f6a7b8c9d00112233445566778899aabbccdde0"
  },
  "signatures": [
    {"signer": "dirk-ig@directorate", "sig": "BASE64_SIG==", "algo": "ed25519"}
  ]
}
```

---

## S‑03 Detailed Sprint Plan (2025‑10‑29 → 2025‑11‑11)
**Prod Cut:** 2025‑11‑12 @ 16:30 • **Theme:** Consent & Provenance Gates • **Leads:** Eng (A), Sec (R), SRE (R), PM (C), Data Gov (R)

### Objectives
1) **Consent enforcement** at request time via OPA (tenant, purpose, dataset contract).
2) **Bitemporal hooks** (valid‑time + system‑time) for ER pipeline with time‑travel reads.
3) **Audit trail endpoints** (append‑only) + policy SLOs/SLIs emitted to Prometheus.
4) **Evidence Bundle v1.1** (adds consent report + lineage snapshot).

### Scope → Stories
- **POL‑210** Rego package `consent.request` with purpose- and tenant‑scoped allow rules; unit tests + golden cases.
- **ER‑301** Add `valid_time` & `system_time` columns + migration; implement time‑travel read API (MVP).
- **AUD‑220** Append‑only audit log service with hash‑chain; expose `/audit/verify` endpoint.
- **OBS‑205** Export SLIs: policy evaluation latency, decision rate, consent denies.
- **EB‑115** Extend Evidence Bundle with consent & lineage sections; update schema + generator.

### Definition of Done — Sprint S‑03
- OPA consent gate live in staging (shadow mode 48h, then enforce) with ≥99% policy eval < 50ms P95.
- ER pipeline writes bitemporal fields; time‑travel reads pass tests.
- Audit trail API returns verifiable chain; Prometheus metrics on dashboards.
- Evidence Bundle v1.1 shipped on prod cut; signatures verified.

### Risks & Mitigations
- **Policy false denies** → shadow mode + allowlist for critical services; rapid rule patch.
- **Storage growth from bitemporal** → partitioning + TTL for cold snapshots.
- **Audit chain verification cost** → batch verification + checkpoint anchors per N entries.

### Artifacts
**Rego (consent.request) skeleton**
```rego
package consent.request

default allow := false

# Input expectation:
# input := {"tenant": "t1", "purpose": "ops", "dataset": "graphA", "consent": {"ops": true}}

allow {
  input.tenant != ""
  input.dataset != ""
  input.purpose == "ops"
  input.consent[input.purpose] == true
}

# Deny when purpose missing or not consented
deny[reason] {
  not input.consent[input.purpose]
  reason := "purpose_not_consented"
}
```

**DB Migration (pseudo‑SQL)**
```sql
ALTER TABLE er_records
  ADD COLUMN valid_time tstzrange NOT NULL,
  ADD COLUMN system_time tstzrange NOT NULL DEFAULT tstzrange(now(), NULL, '[)');
CREATE INDEX ON er_records USING GIST (valid_time);
CREATE INDEX ON er_records USING GIST (system_time);
```

**Audit Trail Hash Chain (spec)**
- Each entry `E_n` stores `hash_prev`, `hash_self = H(E_n_without_hash_self || hash_prev)`.
- Checkpoints every 10k entries with signed snapshot in Victory Ledger.

**Prometheus Metrics (names)**
- `opa_consent_eval_seconds_bucket` • `opa_consent_decisions_total{decision="allow|deny"}` • `audit_chain_verify_seconds` • `consent_denies_total`.


---

## S‑04 Detailed Sprint Plan (2025‑11‑12 → 2025‑11‑25)
**Prod Cut:** 2025‑11‑26 @ 16:30 • **Theme:** Adjudication & GraphRAG Guardrails • **Leads:** Eng (A), Sec (R), SRE (R), PM (C), UX (R)

### Objectives
1) **Adjudication UI (MVP)** with decision logs, appeal path, and audit trail links.
2) **GraphRAG guardrails**: rate/route limits, prompt safety policies, hallucination & PII detectors.
3) **Quality harness**: eval datasets + scoring for NL→Cypher & RAG answers; wired to Evidence Bundle.
4) **Alerts/Recording**: production‑grade Grafana alerts + Prometheus recording rules.

### Scope → Stories
- **UI‑401** Adjudication UI (Next.js) with views: queue, case detail, decision form; role‑aware.
- **RAG‑420** RL controller: per‑tenant QPS, max fan‑out, token ceilings; feature flags.
- **SAFE‑430** Prompt risk Rego policies + detectors (hallucination, PII leak); shadow → enforce.
- **EVAL‑440** Golden eval sets + scorer; produce per‑release quality report.
- **OBS‑450** Recording rules + Grafana alert rules; runbook links embedded.
- **EB‑125** Evidence Bundle v1.2 adds `quality` and `adjudication` sections.

### Definition of Done — Sprint S‑04
- UI live in staging, audit‑backed; ≥1 adjudication flow exercised and logged.
- Guardrails enforcing in staging; shadow in prod for 72h; violations alert with context.
- Quality harness runs in CI; metrics exported + bundled in Evidence.
- Alerts and recording rules enabled with paging to on‑call.

### Risks & Mitigations
- **Over‑blocking** → staged enforcement, per‑tenant overrides.
- **Alert fatigue** → SLO‑backed thresholds; aggregate notifications.

---

## Deeper Artifacts (S‑02/S‑03/S‑04)

### 1) Grafana Alert Rules (JSON, unified)
```json
{
  "apiVersion": 1,
  "groups": [
    {
      "name": "intelgraph-controls",
      "interval": "1m",
      "rules": [
        {
          "uid": "rule-opa-deny-spike",
          "title": "OPA Deny Spike",
          "condition": "A > 5",
          "data": [
            {
              "refId": "A",
              "relativeTimeRange": {"from": 300, "to": 0},
              "datasourceUid": "prom",
              "model": {
                "expr": "sum(rate(conductor_opa_decisions_total{decision=\"deny\"}[5m]))"
              }
            }
          ],
          "for": "5m",
          "annotations": {"runbook": "wiki/runbooks/opa-deny"},
          "labels": {"severity": "high"}
        },
        {
          "uid": "rule-egress-spike",
          "title": "Unexpected Egress Spike",
          "condition": "A > 5",
          "data": [
            {
              "refId": "A",
              "relativeTimeRange": {"from": 600, "to": 0},
              "datasourceUid": "prom",
              "model": {
                "expr": "sum(rate(infra_egress_gb_total[10m]))"
              }
            }
          ],
          "for": "10m",
          "annotations": {"runbook": "wiki/runbooks/egress-spike"},
          "labels": {"severity": "critical"}
        },
        {
          "uid": "rule-llm-cost-surge",
          "title": "LLM Cost Surge per Tenant",
          "condition": "A > 1",
          "data": [
            {
              "refId": "A",
              "relativeTimeRange": {"from": 900, "to": 0},
              "datasourceUid": "prom",
              "model": {
                "expr": "max_over_time(ig_llm_cost_surge[15m])"
              }
            }
          ],
          "for": "15m",
          "annotations": {"runbook": "wiki/runbooks/llm-cost"},
          "labels": {"severity": "medium"}
        }
      ]
    }
  ]
}
```

### 2) Prometheus Recording Rules (YAML)
```yaml
groups:
  - name: intelgraph-core
    interval: 30s
    rules:
      - record: job:opa_denies_per_s:rate5m
        expr: sum(rate(conductor_opa_decisions_total{decision="deny"}[5m]))
      - record: tenant:llm_cost_surge
        expr: max_over_time(ig_llm_cost_usd_per_10k_tokens[15m]) / avg_over_time(ig_llm_cost_usd_per_10k_tokens[6h])
      - record: ns:egress_gb_per_s:rate10m
        expr: sum by (namespace) (rate(infra_egress_gb_total[10m]))
      - record: evidence:completeness
        expr: 100 * (ig_evidence_checks_passed / ig_evidence_checks_required)
```

### 3) Helm Chart — Policy Bundle & Observability (scaffold)
```
charts/
  summit-policies/
    Chart.yaml
    values.yaml
    templates/
      opa-configmap.yaml
      opa-deployment.yaml
      kyverno-policy.yaml
      recording-rules-cm.yaml
      grafana-alerts-cm.yaml
```

**Chart.yaml**
```yaml
apiVersion: v2
name: summit-policies
version: 0.1.0
description: OPA + Kyverno policies, recording rules, and Grafana alerts for IntelGraph
```

**values.yaml (excerpt)**
```yaml
opa:
  bundle:
    name: opa-bundle
    data: |
      # base64 or inline JSON for policies/data
kyverno:
  enabled: true
  policyNamespaces: ["ingest", "nl2cypher", "conductor"]
prometheus:
  recordingRules: |
    {{- "" | nindent 0 }}
grafana:
  alerts: |
    {{- "" | nindent 0 }}
```

**templates/opa-configmap.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "summit-policies.fullname" . }}-opa-bundle
  labels: { app.kubernetes.io/name: {{ .Chart.Name }} }
data:
  bundle.tar.gz.b64: {{ .Values.opa.bundle.data | b64enc | quote }}
```

**templates/opa-deployment.yaml** (sidecar example)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa-conductor
spec:
  selector:
    matchLabels: { app: opa-conductor }
  template:
    metadata:
      labels: { app: opa-conductor }
    spec:
      containers:
        - name: opa
          image: openpolicyagent/opa:latest
          args: ["run", "--server", "--bundle", "/bundles/bundle.tar.gz"]
          volumeMounts:
            - name: bundle
              mountPath: /bundles
      volumes:
        - name: bundle
          configMap:
            name: {{ include "summit-policies.fullname" . }}-opa-bundle
            items:
              - key: bundle.tar.gz.b64
                path: bundle.tar.gz
```

**templates/kyverno-policy.yaml**
```yaml
{{- if .Values.kyverno.enabled }}
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-vault-csi
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-csi
      match:
        any:
          - resources:
              kinds: [Pod]
              namespaces: {{ toYaml .Values.kyverno.policyNamespaces | nindent 14 }}
      validate:
        message: "Pods must use secrets-store.csi.k8s.io"
        pattern:
          spec:
            volumes:
              - csi:
                  driver: secrets-store.csi.k8s.io
{{- end }}
```

**templates/recording-rules-cm.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: intelgraph-recording-rules
  labels: { release: prometheus }
data:
  rules.yaml: |
{{ .Values.prometheus.recordingRules | indent 4 }}
```

**templates/grafana-alerts-cm.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-alerts
  labels: { app.kubernetes.io/name: grafana }
data:
  alerts.json: |
{{ .Values.grafana.alerts | indent 4 }}
```

### 4) Detectors — Hallucination & PII (pseudo)
- **Hallucination heuristic:** high answer entropy + low citation density + OOD query → raise `risk=hallucination`.
- **PII detector:** regex + ML for emails, SSNs, phone, gov IDs; block if tenant policy disallows.

**Rego (prompt risk)**
```rego
package rag.prompt_risk

risk["pii"] { input.contains_pii == true }
risk["hallucination"] { input.quality.score < 0.6; input.citations.count == 0 }

default allow := false
allow { count(risk) == 0 }
```

### 5) Evidence Bundle v1.2 (additions)
```json
{
  "quality": {"nl2cypher_score": 0.92, "rag_f1": 0.71, "detector_fp_rate": 0.03},
  "adjudication": {"cases": 7, "reversals": 1, "median_ttr_sec": 420}
}
```

---

## S‑05 Detailed Sprint Plan (2025‑11‑26 → 2025‑12‑09)
**Prod Cut:** 2025‑12‑10 @ 16:30 • **Theme:** GA Readiness I • **Leads:** Eng (A), Sec (R), SRE (R), PM (C), QA (R)

### Objectives
1) **Golden Path conformance suite** enforced in CI as blocking gate.
2) **DR/BC tabletop + restore test** (RTO/RPO) documented in Evidence Bundle.
3) **Performance & cost targets** validated; load test with SLOs.
4) **Security review**: signing, SBOM, secrets, policy coverage.

### Scope → Stories
- **CONF‑500** Conformance specs + tests for install, ingest, NL→Cypher, RAG, adjudication; junit output.
- **DR‑510** Backup/restore dry‑run of graph + artifacts; report with timings and gaps.
- **PERF‑520** k6/Locust scenario for QPS, latency, token budget; SLO dashboards/alerts.
- **SEC‑530** Supply chain review: verify signatures, SBOM diff; policy coverage report.
- **EB‑135** Evidence Bundle v1.3 (adds DR, performance, security sections).

### DoD — Sprint S‑05
- All conformance tests pass in CI on prod cut tag; failures block release.
- DR restore achieves target RTO/RPO; report signed.
- Performance meets SLOs; cost within budget ceilings for 7‑day window.
- Security review signed by Sec + QA.

### Artifacts
**Conformance Matrix (excerpt)**
| Area | Check | Method | DoD |
|---|---|---|---|
| Install | Helm install succeeds | `helm install` + smoke tests | All pods Ready < 5m |
| Ingest | Schema registration | POST /schema → 200 | Errors < 1% |
| NL→Cypher | Query limits | shape ≤ limit | No deny for valid paths |
| RAG | Answer quality | F1 ≥ 0.70 | Eval harness report |
| Adjudication | Case lifecycle | create→decide→appeal | Audit entries consistent |

**k6 skeleton**
```js
import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = { stages: [ { duration: '5m', target: 200 } ] };
export default function() {
  const res = http.post('https://api/graph/rag', JSON.stringify({q:"test"}));
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

**Evidence v1.3 additions**
```json
{ "dr": {"rto_sec": 1800, "rpo_sec": 300, "success": true},
  "performance": {"p95_ms": 280, "qps": 180},
  "security": {"sbom_diff": 0, "unsigned": 0, "policy_coverage_pct": 92} }
```


---

## S‑06 Detailed Sprint Plan (2025‑12‑10 → 2025‑12‑23)
**Prod Cut:** 2025‑12‑24 @ 16:30 • **Theme:** GA Readiness II (Freeze + Docs) • **Leads:** PM (A), Eng (R), Sec (R), SRE (R), Docs (R), Support (C)

### Objectives
1) **Change freeze** with emergency‑only path; verify rollback.
2) **Operator & auditor docs** complete; Evidence Catalog generated.
3) **Runbook finalization** and RACI sign‑offs; on‑call schedule confirmed.
4) **Freeze validations** (policy coverage, SBOM/signing, DR artifacts) auto‑checked.

### Scope → Stories
- **REL‑600** Freeze policy in Conductor (OPA rule + calendar window + override group).
- **DOC‑610** Operator handbook + auditor guide (Evidence Catalog, controls mapping).
- **RUN‑620** Runbooks v1.1 (pipeline compromise, data leak, cost overrun, policy deny) with comms templates.
- **VAL‑630** Freeze validation job: verify SBOM/sign, policy coverage, DR/restore artifacts; write result to Victory Ledger.
- **OPS‑640** Final tabletop (multi‑scenario) with lessons learned captured in Evidence Bundle v1.4.

### DoD — Sprint S‑06
- Freeze active; emergency change path tested and logged.
- Docs published; Evidence Catalog generated and hashed.
- Runbooks signed by Eng, Sec, SRE; on‑call calendar live.
- Validation job passes on prod cut; Evidence Bundle v1.4 attached.

### Artifacts
**OPA (release.freeze) — Rego**
```rego
package conductor.freeze

default allow := false

# Allow if within freeze window only for emergency approvers
allow {
  input.time.within_freeze == true
  input.change.type == "emergency"
  input.change.approvals["emergency_change_advisory_board"] == "approved"
}

# Allow outside freeze when standard approvals met
allow {
  input.time.within_freeze == false
  input.change.approvals["security"] == "approved"
  input.change.approvals["qa"] == "approved"
}
```

**Evidence Bundle v1.4 additions**
```json
{ "freeze": {"active": true, "window": "2025-12-18T00:00Z..2025-12-27T00:00Z", "overrides": 0},
  "docs": {"operator": "s3://docs/operator.pdf", "auditor": "s3://docs/auditor.pdf"},
  "validation": {"policy_coverage_pct": 95, "signatures_ok": true, "dr_artifacts_present": true} }
```

---

## Helm Values — **Ready-to-Apply** (policies + recording rules + alerts)
> Drop this into `charts/summit-policies/values.yaml` and run `helm upgrade --install summit-policies charts/summit-policies -f values.yaml`.

```yaml
opa:
  policies:
    conductor_release.rego: |
      package conductor.release
      default allow := false
      required := {
        "sbom_signed": true,
        "tests_min_pass_rate": 0.95,
        "provenance_ok": true,
        "approvals": {"security": "approved", "qa": "approved"}
      }
      allow {
        input.evidence.sbom.signed == required.sbom_signed
        input.evidence.tests.pass_rate >= required.tests_min_pass_rate
        input.evidence.provenance.hashes_valid == required.provenance_ok
        input.change.approvals["security"] == required.approvals.security
        input.change.approvals["qa"] == required.approvals.qa
        not deny[_]
      }
      deny["cost_guard_missing"] { not input.runtime.cost_guard.enabled }
      deny[reason] {
        some a
        input.evidence.artifacts[a].signed == false
        reason := sprintf("unsigned_artifact:%s", [a])
      }
    conductor_freeze.rego: |
      package conductor.freeze
      default allow := false
      allow {
        input.time.within_freeze == true
        input.change.type == "emergency"
        input.change.approvals["emergency_change_advisory_board"] == "approved"
      }
      allow {
        input.time.within_freeze == false
        input.change.approvals["security"] == "approved"
        input.change.approvals["qa"] == "approved"
      }
    consent_request.rego: |
      package consent.request
      default allow := false
      allow {
        input.tenant != ""
        input.dataset != ""
        input.purpose == "ops"
        input.consent[input.purpose] == true
      }
      deny[reason] {
        not input.consent[input.purpose]
        reason := "purpose_not_consented"
      }
    rag_prompt_risk.rego: |
      package rag.prompt_risk
      risk["pii"] { input.contains_pii == true }
      risk["hallucination"] { input.quality.score < 0.6; input.citations.count == 0 }
      default allow := false
      allow { count(risk) == 0 }
  data:
    required_checks.json: |
      {"sbom_signed": true, "tests_min_pass_rate": 0.95, "provenance_ok": true,
       "approvals": {"security": "approved", "qa": "approved"} }

kyverno:
  enabled: true
  policyNamespaces: ["ingest", "nl2cypher", "conductor"]
  policy: |
    apiVersion: kyverno.io/v1
    kind: ClusterPolicy
    metadata:
      name: require-vault-csi-and-block-raw-secrets
    spec:
      validationFailureAction: Enforce
      background: true
      rules:
        - name: block-raw-secret-volumes
          match:
            any:
              - resources:
                  kinds: [Pod]
          validate:
            message: "Raw Secret volumes are not allowed; use Vault CSI (secrets-store.csi.k8s.io)."
            pattern:
              spec:
                =(volumes):
                  - X(all):
                      X(anyPattern):
                        - X(not):
                            secret: "*"
        - name: require-vault-csi-volume
          match:
            any:
              - resources:
                  kinds: [Pod]
                  namespaces: ["ingest", "nl2cypher", "conductor"]
          validate:
            message: "Pods must mount a CSI volume using secrets-store.csi.k8s.io"
            pattern:
              spec:
                volumes:
                  - csi:
                      driver: secrets-store.csi.k8s.io

prometheus:
  recordingRules: |
    groups:
      - name: intelgraph-core
        interval: 30s
        rules:
          - record: job:opa_denies_per_s:rate5m
            expr: sum(rate(conductor_opa_decisions_total{decision="deny"}[5m]))
          - record: tenant:llm_cost_surge
            expr: max_over_time(ig_llm_cost_usd_per_10k_tokens[15m]) / avg_over_time(ig_llm_cost_usd_per_10k_tokens[6h])
          - record: ns:egress_gb_per_s:rate10m
            expr: sum by (namespace) (rate(infra_egress_gb_total[10m]))
          - record: evidence:completeness
            expr: 100 * (ig_evidence_checks_passed / ig_evidence_checks_required)

grafana:
  alerts: |
    {
      "apiVersion": 1,
      "groups": [
        {
          "name": "intelgraph-controls",
          "interval": "1m",
          "rules": [
            {
              "uid": "rule-opa-deny-spike",
              "title": "OPA Deny Spike",
              "condition": "A > 5",
              "data": [{"refId":"A","relativeTimeRange":{"from":300,"to":0},"datasourceUid":"prom","model":{"expr":"sum(rate(conductor_opa_decisions_total{decision=\\"deny\\"}[5m]))"}}],
              "for": "5m", "annotations": {"runbook": "wiki/runbooks/opa-deny"}, "labels": {"severity": "high"}
            },
            {
              "uid": "rule-egress-spike",
              "title": "Unexpected Egress Spike",
              "condition": "A > 5",
              "data": [{"refId":"A","relativeTimeRange":{"from":600,"to":0},"datasourceUid":"prom","model":{"expr":"sum(rate(infra_egress_gb_total[10m]))"}}],
              "for": "10m", "annotations": {"runbook": "wiki/runbooks/egress-spike"}, "labels": {"severity": "critical"}
            },
            {
              "uid": "rule-llm-cost-surge",
              "title": "LLM Cost Surge per Tenant",
              "condition": "A > 1",
              "data": [{"refId":"A","relativeTimeRange":{"from":900,"to":0},"datasourceUid":"prom","model":{"expr":"max_over_time(ig_llm_cost_surge[15m])"}}],
              "for": "15m", "annotations": {"runbook": "wiki/runbooks/llm-cost"}, "labels": {"severity": "medium"}
            }
          ]
        }
      ]
    }
```

**Helm templates note:** The chart includes a `templates/opa-policies-configmap.yaml` that writes each Rego/data entry above into individual files under `/policies`; the OPA container mounts that path and runs with `--policy /policies`. (This avoids tar.gz packaging.)

---

## S‑07 Detailed Sprint Plan (2025‑12‑24 → 2026‑01‑06)
**Prod Cut:** 2026‑01‑07 @ 16:30 • **Theme:** Stabilization & Customer Onboarding • **Leads:** Support (A), PM (R), Eng (R), Sec (C)

### Objectives
1) **Post‑GA stabilization** (bug burn‑down, perf tuning, noisy‑alert reductions).
2) **Customer onboarding kit** (tenancy setup, budgets, policies, dashboards) with self‑service Helm profile.
3) **Adoption telemetry** and **success metrics** wired to Victory Ledger.

### Scope → Stories
- **BUG‑700** Top‑10 bug remediation; weekly hotfix window (outside freeze dates).
- **ONB‑710** Tenant bootstrap Helm profile (limits, cost guard, default dashboards).
- **OBS‑720** Adoption metrics export (active tenants, QPS per route, MTTR, cost trend).
- **SEC‑730** Policy lint + drift audit; fix gaps.
- **EB‑145** Evidence Bundle v1.5 adds adoption & post‑GA stability metrics.

### DoD — Sprint S‑07
- Alert volume reduced ≥30% vs. S‑05 baseline with no MTTR regression.
- Onboarding kit deployed to first two tenants; docs validated by Support.
- Adoption metrics live on dashboards and recorded in Victory Ledger.

### Artifacts
**Helm profile (onboarding)**
```yaml
profiles:
  tenant-default:
    cost:
      token_budget_10k_per_day: 100
    guardrails:
      qps: 5
      max_fanout: 20000
      pii_block: true
    dashboards:
      import: ["ig-ops-v1"]
```

