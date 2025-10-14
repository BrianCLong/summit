[MODE: WHITE+BLUE]

# DIRK IG — Counter‑Threat & Intelligence Director (Next Sprint)
**Workstream:** Counter‑Threat, Intel, Provable Compliance, Detections  • **Cadence:** Q4‑2025 (Oct–Dec)  
**Sprint Window:** **2025‑10‑15 → 2025‑10‑29**  • **Owner:** Directorate K++ (DIRK IG)  • **Ordinal:** **02**

---

## A) Executive Summary (Decisions & Next Steps)
- **Raise the bar from “provable” to “preventive by default”:** enforce release‑gate in strict mode with controlled override and full audit.
- **Expand detection depth + hygiene:** ship 6 additional Sigma rules, tuned suppressions, and ATT&CK coverage map v2; add **auto‑triage** for high‑confidence events.
- **Operationalize dashboards:** deliver production‑ready Grafana JSON, SLO panels, alert routing with on‑call schedules and ACK/RESOLVE telemetry.
- **Formalize governance:** classification labels + ABAC guardrails enforced pre‑render in Switchboard; policy drift monitors + weekly variance report.

---

## B) Findings & Rationale (carried forward + new)
- The prior sprint delivered the gate, evidence bundle v1, seeds for detections, and runbooks. What’s missing for scale:
  1) **Strict mode with safe overrides** (audited break‑glass) is not yet standardized.
  2) **Suppression + baselining** needed to keep FP ≤ 5% as coverage expands.
  3) **Prod‑ready dashboards** (JSON, versioned) and SLO views are pending.
  4) **ABAC labeling** present but not consistently enforced at request time.
  5) **Variance/drift** monitoring lacks scheduled reports + owners.

**So‑What:** Without these, operators face alert fatigue, audit gaps for overrides, and policy drift that erodes least‑privilege.

---

## C) Goals & Deliverables
- **G1. Strict Gate + Break‑Glass:** enforced release gate (deny‑by‑default) +
  - Break‑glass OPA policy with role constraints, time‑boxed tokens, and mandatory evidence.
  - CI status checks blocking merges without passing tests & evidence.
- **G2. Detection Pack v2:** +6 Sigma rules; suppression lists; tiered severities; ATT&CK mapping v2.
- **G3. Grafana Pack v1:** JSON dashboards (Release Integrity, Access & Drift, Egress), provisioned via code with version tags.
- **G4. ABAC Enforcement:** Switchboard request‑time enforcement with labels, plus policy tests and golden‑path fixtures.
- **G5. Drift & Variance:** daily job producing **Policy Variance Report** with diff of policies, routes, labels; Slack/Teams digest.

---

## D) Sprint Plan (2025‑10‑15 → 2025‑10‑29)
**Milestones**
- **10‑17:** Strict gate live in staging; break‑glass tokens issuing with audit trail; CI status checks on.
- **10‑20:** Detection Pack v2 enabled (shadow mode + sampling); suppression framework merged.
- **10‑23:** Grafana JSON applied in staging; SLO/alert routes validated; Switchboard ABAC tests green.
- **10‑27:** Variance report cron live; weekly review template issued.
- **10‑29:** Prod canary: strict gate + two highest‑confidence detections on; sign‑off with DoD‑V2.

**Backlog → Ready**
- Gate strict policy + tests; cosign verify step; suppression DSL; Grafana JSON; ABAC tests; variance script.

---

## E) Artifacts (ready to commit)
### 1) OPA — Break‑Glass (release gate)
```rego
package policy.release.breakglass

# Deny by default
default allow = false

# input:
# { reason: string, approver: string, role: string, expires_at: string, ticket: string }

valid_role {
  input.role == "ReleaseCaptain" or input.role == "SecDuty"
}

not_expired {
  time.now_ns() < time.parse_rfc3339_ns(input.expires_at)
}

has_reason { count(input.reason) > 0 }

has_ticket_prefix { startswith(input.ticket, "CHG-") }

allow {
  valid_role
  not_expired
  has_reason
  has_ticket_prefix
}
```

