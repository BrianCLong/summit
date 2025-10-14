# DIRECTORATE J ∑ — Durga IG Workstream
**Classification:** Internal // Need‑to‑Know  
**Mode:** [JADE] Strategic Foresight + [JINX] Adversary Emulation + [JIGSAW] Narrative Defense  
**Cadence Anchor:** Aligned to Q4’25 company plan (Oct 6 – Dec 28, 2025) with weekly staging, bi‑weekly prod.  
**This Sprint:** **S‑01: 2025‑10‑06 → 2025‑10‑17** (Prod target: 2025‑10‑22)  
**Owner:** Durga IG (Directorate J ∑)  

---

## A) Executive Thesis
- **Decisive Idea:** Convert Intel Graph from planning artifact to **provable advantage system**: every material decision, control, and release carries evidence (claims→proofs), shrinking adversary options and compressing detection‑to‑decision cycles.
- **Next Best Actions:** (1) Stand up **Victory Ledger** + **Evidence Bundles v0** wired to CI/CD; (2) Ship **Minimum Viable Conductor** for decision logging; (3) Close **policy, identity, and data‑path gaps** that block GA and external attestations.
- **Win Condition (Q4):** Release increments that are **green-by-default**—SBOM/SLSA, OPA guardrails, audit trails, reversible deployments—with **IntelGraph signposts** for decisions and risks.
- **Guardrails:** Zero‑trust posture, reversible changes, least‑data‑necessary, publishable‑by‑default (with redaction gates).

---

## B) In‑Depth Review & Gap Analysis (Repo + Sprints)
**Reviewed Inputs (Q4’25 pack):**
- `summit_q_4_25_cadence_locked_sprint_plan_company_os_maestro_conductor_intel_graph.md` — cadence, gates, definitions (DoR/DoD).
- `dirk_ig_q_425_workstream_prompt_sprint_cadence_summit_intel_graph.md` — prior Counter‑Threat/Intel workstream scaffolding.
- `sprint_2025_10_27_delta.md` — environment hardening + release governance swimlanes.
- `intelgraph_sprint_2025_10_06_subtasks_and_projects_v_1_0.md` — subtask/project outlines.
- `sprint_2025_09_29_bravo_issues.md` and `..._bravo_artifacts.md` — backlog/defects and planned artifacts.
- (Switchboard master doc skimmed for cross‑workstream interfaces.)

### Findings
1) **Evidence not first‑class in toolchain.** DoR/DoD call for SBOM/SLSA/rollback, but there’s **no standard “Evidence Bundle” format** nor automated collection at merge/release.  
**Gap:** Missing schemas, pipeline steps, and storage policy.

2) **Decision logging is ad‑hoc.** The cadence mandates logging decision nodes to IntelGraph; however, **no durable decision ontology**, IDs, or signer attestation is defined.  
**Gap:** Conductor shims + schema + signatures.

3) **Identity & policy edges.** Step‑up auth, reason‑for‑access, and namespace‑tenant binding are referenced, but **OPA/ABAC policies and tests are partial**, and **access reason capture isn’t enforced** in prod paths.  
**Gap:** OPA bundles + test harness + telemetry.

4) **Data‑path governance.** DPIA/DPA hooks are listed as gates, but **consent/retention labels aren’t carried end‑to‑end** (ingest→transform→serve).  
**Gap:** Bitemporal registry + lineage tags + deny‑by‑default on unlabeled flows.

5) **Narrative hygiene.** Crisis comms and disclosure packs exist conceptually; **no prebunk/debunk kits** tied to concrete facts, owners, and channels.  
**Gap:** Narrative defense kits mapped to specific risks.

6) **Observability to intent.** Metrics emphasize uptime/SLO. **No leading indicators** for adversary reconnaissance, policy drift, or narrative manipulation.  
**Gap:** Threat signposts, KRIs, and dashboards.

7) **Rollback tests.** Canary/rollback policy exists, **but rollback is rarely exercised under fault injection** tied to policy violations (e.g., OPA deny, DPIA breach).  
**Gap:** Game‑day scripts + automated chaos scenarios.

