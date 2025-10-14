[MODE: WHITE+BLUE]

# DIRK IG — Counter‑Threat & Intelligence Director (Next Sprint)
**Workstream:** Counter‑Threat, Intel, Provable Compliance, Detections  • **Cadence:** Q4‑2025 (Oct–Dec)  
**Sprint Window:** **2025‑11‑14 → 2025‑11‑28**  • **Owner:** Directorate K++ (DIRK IG)  • **Ordinal:** **04**

---

## A) Executive Summary (Decisions & Next Steps)
- **Scale intel→action with quality controls:** promote Intel Ingestion to **v1** with scoring, decay, TLP handling, and safe auto‑publish to detections/suppressions.
- **Raise detection fidelity:** backtesting + replay harness; expand ATT&CK coverage; hunt notebooks; measured FP reduction via targeted suppressions with expiry.
- **Harden reliability & audit:** evidence retention lifecycle policy; auto‑retrospective pack; dashboard v2 with error‑budget panels.
- **Purple planning (synthetic only):** adversary emulation **planning** & tabletop kit tied to our detections (no live exploitation).

---

## B) Goals & Deliverables
- **G1. Intel v1**: scoring model (weights, freshness decay), TLP enforcement, automated list updates with provenance.
- **G2. Detection Fidelity**: backtesting CLI, log replay, +5 Sigma rules (ATT&CK map v3), targeted suppressions with audit & expiry.
- **G3. Threat Hunting**: notebook templates (queries, hypotheses, baselines) + hunt review ritual & ledger.
- **G4. Dashboards v2**: JSON with error‑budget, backlog, and suppression coverage; versioned & provisioned.
- **G5. Governance/Audit**: evidence retention lifecycle OPA, post‑incident auto‑retrospective pack; purple tabletop plan.

---

## C) Sprint Plan (2025‑11‑14 → 2025‑11‑28)
**Milestones**
- **11‑18:** Intel v1 scoring + decay live in staging; TLP enforcement on publish.
- **11‑20:** Backtesting CLI + log replay; initial results for Detection Pack v2.
- **11‑24:** +5 Sigma enabled (shadow→enforce); Dashboards v2 in staging; hunt notebooks published.
- **11‑27:** Evidence lifecycle OPA + auto‑retro pack; purple tabletop kit finalized.
- **11‑28:** Prod sign‑off (DoD‑V4) + artifacts archived with hashes.

**Backlog → Ready:** scoring weights, decay policy, TLP controls; replay dataset; Sigma v3 rules; Grafana JSON v2; OPA retention lifecycle; notebooks; tabletop plan.

---

## D) Artifacts (commit‑ready)
### 1) Intel Scoring & Decay (config)
```yaml
intel:
  score:
    weights:
      feed_reputation: 0.35
      enrichment_risk: 0.45
      sighting_count: 0.10
      analyst_confidence: 0.10
    thresholds:
      high: ">=80"
      medium: ">=60"
  decay:
    half_life_days:
      ip: 7
      domain: 14
      sha256: 45
  tlp:
    allow_publish: ["WHITE","GREEN","AMBER"]
    block_publish: ["RED"]
  publish_rules:
    - list: detections.intel.bad_ips
      when: type==ip and score>=80 and tlp!=RED
    - list: suppressions.intel.fp_domains
      when: type==domain and score<30
```

**Decay policy (Rego)**
```rego
package intel.decay

score_after_days(score0, half_life_days, days) = s {
  d := to_number(days)
  h := to_number(half_life_days)
  s := round(score0 * pow(0.5, d / h))
}

allow_publish(ioc) {
  tlp := upper(ioc.tlp)
  not tlp == "RED"
  ioc.score >= 80
}
```

