[MODE: WHITE+BLUE]

# DIRK IG — Counter‑Threat & Intelligence Director (Next Sprint)
**Workstream:** Counter‑Threat, Intel, Provable Compliance, Detections  • **Cadence:** Q4‑2025 (Oct–Dec)  
**Sprint Window:** **2025‑11‑29 → 2025‑12‑13**  • **Owner:** Directorate K++ (DIRK IG)  • **Ordinal:** **05**

---

## A) Executive Summary (Decisions & Next Steps)
- **Consolidate & extend to multi‑tenant:** promote policies, detections, and dashboards to support **workspace/tenant scoping** with per‑tenant SLOs and guardrails.
- **Supply‑chain integrity at depth:** add **SBOM diffing**, **dependency allowlists/denylists**, and **attestation verification gates** with fail‑safe behavior.
- **Intel → Autotune:** move to **Intel v1.5** with automatic rule tuning suggestions (never auto‑enforce) based on backtest outcomes and intel decay.
- **Run‑state excellence:** on‑call quality play (paging quality, toil reduction), error‑budget policy for gates, and quarterly compliance snapshot export.

---

## B) Goals & Deliverables
- **G1. Multi‑Tenant Controls:** ABAC extensions, per‑tenant metrics & SLOs, tenant‑scoped dashboards and alert routes.
- **G2. Supply‑Chain Deepening:** SBOM diff job + policy, allow/deny manifests, and in‑CI attestation verification with signature trust roots.
- **G3. Intel v1.5 Autotune:** produce tuning proposals (thresholds, suppressions, rule toggles) with proof bundle and operator accept/reject workflow.
- **G4. Ops Quality:** paging quality SLOs, toil tracker, improved runbooks, and quarterly compliance export (audit pack v1).

---

## C) Sprint Plan (2025‑11‑29 → 2025‑12‑13)
**Milestones**
- **12‑02:** Tenant scoping enforced in Switchboard & dashboards; per‑tenant alert routes live.
- **12‑05:** SBOM diff + allow/deny manifests enforcing in staging; attestation verify gate wired.
- **12‑08:** Intel v1.5 proposals generated from backtests; operator review UI JSON produced.
- **12‑11:** Paging quality SLOs & toil tracker shipping; compliance snapshot exporter complete.
- **12‑13:** Prod canary for tenant scoping + supply‑chain gates; DoD‑V5 sign‑off.

**Backlog → Ready:** ABAC tenant label policy/tests; Grafana templating; diff tool; trust roots; tuning proposal generator; toil tracker schema; audit exporter.

---

## D) Artifacts (commit‑ready)
### 1) ABAC — Tenant Scoping (Rego)
```rego
package policy.tenant

default allow = false

# input: { actor:{tenants:["t1",...]}, resource:{tenant}, action }

allow {
  input.action == "render_widget"
  input.resource.tenant == some t
  t := input.actor.tenants[_]
}
```

**Tests (Rego):** allow when actor has tenant; deny otherwise.

### 2) Per‑Tenant SLO Labels (metrics contract)
```yaml
metrics:
  labels:
    - tenant
    - service
    - severity
  slo:
    gate_availability: target: 99.9
    alert_latency_p95: target: 30s
```

### 3) Grafana Templating (JSON outline)
```json
{
  "templating": {
    "list": [
      {"name":"tenant","type":"query","datasource":"prom","query":"label_values(gate_requests_total, tenant)"}
    ]
  },
  "panels": [
    {"type":"timeseries","title":"Gate Decisions — $tenant","targets":[{"expr":"sum by(decision) (gate_decision_total{tenant=\"$tenant\"})"}]}
  ]
}
```

### 4) SBOM Diff Job (script outline)
```bash
#!/usr/bin/env bash
set -euo pipefail
BASE=${1:?base-sbom.json}
HEAD=${2:?head-sbom.json}
jq -S '.["components"] | map({name,version,licenses})' "$BASE" > /tmp/base.json
jq -S '.["components"] | map({name,version,licenses})' "$HEAD" > /tmp/head.json
diff -u /tmp/base.json /tmp/head.json | tee dist/sbom.diff
```

### 5) Supply‑Chain Policy (allow/deny manifests)
```yaml
allowlist:
  libs:
    - name: example‑lib
      versions: [">=1.4.2"]
denylist:
  libs:
    - name: vulnerable‑lib
      versions: ["<=2.3.1"]
```

**OPA Gate — Attestation Verify**
```rego
package policy.release.attest

default allow = false

trusted := {"https://rekor.tlog.example","cosign.pub:ABCD..."}

has_attestation { count(input.attestations) > 0 }

trusted_source { some s; s := input.attestations[_].issuer; s == trusted[_] }

allow { has_attestation; trusted_source }
```

### 6) Intel v1.5 — Tuning Proposals
**Proposal schema (JSONSchema)**
```json
{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "title":"Detection Tuning Proposal",
  "type":"object",
  "required":["rule_id","change","rationale","evidence_uri","risk"],
  "properties":{
    "rule_id":{"type":"string"},
    "change":{"type":"string","enum":["threshold","suppression_add","disable","enable"]},
    "rationale":{"type":"string"},
    "evidence_uri":{"type":"string"},
    "risk":{"type":"string","enum":["low","medium","high"]}
  }
}
```

