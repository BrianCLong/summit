# Covert Intelligence & Cybersecurity Workstream — Sprint 05 Plan & Artifacts

**Cadence:** 26 Nov – 09 Dec 2025  
**Role:** Covert Insights (Intelligence & Cybersecurity)  
**Workstream Slug:** `intel-sec`  
**Ordinal:** Sprint 05  
**Status:** Ready to start 30 Sep 2025  
**Prereqs:** Sprint 01–04 complete (CI security baseline; DaC; TAXII intel; TM-as-code; runbooks; staging→prod signed images; runtime detections; cloud/EDR/SaaS analytics; intel scoring; SOAR-lite; deception v1–v2; token binding & attestation; hunting pack; egress governance; SBOM→fix; continuous validation; privacy-safe telemetry).

---

## 1) Executive Summary

**Objective:** Reach **fleet-level attested identity**, **full egress enforcement**, and **closed-loop intel & detection quality**—plus add **adversary emulation at scale** and **risk-cost KPIs**. We’ll (a) federate identities across clusters, (b) enforce egress categories in prod with safe exceptions, (c) upgrade intel scoring with ML features + feedback from detections, (d) codify ATT&CK coverage and auto-gap creation, and (e) automate purple-team runs with evidence capture.

**Key outcomes (by Day 14):**

- **SPIFFE/Sigstore federation** across 2+ clusters/regions with mesh mTLS; ≥70% of tier-0/1 services attested.
- **Prod egress enforcement** for high-risk categories org-wide; exception TTL & approvals measurable.
- **Intel scoring v2** with feature store + model baseline; precision-recall tracked on historical alerts.
- **Coverage engine** maps detections to ATT&CK; opens issues for uncovered TTPs; dashboard shows delta.
- **Purple-team automation v2** executes scenarios weekly with artifact capture; findings auto-routed.

---

## 2) Scope & Alignment

- **Platform/Infra:** SPIFFE federation or Sigstore trust domains; mesh policy rollout; egress controller in prod.
- **Data & Analytics:** Feature store for intel/detection ML; dashboards for coverage/cost-risk.
- **Product Teams:** Light-touch; identity/egress controls mostly transparent; exception workflows documented.
- **SecOps:** Oversees tuning; reviews coverage gaps & purple-team findings; co-owns exception approvals.

---

## 3) Deliverables & Definition of Done

### D1: Federated Attested Identity (Multi-cluster)

**Deliverables**

- SPIFFE trust-domain federation (or Fulcio roots distribution) across `us-*` and `eu-*` clusters.
- Mesh policy enforcing peer cert SAN checks + SPIFFE ID allowlists per namespace.
- Automated cert rotation checks & alerts.

**DoD**

- ≥70% tier-0/1 services use attested identities; cross-cluster calls validated; break-glass documented.

### D2: Full Prod Egress Enforcement

**Deliverables**

- OPA/ABAC category policies enforced for **malware hosting**, **dynamic DNS**, **unknown**, and **code exfil** domains.
- Exception workflow (ticket-tag + TTL CRD) with approver groups and audit trail.
- eBPF/CNI flow labeler exporting metrics by namespace/team.

**DoD**

- Enforcement live; ≤2% legit traffic blocked (rapid exceptions); weekly report of exceptions & burn-down.

### D3: Intel Scoring v2 (ML-augmented)

**Deliverables**

- Feature store schemas: source_trust, recency_decay, sandbox_verdict, co-occurrence, alert_hits, suppression_rate, ASN/geo rarity.
- Baseline logistic regression or gradient boosting with offline eval; thresholding policy; model card.
- Feedback loop: alerts (true/false) update features; decay & retrain job.

**DoD**

- Precision ≥0.85 at selected threshold on validation slice; indicators above threshold exported; drift monitor green.

### D4: ATT&CK Coverage Engine

**Deliverables**

- Mapping file linking rules→techniques/sub-techniques; parser for SIEM configs.
- Coverage dashboard with TTP heatmap; issue generator for uncovered techniques with priority scoring.