**Publisher (pseudocode)**
```python
from datetime import datetime

def publish(ioc, now: datetime):
    age = (now - ioc.first_seen).days
    ioc.score = decay(score0=ioc.score, half_life=ioc.half_life, days=age)
    if ioc.tlp == "RED":
        return deny("tlp_red")
    if ioc.score >= 80:
        lists.add("detections.intel.bad_ips", ioc.value, provenance=ioc.evidence)
```

### 2) Detection Fidelity — Backtesting CLI
```bash
# cli/backtest.sh
#!/usr/bin/env bash
set -euo pipefail
LOGS=${1:-/data/replay.ndjson}
RULES_DIR=${2:-detections/sigma}
OUT=dist/backtest
mkdir -p "$OUT"
siem-replay --logs "$LOGS" --rules "$RULES_DIR" --report "$OUT/report.json"
jq '.summary' "$OUT/report.json" | tee "$OUT/summary.txt"
```

**Replay Dataset Manifest (example)**
```yaml
replay:
  source: s3://security-logs/2025-10/*.ndjson
  services: [conductor, switchboard, intelgraph]
  span: 14d
  pii: redacted
```

### 3) Sigma Rules (additions)
**L. Suspicious Gate Override Burst**
```yaml
title: Burst of Break-Glass Overrides
id: l4m5n6o7-p8q9-r0s1-t2u3-v4w5x6y7z8
logsource: { product: ci, service: conductor }
detection:
  timeframe: 10m
  cond: rate(event:"breakglass.used") > 3
level: high
tags: [governance, integrity]
```

**M. Token Scope Mismatch**
```yaml
title: Token Used Outside Allowed Scope
id: m1n2o3p4-q5r6-s7t8-u9v0-w1x2y3z4a5
logsource: { product: api, service: intelgraph }
detection:
  sel1: event: "api.call"
  sel2: token_scope: "read:widget"
  sel3: route: "POST /widget/*"
  condition: sel1 and sel2 and sel3
level: high
tags: [attack.defense_evasion]
```

**N. Anomalous Admin Login Time**
```yaml
title: Admin Login at Unusual Time
id: n9o8p7q6-r5s4-t3u2-v1w0-x9y8z7a6b5
logsource: { product: iam, service: switchboard }
detection:
  timeframe: 7d
  cond: event:"login" and role:"Admin" and hour(ts) not in baseline_hours(role:"Admin")
level: medium
tags: [behavior, anomaly]
```

**O. Evidence Coverage Drop**
```yaml
title: Evidence Coverage Below Threshold
id: o1p2q3r4-s5t6-u7v8-w9x0-y1z2a3b4c5
logsource: { product: ci, service: conductor }
detection:
  sel1: metric:"evidence_present_ratio"
  condition: sel1 < 0.98
level: medium
tags: [supply_chain, integrity]
```

**P. TLP Red Publish Attempt**
```yaml
title: Attempted Publish of TLP:RED Intel
id: p5q6r7s8-t9u0-v1w2-x3y4-z5a6b7c8d9
logsource: { product: intel, service: ingestion }
detection:
  sel1: event:"publish_attempt"
  sel2: tlp:"RED"
  condition: sel1 and sel2
level: high
tags: [threat_intel, governance]
```

### 4) Threat Hunting Templates (Jupyter skeleton)
```markdown
# Hunt: IntelGraph Egress Anomalies (v1)
## Hypothesis
Actors exfiltrate data by blending with bulk-export jobs.

## Signals & Data
- intelgraph.download, actor_id, file_type, bytes, geoip_country

## Queries (fill in datasource specifics)
- Rate by actor_id vs 7d baseline
- Bulk-export overlap with non-export hours

## Expected Outcome
Triage candidates list with evidence links.
```

