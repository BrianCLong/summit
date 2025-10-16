# Covert Intelligence & Cybersecurity Workstream — Sprint 03 Plan & Artifacts

**Cadence:** 29 Oct – 11 Nov 2025  
**Role:** Covert Insights (Intelligence & Cybersecurity)  
**Workstream Slug:** `intel-sec`  
**Ordinal:** Sprint 03  
**Status:** Ready to start 30 Sep 2025  
**Prereqs:** Sprint 01–02 complete (CI security baseline, DaC, TAXII intel MVP, TM-as-code, runbooks; staging image trust enforce; Falco rules; cloud audit content; intel scoring; SOAR-lite).

---

## 1) Executive Summary

**Objective:** Move from staging to **production-grade enforcement**, **breadth of telemetry**, and **active defense**—while automating safe remediation. We will (a) roll out image trust + provenance enforcement to production with progressive controls, (b) expand detections to **endpoint/EDR and SaaS audit** sources, (c) deploy **deception/canary controls** and honey-credentials, (d) bind service identities with **token-binding & key attestation**, and (e) codify **threat hunting** with repeatable queries and metrics.

**Sprint Outcomes:**

- **Prod enforcement** of signed images + provenance (progressive, SLO-backed) with validated break-glass.
- **New log planes** on-boarded: endpoint/EDR + 2 strategic SaaS apps (IdP + Code host). 6+ tested detections live.
- **Deception assets** (canary tokens + honey users/creds) deployed with alert wiring and FP budget.
- **Service identity hardening**: short-lived tokens, audience-binding, key attestation on at least one critical workload.
- **Threat hunting pack v1** with weekly schedule + findings pipeline to tickets.

---

## 2) Scope & Alignment

- **Platform/Infra:** prod policy rollout via feature flags, progressive traffic (e.g., 10% pods → 25% → 50% → 100%).
- **Data & Analytics:** warehouse tables for endpoint + SaaS logs; dashboards updated for new KPIs.
- **Product Teams:** migration guide for image signing; emergency bypass maintained; zero-friction for routine deploys.
- **SecOps:** owns response + tuning; we ship content, controls, and automation hooks.

---

## 3) Deliverables & Definition of Done

### D1: Production Image Trust & Provenance Rollout

**Deliverables**

- Gatekeeper/Kyverno constraints with **progressive enforcement** controlled by ConfigMap/flag.
- Sigstore policy-controller or cosign verify job wired to prod registry.
- Emergency bypass with annotated change ticket + auto-expiring exception CRD.

**DoD**

- 100% workloads in prod either validated or on time-bound exception; zero Sev-1 outages from policy.

### D2: Endpoint/EDR & SaaS Audit Detections

**Deliverables**

- Parsers/normalizers for EDR (e.g., Sysmon-like JSON) and two SaaS sources (IdP + Code host).
- 6+ detections (credential theft artifacts, persistence, risky OAuth grant, mass repo clone, off-hours MFA push spamming).
- CI tests with sample logs; deployment to SIEM with owner + runbook link.

**DoD**

- ≥6 rules enabled; FP < 5% over baseline; MTTA < 10m.

### D3: Deception/Canary Controls

**Deliverables**

- Canary tokens (URLs/Docs/AWS keys) placed in low-traffic but discoverable paths.
- Honey users/creds with monitored access impossible in normal ops.
- Alert routes to #sec-alerts with unique tags; suppression windows defined.

**DoD**

- ≥10 canaries deployed; alerting verified; FP budget < 1/week.

### D4: Service Identity — Token Binding & Key Attestation

**Deliverables**

- Service-to-service auth updated to require **audience-bound**, **short-lived** tokens.
- One critical deployment using **key attestation** (e.g., cosign/fulcio-issued identities or TPM-backed keys) with policy that rejects un-attested tokens.

**DoD**

- Measurable reduction in token lifetime; attested identity enforced for 1 service; runbook in place.

### D5: Threat Hunting Pack v1

**Deliverables**

- `/hunting/queries/` library (cloud, endpoint, network, SaaS) with weekly run cadence.
- Findings pipeline to tickets with severity rubric and enrichment script.

**DoD**

- ≥12 queries scheduled; weekly report generated; ≥1 validated finding triaged.

---

## 4) Day-by-Day Plan (14 Days)

**Days 1–2**

- Wire prod registry verification; deploy policy-controller; set audit mode + 10% enforce.
- Onboard endpoint + SaaS logs (schemas + ingestion + test datasets).

**Days 3–5**

- Raise enforcement to 25–50%; implement exception CRD + TTL controller; run tabletop for break-glass.
- Ship first 4 EDR/SaaS detections; CI tests; SIEM routing.

**Days 6–8**

- Deploy canary tokens + honey users/creds; validate alerts; document placement strategy.
- Add 2 more SaaS/EDR detections; tune thresholds.

**Days 9–10**

- Implement audience-bound tokens + rotation; integrate attestation on 1 service; update admission checks.
- Build hunting pack; schedule weekly runs.

**Days 11–12**

- Dashboard updates (new KPIs); runbooks finalize; SLOs wired.
- Raise enforcement to 100% if burn-in clean; else hold at 50% and extend canary window.

**Days 13–14**

- Hardening, docs, retro; backlog for Sprint 04.

---

## 5) Risks & Mitigations

| Risk                                  | Likelihood | Impact | Mitigation                                                      |
| ------------------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| Prod policy causes deployment failure | Med        | High   | Progressive rollout; exception CRD; shadow mode; SLO guardrails |
| SaaS API limits/format drift          | Med        | Med    | Versioned parsers; contract tests; backoff                      |
| Canary token noise                    | Low        | Med    | Targeted placement; suppression; rotate labels                  |
| Attestation toolchain complexity      | Med        | Med    | Wrap in Make targets; clear docs; staged rollout                |
| Hunting FP overrun                    | Med        | Med    | Peer review; noise budgets; disable or re-scope queries         |