**Unit test (Rego):**
```rego
package policy.release.breakglass_test
import data.policy.release.breakglass as bg

allow_valid {
  bg.allow with input as {
    "reason": "prod hotfix",
    "approver": "@sec",
    "role": "ReleaseCaptain",
    "expires_at": "2025-10-16T02:00:00Z",
    "ticket": "CHG-12345"
  }
}
```

**CI wiring (snippet):**
```yaml
- name: Verify evidence & gate
  run: |
    opa eval -i dist/evidence.bundle.json -d policies 'data.policy.release.allow'
    opa eval -i dist/breakglass.json -d policies 'data.policy.release.breakglass.allow'
  continue-on-error: false
```

### 2) Detection Pack v2 (Sigma)
**D. Malicious Widget Scope Grant (Switchboard)**
```yaml
title: Unauthorized Widget Scope Grant
id: d4a3d8f4-5511-4a8a-9e7e-1f26a0f4a8f1
status: experimental
logsource: { product: app, service: switchboard }
detection:
  sel1:
    event: "acl.update"
    new_scope: "widget:*"
  sel2:
    actor_role: "<not in>[Admin,SecDuty]"
  condition: sel1 and sel2
level: high
tags: [attack.persistence, attack.privilege_escalation]
```

**E. Evidence Bundle Tamper**
```yaml
title: Evidence Bundle Tamper
id: e2a7c0e4-d2b3-4aab-90d2-3b9d8a10c1f2
logsource: { product: ci, service: conductor }
detection:
  sel1: event: "evidence.verify"
  sel2: result: "hash_mismatch"
  condition: sel1 and sel2
level: high
tags: [slsa, integrity, supply_chain]
```

**F. API Token Reuse Across Geo (IntelGraph)**
```yaml
title: API Token Reuse Across Geo
id: f7e9c1a2-0e1f-4c8e-9d7b-44c3f2a1b9e1
logsource: { product: api, service: intelgraph }
detection:
  timeframe: 15m
  cond: distinct(geoip_country) by token_id > 1
level: medium
tags: [attack.credential_access, attack.defense_evasion]
```

**G. Sudden Role Accumulation**
```yaml
title: Sudden Role Accumulation
id: g3b2c8e1-12ab-4d7f-bb2d-1a2b3c4d5e6f
logsource: { product: iam, service: switchboard }
detection:
  timeframe: 10m
  cond: count(event:"role.grant" by actor_id) >= 3
level: medium
tags: [attack.persistence]
```

**H. High‑Risk Download Type**
```yaml
title: High-Risk Download Type
id: h1a2b3c4-d5e6-4f7a-8b9c-0a1b2c3d4e5f
logsource: { product: api, service: intelgraph }
detection:
  sel1: event: "download"
  sel2: file_type: "bulk_export"
  condition: sel1 and sel2
level: medium
tags: [attack.exfiltration]
```

**I. Alert Storm Guard**
```yaml
title: Alert Storm Guard
id: i9f8e7d6-c5b4-4a3b-9a8b-7c6d5e4f3a2b
logsource: { product: siem, service: alerts }
detection:
  timeframe: 5m
  cond: rate(level:"high") > 5x 7d_avg
level: high
tags: [secops, reliability]
```

### 3) Suppression & Hygiene (YAML)
```yaml
suppressions:
  - id: swb-render-admin-self
    match: { service: switchboard, event: render_widget, actor_role: Admin }
    reason: admin dashboard activity baseline
    expires: 2025-11-30
  - id: ig-bulk-export-service
    match: { service: intelgraph, event: download, actor_id: "svc-exporter" }
    reason: service account bulk export job
    expires: 2025-12-31
```