### 5) Dashboards v2 (JSON outline)
```json
{
  "dashboard": {
    "title": "Security Operations v2",
    "panels": [
      {"type":"timeseries","title":"Error Budget Burn (Gate)","targets":[{"expr":"gate_burn_rate"}]},
      {"type":"gauge","title":"Evidence Coverage","targets":[{"expr":"evidence_present_ratio"}]},
      {"type":"table","title":"Suppression Coverage","targets":[{"expr":"suppressions_active_total"}]},
      {"type":"stat","title":"Intel v1 Publish Count","targets":[{"expr":"intel_publish_total"}]}
    ]
  },
  "version": 2
}
```

### 6) Governance — Evidence Lifecycle OPA
```rego
package policy.evidence.lifecycle

default retain = false

# input: { artifact:{type}, severity:"low|med|high|crit", age_days }

retain {
  input.severity == "crit"
}
retain {
  input.artifact.type == "provenance"; input.age_days <= 365
}
retain {
  input.artifact.type == "sbom"; input.age_days <= 180
}
```

### 7) Auto‑Retrospective Pack (script)
```bash
#!/usr/bin/env bash
set -euo pipefail
INC=$1
mkdir -p dist/retro/$INC
cp dist/evidence/$INC/* dist/retro/$INC/ || true
jq -n --arg inc "$INC" --arg date "$(date -Is)" '{incident:$inc,date:$date,owners:[],findings:[],actions:[]}' > dist/retro/$INC/retro.json
```

### 8) Purple Team Planning (synthetic only)
- Map ATT&CK techniques covered by Sigma v1–v3; choose top 3 gaps.
- Design **tabletop injects** per gap with clear success metrics and detection expectations.
- No exploitation; use synthetic logs + replay harness.

### 9) Runbooks (delta)
- **RB‑08: Intel Quality Gate** — block low‑score intel, require human ack for score 60–79, auto‑decay apply.
- **RB‑09: Backtest Regression** — if detection precision < target, auto‑revert last rule change; open tuning task.

---

## E) Compliance Mappings (delta)
- **NIST 800‑53:** SI‑4(24) (threat intel), AU‑6 (audit review), CM‑3 (config change), IR‑4 (response), PL‑8 (plans).  
- **ISO 27001:** A.5.7, A.5.14, A.12.1, A.12.6.  
- **SOC 2:** CC7.2, CC7.3, CC8.1.

---

## F) SLAs, SLOs & Metrics
- **Intel publish latency:** ≤ 10m (p95); **TLP:RED publishes:** 0; **False positive rate:** ≤ 3%.
- **Detection backtest coverage:** ≥ 80% of replay corpus by 11‑24.
- **Evidence retention compliance:** 100% policy‑conform by 11‑27.

---

## G) Proof‑Carrying Analysis (PCA)
**Assumptions:** Ingestion v0 is live; SIEM supports replay; Grafana as‑code; evidence store available.  
**Evidence:** backtest reports, intel provenance, dashboard JSON, OPA unit tests, retro packs.  
**Caveats:** Replay representativeness; scoring drift; ensure PII remains redacted.  
**Verification:** Shadow → canary → enforce; backtest gates; weekly variance + FP review.

---

## H) Definition of Done — V4
- Intel v1 with scoring/decay/TLP; automated, auditable publishes.
- Backtesting harness live; +5 Sigma in enforce with FP ≤ 3%.
- Dashboards v2 deployed; evidence lifecycle policy enforced.
- Threat hunting program operational with notebooks and ledger.
- Purple tabletop plan approved; synthetic drills scheduled.

---

## I) Delivery Checklist
- [ ] Scoring/decay config merged; Rego tests pass
- [ ] Publisher respects TLP; provenance intact
- [ ] Backtest reports attached to PRs
- [ ] Sigma v3 + suppressions deployed
- [ ] Dashboards v2 applied in staging/prod‑canary
- [ ] Hunt notebooks published; ledger created
- [ ] Evidence lifecycle policy enforced
- [ ] DoD‑V4 sign‑off; artifacts hashed & archived

---

*Prepared by DIRK IG (Directorate K++). Auditable, fidelity‑focused sprint aligned to Q4 trains.*