---

## C) Courses of Action (COAs)
**Scale: effort (S/M/L) × impact (Low/Med/High)**

1) **Evidence Bundles v0 (S×High)** – Define JSON schema; add CI job to package SBOM, SLSA provenance, risk report, DPIA ref, test artifacts, and OPA policy digests; store in `evidence/` with immutable object store and retention TTL.

2) **Conductor Min (S×High)** – CLI + GitHub Action to register **Decision** (Context, Options, Choice, Reversible?, Owners, Checks) → emit signed claim to IntelGraph with run IDs.

3) **OPA Guardrails Pack (M×High)** – Policy set for namespace‑tenant binding, secret mounts, network egress, **reason‑for‑access** capture; plus unit tests and “golden path” conformance tests.

4) **Bitemporal Registry v0 (M×Med)** – Minimal entity registry with consent/retention labels and lineage references; deny unlabeled data paths at compute/service boundary.

5) **Narrative Defense Kit v0 (S×Med)** – Prebunk/debunk playbooks, fact patterns, channel hygiene checklist, escalation tree; wire to disclosure packs.

6) **Adversary Recon Dashboard (S×Med)** – KRIs for auth failures, policy denials, permission escalations, anomalous access reasons, and external narrative spikes.

7) **Rollback Game‑days (S×Med)** – Scripts to trigger automated rollback on SLO breach, security finding, or policy violation; include evidence capture.

**Decision Gate:** If COA‑1/2 (Evidence + Conductor) cannot be completed by **Day 5**, pivot to COA‑3 (OPA) as the sprint anchor and degrade scope on registry.

---

## D) Sprint Plan — S‑01 (2025‑10‑06 → 2025‑10‑17)
### Objectives (aligned with company cadence)
- **OBJ‑1:** Evidence Bundles v0 operational in CI for two target services.
- **OBJ‑2:** Conductor Min logging **100% of material decisions** for those services.
- **OBJ‑3:** OPA Guardrails v0 enforcing namespace‑tenant binding + reason‑for‑access capture in staging.

### Deliverables
- `evidence/schema/v0.json` + `evidence/README.md` + GitHub Action `evidence-bundle.yml`.
- `tools/conductor/` (CLI + action) + `docs/decision-brief.md`.
- `policy/opa/` package + `tests/opa/` conformance suite + `golden-path/` reference.
- Dashboards: `dashboards/kris_recon.json` (Grafana/Datadog compatible) + runbooks in `runbooks/`.

### Work Breakdown & Swimlanes
**Lane A — Evidence (Owner: Release Eng)**
- A1 Create schema; include fields: `artifact_refs`, `sbom_uri`, `slsa_provenance`, `risk_assessment`, `dpia_id`, `opa_bundle_sha`, `rollback_plan`, `test_matrix`, `signatures[]`.
- A2 Implement CI job producing bundle on PR merge and on release tag; push to object store with retention labels.
- A3 Add `evidence/` index page and publishable redaction routine.

**Lane B — Conductor (Owner: Durga IG)**
- B1 Define **Decision** ontology + IDs (ULIDs) and signer policy.
- B2 Build `conductor` CLI (record, attest, list) + GitHub Action integration; emit signed claims to IntelGraph.
- B3 Wire decision hooks into release checklist; add DoR/DoD links.

**Lane C — OPA Guardrails (Owner: SecOps)**
- C1 Draft policies: tenant binding, secret mount deny, egress controls, reason‑for‑access capture.
- C2 Unit tests + conformance tests; fail build on regressions.
- C3 Staging rollout with feature flag; capture metrics + exceptions.

**Lane D — Narrative Defense (Owner: Comms)**
- D1 Build prebunk/debunk templates for top 5 risks; map to disclosure pack.
- D2 Channel hygiene checklist; approval workflow.

### Dependencies
- Access to CI secrets/object store; IntelGraph write API; policy engine in staging; dashboards infra.