### 4) Grafana — Dashboards (JSON outlines)
```json
{
  "dashboard": {
    "title": "Release Integrity v1",
    "tags": ["security","integrity"],
    "panels": [
      {"type":"timeseries","title":"Gate Decisions","targets":[{"expr":"sum by(decision) (gate_decision_total)"}]},
      {"type":"table","title":"Denied Reasons","targets":[{"expr":"topk(10, gate_denied_reason_total)"}]},
      {"type":"stat","title":"Evidence Coverage %","targets":[{"expr":"evidence_present_ratio"}]}
    ]
  },
  "version": 1
}
```

### 5) ABAC — Switchboard Request‑Time Enforcement (Rego)
```rego
package policy.switchboard

default allow = false

# Input: { actor: {id, roles, labels}, resource: {widget, labels}, action }

has_required_label {
  input.actor.labels.sensitivity >= input.resource.labels.sensitivity
}

allow {
  input.action == "render_widget"
  has_required_label
}
```

**Tests:** ensure deny on label mismatch; allow on equal/higher sensitivity.

### 6) Variance Report (pseudo‑script)
```bash
#!/usr/bin/env bash
set -euo pipefail
# Compare last good policies/dashboards/detections
BASE=${1:-main}
HEAD=${2:-HEAD}

git diff --name-status $BASE..$HEAD -- policies detections dashboards | tee dist/variance.txt
python scripts/owners_notify.py dist/variance.txt
```

### 7) Runbooks (delta)
- **RB‑04: Break‑Glass Use** — pre‑approved roles only; time‑box; attach reason + ticket; auto‑revert; retrospective within 24h.
- **RB‑05: Alert Storm** — enable suppression id `alert‑storm‑guard`; rotate paging policy; freeze noisy rule until tuned.

---

## F) Compliance Mappings (delta)
- **NIST 800‑53:** AC‑3/AC‑6 (ABAC), CM‑5 (access restrictions), SI‑7(1) (software integrity), IR‑4.  
- **ISO 27001:** A.5.17, A.8.2, A.9.4, A.12.2.  
- **SOC 2:** CC6.1, CC7.2, CC7.3, CC8.1.

---

## G) SLAs, SLOs & Metrics
- **FP rate:** ≤ 5% by 10‑27; **TTD:** ≤ 2m; **MTTA:** ≤ 8m; **MTTR P1:** ≤ 90m.
- **Evidence coverage:** 100% of prod releases; **Break‑glass uses:** 0 normal weeks; 100% with ticket + retrospective.
- **Dashboards:** JSON applied to staging by 10‑23; prod canary by 10‑29.

---

## H) Proof‑Carrying Analysis (PCA)
**Assumptions:** Prior sprint artifacts merged; SIEM supports Sigma; Grafana provisioned via code; Slack/Teams available for digests.  
**Evidence:** Git diffs, OPA test outputs, dashboard JSON manifests, suppression lists, runbook PRs.  
**Caveats:** Geo inference requires reliable IP→Country; suppression expiry discipline needed.  
**Verification:** Shadow→enforce progression; staged rollouts; variance report weekly.

---

## I) Definition of Done — V2
- Strict gate enforced with audited break‑glass.
- Detection Pack v2 live (with suppressions), SLAs met.
- Dashboards versioned + deployed via JSON.
- ABAC request‑time enforcement with tests.
- Variance reporting running daily; ownership mapped.

---

## J) Delivery Checklist
- [ ] Rego policies + tests pass in CI
- [ ] CI status checks block merges without evidence
- [ ] Sigma v2 + suppressions deployed
- [ ] Grafana JSON applied to staging/prod‑canary
- [ ] ABAC tests green in Switchboard
- [ ] Variance digest delivered to SecOps channel
- [ ] DoD‑V2 sign‑off + artifacts hashed in ledger

---

*Prepared by DIRK IG (Directorate K++). Auditable, ready for immediate execution.*