**Generator (pseudo‑CLI)**
```bash
intel-autotune \
  --backtest dist/backtest/report.json \
  --intel dist/intel/provenance.json \
  --out dist/proposals/
```

### 7) Toil Tracker (schema)
```yaml
toil:
  event: paging_false_alarm
  fields: [ts, tenant, rule_id, page_delay_s, ack_s, resolve_s, cause, action]
  retention_days: 180
```

### 8) Quarterly Compliance Exporter
```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y-%m-%d)
mkdir -p dist/audit/$TS
cp -r dist/evidence/* dist/audit/$TS/ || true
cp -r policies detections dashboards dist/audit/$TS/
sha256sum dist/audit/$TS/**/* | tee dist/audit/$TS/manifest.sha256
```

### 9) Detections (Sigma additions)
**Q. Tenant‑Crossing Access**
```yaml
title: Access Attempt Across Tenants
id: q1w2e3r4-t5y6u7i8-o9p0a1s2-d3f4g5h6j7
logsource: { product: app, service: switchboard }
detection:
  sel1: event: "render_widget"
  sel2: actor_tenant: "*"
  sel3: resource_tenant: "*"
  condition: sel1 and sel2 and sel3 and actor_tenant != resource_tenant
level: high
tags: [abac, multitenant, governance]
```

**R. Untrusted Attestation Issuer**
```yaml
title: Untrusted Attestation Issuer
id: r2t3y4u5-i6o7p8-a9s0d1-f2g3h4j5k6
logsource: { product: ci, service: conductor }
detection:
  sel1: event: "attestation.verify"
  sel2: result: "issuer_untrusted"
  condition: sel1 and sel2
level: high
tags: [supply_chain, integrity]
```

**S. Denylist Library Present**
```yaml
title: Denylist Library Detected in SBOM
id: s3d4f5g6-h7j8k9-l0q1w2-e3r4t5y6u7
logsource: { product: ci, service: conductor }
detection:
  sel1: event: "sbom.diff"
  sel2: diff_contains: "vulnerable-lib"
  condition: sel1 and sel2
level: high
tags: [supply_chain, vulnerability]
```

### 10) Runbooks (delta)
- **RB‑10: Tenant Boundary Violation** — freeze subject, verify labels, audit trails, notify tenant owner, review ABAC tests, unfreeze after remediation.
- **RB‑11: Supply‑Chain Gate Fail** — inspect SBOM diff; verify issuer; replace dependency or pin version; attach evidence; re‑run gate.
- **RB‑12: Proposal Review** — triage tuning proposals, approve/reject with rationale; changes land via PR with backtest evidence.

---

## E) Compliance Mappings (delta)
- **NIST 800‑53:** AC‑4 (information flow), SA‑11 (developer testing), SI‑7 (software integrity), AU‑6 (audit review).  
- **ISO 27001:** A.5.15, A.8.3, A.14.2.  
- **SOC 2:** CC6.6, CC7.2, CC8.1.

---

## F) SLAs, SLOs & Metrics
- **Tenant‑scoped gate availability:** ≥ 99.9% per tenant; **Alert latency p95:** ≤ 25s; **Attestation verify failure rate:** < 0.5% (non‑malicious).
- **Tuning proposal review time:** ≤ 48h; **Paging false alarms:** −25% quarter‑over‑quarter.
- **Compliance export:** completed by 12‑12 with manifest hashes.

---

## G) Proof‑Carrying Analysis (PCA)
**Assumptions:** Multi‑tenant labels are present in identity and logs; cosign/rekor or equivalent trust roots configured; SIEM supports tenant label.  
**Evidence:** SBOM diffs, attestation verify logs, tuning proposals with backtest artifacts, per‑tenant SLO dashboards, audit bundle manifest.  
**Caveats:** Library lists require curation; tenant label propagation gaps could cause false denies.  
**Verification:** Staged enablement; canary tenants first; manual override with full audit; weekly FP/suppression review.

---

## H) Definition of Done — V5
- Tenant scoping enforced with dashboards & alert routes.
- Supply‑chain gates (SBOM diff + attestation verify + lists) active in CI.
- Intel v1.5 producing proposals with operator workflow.
- Ops quality measures live; compliance export produced with hashes.

---

## I) Delivery Checklist
- [ ] ABAC tenant policy + tests merged
- [ ] Grafana templated boards deployed
- [ ] SBOM diff job + lists + OPA gate enforced
- [ ] Attestation trust roots configured & verified
- [ ] Intel autotune proposals generated & reviewed
- [ ] Toil tracker logging in place; paging SLOs measured
- [ ] Compliance export archived with manifest
- [ ] DoD‑V5 sign‑off; artifacts hashed

---

*Prepared by DIRK IG (Directorate K++). Auditable, multi‑tenant & supply‑chain‑focused sprint aligned to Q4 trains.*