### Risks & Mitigations
- **Scope creep** → strict MVP for Evidence/Conductor.
- **Policy false positives** → feature flags + shadow‑enforce first.
- **Attestation trust** → sign with org key; verify in CI.

### Definition of Done (DoD‑V)
- All three target repos produce **Evidence Bundles** automatically; bundles linked from release notes.
- **100% decisions** for release tagged with Conductor IDs; visible in IntelGraph.
- OPA denies **cross‑tenant secret mounts**; **reason‑for‑access** is captured and queryable.
- Runbooks + dashboards deployed; rollback game‑day executed once with results logged.

---

## E) Scorecard & Tripwires
**KPIs (leading)**
- % releases with valid Evidence Bundle (target ≥ 90%).
- % material decisions recorded within 24h (target 100%).
- Policy coverage: % services under OPA shadow‑enforce/enforce (target 80/50 for S‑01).
- Mean time from policy violation to rollback (target < 10 min staging).

**KRIs**
- Spike in denied requests per tenant (>2× baseline).
- Increase in privileged access without reason (>0/day).
- Narrative anomaly score (>95th percentile weekly).

**Tripwires & Rollback**
- Auto‑rollback if: SLO breach (2× window), critical security finding, or unlabeled data path detected; attach Evidence Bundle to incident.

---

## F) PCS — Proof‑Carrying Strategy
**Sources (internal):** the Q4 cadence plan, DIRK IG workstream prompt, release delta sprint, IntelGraph subtasks, Bravo issues/artifacts (file names listed above).  
**Assumptions:** IntelGraph write API available; CI/CD is GitHub Actions; object store supports immutability/TTL; OPA can be shipped as bundles.  
**Confidence:** Medium‑High for sprint scope; Medium for registry work.  
**Falsifiers & Checks:** If Evidence/Conductor cannot be integrated on two services by Day 5, reduce scope and promote OPA to primary win; if policy denial rate >5% steady‑state, iterate policies before enforcing.

---

## G) Artifacts & Scaffolding (Drop‑in)