**DoD**

- Heatmap published; ≥10 uncovered high-priority TTPs turned into tickets with owners & SLAs.

### D5: Purple-Team Automation v2

**Deliverables**

- Scenario library expansion (cloud persistence, kube lateral movement, OAuth abuse, data staging/exfil).
- Orchestrator: schedules, executes in isolated sandboxes, collects logs/pcaps/alerts, posts findings.

**DoD**

- ≥6 scenarios executed; evidence archived; ≥2 detection/content improvements merged.

### D6: Cost & Risk Metrics

**Deliverables**

- Cost model linking alerts → time spent → $; risk-adjusted KPI for critical controls (enforcement coverage × likelihood × impact reduction).
- Weekly PDF/HTML report template; trend lines & targets.

**DoD**

- Report generated with last 4 weeks of data; reviewed by CISO + PMO.

---

## 4) Day-by-Day Plan (14 Days)

**Days 1–2**

- Stand up SPIFFE/Sigstore federation; distribute roots; enable mesh SAN checks in shadow.
- Egress enforcement audit-only on prod; collect baseline metrics.

**Days 3–4**

- Flip high-risk categories to enforce; wire exception CRD & approver groups; publish runbook.
- Build intel feature store; backfill 90 days; train v1 model; offline eval.

**Days 5–7**

- Enable mesh mTLS enforcement; roll to 50% namespaces; monitor; expand to 70%.
- Implement ATT&CK mapping & heatmap; open gap tickets.

**Days 8–10**

- Purple-team v2 scenarios; artifact capture; fix PRs for coverage; tweak thresholds.
- Add drift monitors for intel model; set retrain schedule.

**Days 11–12**

- Cost/risk KPI calculation; dashboard & weekly report wiring.
- Close the loop on exceptions; ensure TTL expirations & audits work.

**Days 13–14**

- Stabilization, docs, retro; backlog for Sprint 06.

---

## 5) Risks & Mitigations

| Risk                          | Likelihood | Impact | Mitigation                                                      |
| ----------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| Federation trust misconfig    | Med        | High   | Staged rollout; canary namespace; automated cert checks         |
| Egress over-block             | Med        | Med    | Audit-first; exception TTL; vendor allowlists                   |
| ML model drift                | Med        | Med    | Drift metrics; periodic retrain; rollback to rule-based scoring |
| Purple-team collateral noise  | Low        | Med    | Scoped sandboxes; maintenance windows; comms                    |
| Coverage mapping inaccuracies | Med        | Low    | Peer review; regression tests; auto-sync with SIEM exports      |

---

## 6) Artifacts & Scaffolding

### 6.1 SPIFFE Federation & Mesh Policy

**`/identity/spiffe/federation.yaml`**

```
apiversion: spiffe.io/v1alpha1
kind: Federation
metadata:
  name: global
spec:
  trustDomains:
    - name: spiffe://example.us
      bundleEndpoint: https://spire-us.example.com/bundle
    - name: spiffe://example.eu
      bundleEndpoint: https://spire-eu.example.com/bundle
```

**`/mesh/policy/peer-san-allowlist.yaml`**

```
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-spiffe-calls
spec:
  selector:
    matchLabels: { app: payments }
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["spiffe://example.us/ns/prod/sa/api-gw"]
```

**`/metrics/alerts/spiffe-rotation.rules.yaml`**

```
- alert: SpiffeCertExpiringSoon
  expr: spiffe_cert_not_after - time() < 86400*7
  for: 1h
  labels: { severity: warning }
  annotations: { summary: "SPIFFE cert expiring within 7 days" }
```

### 6.2 Egress Enforcement

**`/policy/egress/categories.rego`**

```
package egress

is_blocked_category(cat) { cat == "malware" }
is_blocked_category(cat) { cat == "dynamic_dns" }
is_blocked_category(cat) { cat == "unknown" }
is_blocked_category(cat) { cat == "code_exfil" }

deny[msg] {
  input.dest.category = cat
  is_blocked_category(cat)
  not input.exception_granted
  msg := sprintf("Blocked egress to %v (%v)", [input.dest.host, cat])
}
```

