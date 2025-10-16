[MODE: WHITE+BLUE]

# DIRK IG — Counter‑Threat & Intelligence Director

**Workstream:** Counter‑Threat, Intel, Provable Compliance, Detections • **Cadence:** Q4‑2025 (Oct–Dec) • **This Sprint:** **2025‑10‑01 → 2025‑10‑14** • **Owner:** Directorate K++ (DIRK IG)

---

## A) Executive Summary (Decisions & Next Steps)

- **Anchor to the October pack:** Align with IntelGraph and Maestro/Conductor sprints dated 2025‑10‑06, 2025‑10‑13→10‑24, 2025‑10‑27. Our sprint runs **2025‑10‑01 → 2025‑10‑14** to feed artifacts before the **2025‑10‑15** prod cut.
- **Ship provable gates + detection coverage:** Deliver an **Evidence Bundle pipeline**, **release‑gate OPA** (hardened), and **first‑mile detections + dashboards** tied to MITRE ATT&CK.
- **Close gaps** found in repo: unify policy tests, add lineage/attestations, wire alerting SLAs, and finish runbooks with RACI + rollback.
- **Definition of Done (DoD‑V):** Gates green, tests passing, dashboards live in staging, evidence signed + attached, rollback path validated.

---

## B) Findings & Rationale (What, Why, So‑What)

**Repository & sprint review (Q4‑2025 set)**

- Multiple sprint docs (e.g., **2025‑10‑06**, **2025‑10‑13→10‑24**, **2025‑10‑27**, **2025‑12‑01/08/29**) establish cadence and scope for IntelGraph + MC/Conductor. Repo contains:
  - **OPA policy** samples for release gates and Switchboard; **CI workflows**; **Makefiles**; **alerts YAML**; **drift/variance docs**; and integration shells.
- **Gaps (priority‑ranked)**
  1. **Proof‑carrying release** is partial: release gate Rego exists but **no unit tests, no provenance/SBOM verification wiring, no signature policy, no CI proofs**.
  2. **Detections coverage** thin: **no Sigma ruleset**, no ATT&CK mapping, no suppression/FP hygiene, limited alert routing + runbooks.
  3. **Telemetry schema** not normalized: **no logging contract** (fields, IDs, retention tags) across services; scarce lineage fields for audit.
  4. **Dashboards**: targets are implied but **no concrete Grafana panels/queries**, no SLO/SLAs for alert ack/resolve.
  5. **Runbooks/RACI**: incident and release procedures are **incomplete**; no evidence chain‑of‑custody template.
  6. **Policy governance**: **labels/classifications** not enforced org‑wide; lack of **deny‑by‑default tests** and drift watch.
  7. **Staging smoke**: scattered notes but **no canonical smoke pack** (health, authn/authz, data paths) for post‑deploy.

**So‑What:** Without provable gates + detections + runbooks, the October cuts risk shipping without audit‑grade proofs or rapid containment. This sprint closes those edges before the mid‑October production window.

---

## C) Recommendations (Prioritized; Effort × Impact)

| #   | Recommendation                                                                                                   | Effort | Impact | Notes                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------- | -----: | :----: | ------------------------------------------------------------------ |
| 1   | Stand up **Evidence Bundle** (SBOM, SLSA provenance, policy test results, signatures) with CI upload + retention |      M | ★★★★☆  | Feeds Conductor/Release dashboards; enables attestable green gates |
| 2   | Harden **Release‑Gate OPA**: add **unit tests**, signature policy, inputs schema, deny‑by‑default                |      S | ★★★★★  | Low lift; flips gate from advisory→enforced with proofs            |
| 3   | Ship **3 high‑signal Sigma detections** + **ATT&CK map** + **Grafana board**                                     |      M | ★★★★☆  | First‑mile coverage; demo in staging                               |
| 4   | Create **Incident Playbooks** (BEC/fraud intel abuse, access drift, data egress) with **RACI + timelines**       |      S | ★★★★☆  | Unblocks on‑call; measurable MTTA/MTTR                             |
| 5   | Define **Logging Contract (v1)** + redaction + lineage (trace_id, actor_id, policy_decision, evidence_uri)       |      M | ★★★★☆  | Enables analytics + audit; low regret                              |
| 6   | Canonical **Staging Smoke Pack** (15 checks) + switchboard policy tests                                          |      S | ★★★☆☆  | Stabilizes weekly cuts                                             |
| 7   | Classifications & **ABAC labels** (deny‑by‑default) policy + tests                                               |      S | ★★★☆☆  | Prevents silent scope creep                                        |

---

## D) Sprint Plan (2025‑10‑01 → 2025‑10‑14)