---

## 6) Artifacts & Scaffolding

### 6.1 Progressive Enforcement Controls

**`/policy/kyverno/require-signed-provenance.yaml`**

```
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-provenance
spec:
  validationFailureAction: Audit  # toggled to Enforce progressively
  rules:
  - name: verify-signature
    match:
      resources:
        kinds: [Pod]
    verifyImages:
    - imageReferences:
      - registry.example.com/*
      attestors:
      - entries:
        - keys:
            publicKeys: |
              -----BEGIN PUBLIC KEY-----
              <cosign-pub>
              -----END PUBLIC KEY-----
      mutateDigest: true
```

**`/policy/exceptions/exception.crd.yaml`** (time-bound exceptions)

```
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: policyexceptions.security.example.com
spec:
  names:
    plural: policyexceptions
    singular: policyexception
    kind: PolicyException
  scope: Cluster
```

**`/controllers/exception-ttl/controller.py`**

```
# Watches PolicyException; auto-expires after ttlHours; triggers re-eval
```

### 6.2 Parsers/Normalizers (Endpoint/SaaS)

**`/ingest/parsers/sysmon_json.py`**

```
# Map Sysmon fields to normalized schema: ts, host, user, proc, hash, action
```

**`/ingest/parsers/saas_idp.py`** and **`/ingest/parsers/saas_codehost.py`**

- Normalize login events, OAuth grants, repo actions.

### 6.3 Detections (Examples)

**`/detections/endpoint/suspicious_lsass_access.yml`**

```
title: LSASS Access by Non-Allowed Process
logsource: { product: windows, service: sysmon }
detection:
  selection:
    EventID: 10
    TargetImage|endswith: lsass.exe
  filter_allowed:
    Image|endswith:
      - taskmgr.exe
      - procexp64.exe
  condition: selection and not filter_allowed
level: high
```

**`/detections/saas/idp_mfa_fatigue.yml`**

```
title: MFA Push Fatigue Attack Pattern
detection:
  selection:
    eventType: MFA_CHALLENGE
  timeframe: 5m
  condition: count(selection by user) >= 5 and success == false
level: medium
```

**`/detections/saas/code_mass_clone.yml`**

```
title: Mass Repository Clone by Single Principal
detection:
  selection:
    action: repo.clone
  timeframe: 15m
  condition: count(selection by actor) >= 20
level: high
```

### 6.4 Deception/Canary Assets

**`/deception/canaries/placement.md`**

```
- Drop 3 URL tokens in internal wiki spaces (low traffic).
- 2 AWS-like keys in non-executable sample configs with warning banner.
- 3 doc beacons in shared drives named "Q4 OKR Draft".
- 2 honey users disabled in IdP with login alert only.
```

**`/deception/emitters/generate_tokens.py`**

- Generates signed canary URLs/keys; registers callbacks; stores IDs.

### 6.5 Service Identity Hardening

**`/identity/policies/audience-binding.rego`**

```
package identity

deny[msg] {
  input.jwt.aud != input.expected_aud
  msg := "Token audience mismatch"
}
```

**`/identity/attestation/attest-verify.sh`**

```
#!/usr/bin/env bash
set -euo pipefail
# verify cosign/fulcio certificate chain and attest workload identity
```

### 6.6 Hunting Pack & Automation

**`/hunting/queries/`**

- `cloud/rare_assume_role.sql`, `endpoint/signedbinaryproxy.kql`, `saas/impossible_travel.sql`, `network/dns_new_sld.sql`, etc.

**`/hunting/run.py`**

```
# Executes queries on schedule; writes findings to /hunting/outbox and opens tickets via API
```

### 6.7 Dashboards & Metrics

**`/metrics/grafana/intel-sec-v3.json`** — panels for enforcement coverage, exception TTL, EDR detection volume, SaaS risky events, canary triggers, hunting findings.  
**`/metrics/alerts/prometheus-rules-v3.yaml`** — alerts for policy drift, high exception count, canary storm.

### 6.8 Runbooks (Additions)

- **`/runbooks/exception-ttl.md`** — how to request/approve/expire production exceptions.
- **`/runbooks/canary-response.md`** — triage and forensics workflow for canary hits.
- **`/runbooks/attested-identity.md`** — rotating keys, verifying attestation failures, rollback path.

---

## 7) Success Metrics (Sprint 03)

- **Prod enforcement coverage:** ≥90% workloads validated; ≤10 active exceptions; all exceptions auto-expire.
- **Detections:** ≥6 new rules across EDR/SaaS; FP <5%; MTTA < 10m.
- **Deception:** ≥10 canaries live; ≤1 FP/week; any hit escalates within 10m.
- **Identity:** ≥1 critical service requires attested identity; token max lifetime ≤ 1h.
- **Hunting:** ≥12 queries scheduled; ≥1 confirmed finding triaged.

---

## 8) Compliance & Ethics

- Canary placements avoid personal files; bannered sample keys to prevent accidental use.
- PII minimization in logs; retention aligned to policy; legal/privacy sign-off on SaaS ingestion.

---

## 9) Backlog → Sprint 04 (Preview)

- Extend attested identity to all tier-0 services; mTLS with cert-bound identities.
- Roll deception into prod services (service beacons, canary routes).
- Add data egress governance (OPA/ABAC) and per-tenant isolation checks.
- Purple-team exercise + adversary emulation to validate controls.