**`/policy/exceptions/workflow.md`**

- How to request/approve exceptions; TTL defaults; audit trail; reviewer groups.

**`/egress/exporters/flow_labeler.py`**

```
# eBPF/CNI flow meter → metrics with ns, team, dest, category
```

### 6.3 Intel Scoring v2

**`/intel/ml/feature_store.yaml`**

```
entities:
  - indicators
features:
  - source_trust: float
  - recency_decay: float
  - sandbox_verdict: enum
  - cooccurrence: float
  - alert_hits_30d: int
  - suppression_rate_30d: float
  - asn_geo_rarity: float
labels:
  - alert_true_positive
```

**`/intel/ml/train.py`**

```
# Loads features; trains baseline model; outputs metrics, ROC, PR curves; writes model.pkl & model_card.md
```

**`/intel/ml/model_card.md`**

```
Model: IntelScoreV2-Baseline
Task: Binary classification (useful indicator)
Metrics: Precision@threshold, Recall, AUROC, AUPRC
Risks: dataset bias; concept drift; actionability constraints
Safeguards: drift monitors; rollback; human review gates
```

### 6.4 ATT&CK Coverage Engine

**`/coverage/mapping.yaml`**

```
- rule: Exec_Into_Container
  technique: T1059.004
- rule: IAM_Key_Without_Ticket
  technique: T1098
```

**`/coverage/build_heatmap.py`**

```
# Generates JSON for dashboard + opens tickets for uncovered TTPs with priority scoring
```

### 6.5 Purple-Team Automation v2

**`/validation/scenarios/kube_lateral_move.yaml`**

```
name: Kube Lateral Movement
steps:
  - action: create_sa_token
  - action: use_token_other_ns
expect:
  - alert: Exec_Into_Container
  - alert: SA_Token_File_Write
```

**`/validation/orchestrator/run_scenarios.py`**

```
# Runs scenarios on schedule; captures logs/pcaps; stores in /validation/artifacts; posts summary
```

### 6.6 Cost & Risk Metrics

**`/metrics/cost/model.py`**

```
# Estimate $/alert from handle time; aggregate by rule; compute risk-adjusted value = (likelihood*impact*coverage)
```

**`/metrics/grafana/intel-sec-v5.json`** — panels: federated identity coverage, egress blocks/exception trend, intel precision/recall, ATT&CK coverage %, purple-team pass rate, $/alert.

**`/reports/weekly/intel-sec-report.md`**

```
# Intel-Sec Weekly Report
## Highlights
## Key Metrics
## Exceptions Overview
## Coverage & Gaps
## Actions for Next Week
```

### 6.7 Runbooks (Additions/Updates)

- **`/runbooks/federation-incident.md`** — when cross-cluster identity fails.
- **`/runbooks/egress-exception.md`** — who approves, how, and for how long.
- **`/runbooks/model-drift.md`** — thresholds, rollback, and retrain steps.

---

## 7) Success Metrics (Sprint 05)

- **Identity:** ≥70% tier-0/1 services attested & enforced; zero Sev-1 caused by federation rollout.
- **Egress:** Enforcement enabled on listed categories; <2% legit traffic blocked; all exceptions have TTL & audit.
- **Intel ML:** Precision ≥0.85; drift < threshold; export pipeline stable.
- **Coverage:** Heatmap published; ≥10 high-priority gaps ticketed with owners.
- **Purple-Team:** ≥6 scenarios executed; ≥2 improvements merged.
- **Reporting:** Weekly report delivered with cost/risk KPIs.

---

## 8) Backlog → Sprint 06 (Preview)

- Expand attestation to 90%+ services; SPIFFE federation with partners/vendors.
- Full category-based egress enforcement with automated vendor verification.
- Active deception in high-value DBs and admin planes.
- Online learning for intel scoring with human-in-the-loop triage UI.
- Consolidated content testing platform (detections + playbooks + policies) with golden datasets.