**Goals:** Provable gate + evidence, detections+dashboards live in staging, smoke pack, runbooks.  
**Milestones:**

- **10‑02:** OPA gate tests + CI wiring; Evidence Bundle schema frozen.
- **10‑05:** Evidence generation in CI (SBOM, provenance); signing policy enforced.
- **10‑08:** Sigma ×3 active in SIEM; Grafana board published; alert routes & SLAs set.
- **10‑11:** Runbooks/RACI shipped; staging smoke pack green.
- **10‑14:** Dry‑run rollback + DoD‑V sign‑off.

**Backlog → Ready:**

- Release‑gate inputs contract; Sigstore/Cosign policy; provenance collector; Grafana panels; runbook templates; policy label tests; smoke scripts.

---

## E) Artifacts (Ship with this Sprint)

### 1) OPA/ABAC — Release Gate (hardened)

```rego
package policy.release

default allow = false

# Inputs contract
# input: {
#   sbom_uri: string,
#   provenance_uri: string,
#   signatures: { artifact: string, attestations: [string] },
#   critical_checks: ["sbom","provenance","signatures"],
# }

has(x) { x }

missing_sbom { not has(input.sbom_uri) }
missing_provenance { not has(input.provenance_uri) }
missing_signatures { count(input.signatures.attestations) == 0 }

# Deny reasons
violation[msg] { missing_sbom; msg := "SBOM missing" }
violation[msg] { missing_provenance; msg := "SLSA provenance missing" }
violation[msg] { missing_signatures; msg := "Signatures missing" }

deny[msg] { msg := violation[_] }

allow {
  has(input.sbom_uri)
  has(input.provenance_uri)
  count(input.signatures.attestations) > 0
}
```

**Unit Tests (Rego):**

```rego
package policy.release_test
import data.policy.release as rg

# happy path
allow_if_all_present { rg.allow with input as {
  "sbom_uri": "s3://evidence/sbom.json",
  "provenance_uri": "s3://evidence/prov.intoto",
  "signatures": {"artifact": "sha256:abc", "attestations": ["sig1"]}
} }

deny_if_missing_sbom {
  some m
  rg.deny[m] with input as {
    "provenance_uri": "x", "signatures": {"artifact": "y", "attestations": ["sig1"]}
  }
}
```

**CI Gate (GitHub Actions excerpt):**

```yaml
name: policy.check.release-gate
on: [workflow_call]
jobs:
  opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/setup-opa@v2
      - run: opa test policies -v
```

### 2) Evidence Bundle (spec v0)

```yaml
bundle:
  id: ${GIT_SHA}
  build_time: ${ISO8601}
  artifacts:
    sbom: s3://evidence/${GIT_SHA}/sbom.json
    provenance: s3://evidence/${GIT_SHA}/slsa.intoto
    signatures:
      artifact: sha256:${GIT_SHA}
      attestations:
        - s3://evidence/${GIT_SHA}/cosign.sig
  policy:
    release_gate_results: s3://evidence/${GIT_SHA}/opa.release.json
  approvals:
    code_review: ${PR_URL}
    security: ${ATTESTER}
  hashes:
    manifest: sha256:${MANIFEST_SHA}
```

**Makefile (snippet):**

```make
bundle:
	./scripts/gen-sbom.sh > dist/sbom.json
	./scripts/gen-provenance.sh > dist/slsa.intoto
	cosign sign-blob dist/slsa.intoto > dist/cosign.sig
	jq -n --arg sha "$(GIT_SHA)" -f scripts/bundle.jq > dist/evidence.bundle.json
```

### 3) Logging Contract v1 (JSONSchema excerpt)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CompanyOS Common Log v1",
  "type": "object",
  "required": ["ts", "service", "level", "event", "trace_id", "actor_id"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "service": { "type": "string" },
    "level": { "type": "string", "enum": ["DEBUG", "INFO", "WARN", "ERROR"] },
    "event": { "type": "string" },
    "trace_id": { "type": "string" },
    "actor_id": { "type": "string" },
    "policy_decision": {
      "type": "string",
      "enum": ["allow", "deny"],
      "nullable": true
    },
    "evidence_uri": { "type": "string", "nullable": true },
    "labels": { "type": "object" }
  }
}
```

### 4) Detections (Sigma) — initial set

**A. Unapproved Release (no evidence)**

```yaml
title: Unapproved Release Without Evidence
id: 18a9c0a0-7d5e-4a58-b4b7-1e2d9a3e1b01
status: experimental
description: Detects deploys missing SBOM/provenance/signatures
logsource: { product: ci, service: conductor }
detection:
  selection:
    policy_decision: 'deny'
    event: 'release_gate.evaluate'
  condition: selection