### 1) Evidence Bundle — Schema v0 (`evidence/schema/v0.json`)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EvidenceBundle",
  "type": "object",
  "required": ["id", "release", "artifacts", "attestations", "risk", "policies", "tests", "rollback", "signatures"],
  "properties": {
    "id": {"type": "string", "description": "ULID"},
    "created_at": {"type": "string", "format": "date-time"},
    "release": {
      "type": "object",
      "required": ["repo", "commit", "tag"],
      "properties": {
        "repo": {"type": "string"},
        "commit": {"type": "string"},
        "tag": {"type": "string"}
      }
    },
    "artifacts": {
      "type": "object",
      "properties": {
        "sbom": {"type": "string", "format": "uri"},
        "slsa_provenance": {"type": "string", "format": "uri"},
        "build_logs": {"type": "string", "format": "uri"}
      }
    },
    "attestations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "ref"],
        "properties": {
          "type": {"type": "string"},
          "ref": {"type": "string", "format": "uri"}
        }
      }
    },
    "risk": {
      "type": "object",
      "properties": {
        "assessment": {"type": "string", "format": "uri"},
        "dpia_id": {"type": "string"}
      }
    },
    "policies": {
      "type": "object",
      "properties": {
        "opa_bundle_sha": {"type": "string"},
        "policy_versions": {"type": "array", "items": {"type": "string"}}
      }
    },
    "tests": {
      "type": "object",
      "properties": {
        "unit": {"type": "string", "format": "uri"},
        "integration": {"type": "string", "format": "uri"},
        "conformance": {"type": "string", "format": "uri"}
      }
    },
    "rollback": {
      "type": "object",
      "properties": {
        "plan": {"type": "string", "format": "uri"},
        "gates": {"type": "array", "items": {"type": "string"}}
      }
    },
    "signatures": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["by", "sig"],
        "properties": {
          "by": {"type": "string"},
          "role": {"type": "string"},
          "sig": {"type": "string"}
        }
      }
    }
  }
}
```

### 2) GitHub Action — Evidence Bundle (`.github/workflows/evidence-bundle.yml`)
```yaml
name: Evidence Bundle
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch: {}
jobs:
  build-evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        run: |
          ./scripts/sbom.sh > artifacts/sbom.json
      - name: Generate SLSA Provenance
        run: |
          ./scripts/slsa.sh > artifacts/slsa.json
      - name: Assemble Evidence Bundle
        run: |
          ./scripts/evidence_bundle.sh
      - name: Upload Evidence
        uses: actions/upload-artifact@v4
        with:
          name: evidence-bundle
          path: evidence/*.json
```

### 3) Decision Brief Template (`docs/decision-brief.md`)
```md
# Decision Brief — <Title>
**ID:** DEC-<ULID>  |  **Date:** YYYY-MM-DD  |  **Reversible?:** Yes/No
**Context**
**Options** (with tradeoffs)
**Decision** (what/why, owners)
**Risks & Mitigations**
**Checks** (success metrics, rollback gates)
**Evidence Links** (SBOM, SLSA, risk, DPIA)
```

### 4) Conductor CLI (spec)
```text
conductor record --title "<decision>" --context file.md --options file.md --decision file.md \
  --owners "a@x,b@y" --reversible yes --checks file.md --evidence evidence/index.json
conductor attest DEC-ULID --signer org-key
conductor list --since 14d --service svc-a
```

### 5) OPA Policies — Highlights (`policy/opa/`)
```rego
package guard.tenant

# deny cross-tenant secret mounts
violation[msg] {
  input.kind == "Pod"
  some c in input.spec.containers
  c.volumeMounts[_].name == "secret"
  input.metadata.namespace_tenant != input.spec.tenant
  msg := sprintf("cross-tenant secret mount: %s", [input.metadata.name])
}

package access.reason

# require reason-for-access annotation on privileged routes
violation[msg] {
  input.request.path == "/admin/*"
  not input.request.headers["x-reason-for-access"]
  msg := "missing reason-for-access"
}
```

### 6) Golden Path Conformance (`tests/opa/`)
```bash
#!/usr/bin/env bash
set -euo pipefail
opa test policy/opa tests/fixtures -v
```

### 7) Narrative Defense Kit (skeleton)
```md
## Claim–Evidence–Warrant Table
| Claim | Evidence | Warrant | Owner |
|---|---|---|---|
| Release meets SLSA 3 | evidence/<id>/slsa.json | Build provenance chain linked to signed tags | Release Eng |

## Prebunk/De-bunk Scripts
- Allegation: "Data used without consent" → Facts: registry entry <id>, consent label, retention policy link, DPIA <id>.
- Allegation: "Rollback failed" → Facts: game-day runbook #12, logs, rollback time 6m.

## Channel Hygiene
- Two-person publish rule; archive links; hash evidence; coordinate with Incident Cmdr.
```

---

## H) RACI & Resourcing
- **Responsible:** Durga IG (Conductor), Release Eng (Evidence), SecOps (OPA), Comms (Narrative).
- **Accountable:** CTO/Dir Sec.
- **Consulted:** Data Protection, Legal, SRE.
- **Informed:** CEO, Board (monthly pack).

---

## I) 30/60/90 Roadmap (Sketch)
- **30d:** Evidence/Conductor GA across Tier‑1 services; OPA enforce in prod for core policies.
- **60d:** Bitemporal registry live on consent/retention; narrative defense integrated to disclosures; decision search in IntelGraph.
- **90d:** Compliance capital tests (external audit dry‑run); automated rollback on policy breach with customer‑visible status page.

---

## J) Governance & Provenance
- **Provenance Manifest:** attach Evidence Bundle IDs to all releases; store hashes in immutable store; index in IntelGraph.
- **OPA Policy Stubs & Tests:** included above; CI blocking on regression.
- **Retention:** Evidence bundles 7y (auditable); logs 18m; redactions as per legal.

---

## K) Definition of Done (DoD‑J)
- Win conditions defined; COA selected (Evidence+Conductor) with scorecard active; rollback tested; PCS attached; owners/dates set; artifacts merged.