level: high
tags: [policy, release, slsa, sbom]
```

**B. Privilege Drift (Switchboard)**

```yaml
title: Switchboard Privilege Drift
id: 2b9e9f2e-7a0f-4f8f-8e8b-2b09f4a9b2f0
logsource: { product: app, service: switchboard }
detection:
  sel1: action: "render_widget"
  sel2: labels.allow_max: 2
  sel3: resource.widget: "*"
  cond: sel1 and sel3 and not sel2
level: high
tags: [attack.persistence, attack.privilege_escalation]
```

**C. Data Egress Spike (IntelGraph API)**

```yaml
title: IntelGraph Egress Spike
id: 7f1b0a1e-44a2-4e79-9a9b-1d3f5a2c9b77
logsource: { product: api, service: intelgraph }
detection:
  timeframe: 5m
  condition: rate(event:"download") by actor_id > 3x baseline
level: medium
tags: [attack.exfiltration]
```

### 5) Dashboard (Grafana outline)

- **Release Integrity:** gate decisions over time, denied reasons, evidence bundle presence.
- **Access & Drift:** allow/deny trends from Switchboard, top widgets blocked, label mismatches.
- **Egress & Abuse:** download rates, top actors, anomaly bands; alert routes to on‑call.

### 6) Runbooks (RACI + Steps) — excerpts

**RB‑01: Release Blocked by Gate**

- **Trigger:** Sigma A/high; gate deny
- **Roles:** IM (Lead), Release Eng, Sec Eng, Approver
- **Steps:** (1) Pull Evidence Bundle; (2) Verify SBOM/provenance; (3) Remediate missing artifacts; (4) Re‑run gate; (5) Post‑action note + attach proofs.

**RB‑02: Privilege Drift**

- **Trigger:** Sigma B/high + Switchboard deny storms
- **Steps:** Freeze subject; diff policy labels; open change ticket; require re‑auth (WebAuthn); review widget scopes; lift freeze once tests pass.

**RB‑03: Egress Spike**

- **Trigger:** Sigma C/medium; auto‑route if 3× spike persists 15m
- **Steps:** Confirm baseline; contact owner; rotate token; enable just‑in‑time scopes; open investigation; add findings to ledger.

---

## F) Compliance Mappings (starter)

- **NIST 800‑53:** CM‑3, CM‑6, CM‑8, SI‑4, SI‑7, AU‑2/6/8, IR‑4, CA‑7.
- **ISO 27001:** A.5, A.8, A.12, A.14, A.16.
- **SOC 2:** CC1.1, CC6.6, CC7.2, CC7.3, CC8.1.

---

## G) Success Metrics & SLAs

- **TTD (policy violation):** ≤ 2 min; **MTTA:** ≤ 10 min; **MTTR P1:** ≤ 2 h.
- **Gate Coverage:** 100% of releases produce evidence + pass tests.
- **Alert Hygiene:** FP rate ≤ 5% after suppression rules week 2.
- **Dashboard:** live in staging by 2025‑10‑08; weekly review.

---

## H) Proof‑Carrying Analysis (PCA)

**Assumptions:** October pack dates and scopes as present; OPA, CI, Switchboard, IntelGraph available; Cosign or equivalent permitted.

**Evidence & Lineage:** This plan derives from the October repository set (sprints dated **2025‑10‑06**, **2025‑10‑13→10‑24**, **2025‑10‑27**, **2025‑12‑01/08/29**), existing Rego policies, CI workflows, and drift docs. All added artifacts are synthetic & auditable.

**Caveats:** Exact environments (Grafana/SIEM vendor, bucket paths) to be parameterized. Performance baselines for egress require 7‑day warmup.

**Verification:** Include unit tests (OPA), dry‑run CI, staging demo, and rollback rehearsal. Attach bundle hashes in Victory Ledger.

---

## I) Regression Risks & Watchouts

- Gate over‑blocking if evidence generation fails; mitigate with **advisory mode + manual override with audit trail** for first 48h.
- Alert fatigue without suppression; tune after week 1.
- Missing lineage fields break dashboards; enforce **Logging Contract v1** in services before enabling panels.

---

## J) Definition of Done — Victory (DoD‑V)

- Win conditions met **and** proofs attached **and** rollback verified **and** owners assigned.

---

## K) Delivery Checklist

- [ ] OPA tests pass in CI
- [ ] Evidence bundle uploaded & signed per build
- [ ] Sigma ×3 live; routes + SLAs configured
- [ ] Dashboards visible in staging
- [ ] Runbooks in repo with RACI
- [ ] Smoke pack green post‑deploy
- [ ] Victory Ledger updated with hashes & approvals

---

_Prepared by DIRK IG (Directorate K++). This document is auditable and designed for immediate sprint execution._
