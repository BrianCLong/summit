# Covert Intelligence & Cybersecurity Workstream — Sprint 02 Plan & Artifacts

**Cadence:** 15–28 Oct 2025  
**Role:** Covert Insights (Intelligence & Cybersecurity)  
**Workstream Slug:** `intel-sec`  
**Ordinal:** Sprint 02 (aligned to Oct 2025 wave)  
**Status:** Ready to start 30 Sep 2025  
**Prereq:** Sprint 01 baseline (CI security, DaC, TAXII MVP, TM-as-code, runbooks) is green.

---

## 1) Executive Summary

**Objective:** Evolve from baselines to **enforced runtime controls**, **production-grade intel**, and **automated incident response**—without slowing feature teams. We’ll (a) enforce image trust and provenance in staging, (b) expand detection coverage with eBPF/Falco rules and cloud audit analytics, (c) score and deduplicate intel with sandbox enrichment, and (d) add responder automations gated by safety/approvals.

**Key outcomes (by Day 14):**

- **Admission control (staging)** denies unsigned/unknown images; verifies cosign and SLSA attestations.
- **Runtime detections** (Falco/eBPF) shipped with tests; at least 3 rules live; alert routing noise < 5% FP in staging.
- **Intel scoring pipeline** live with trust/confidence + sandbox verdicts; indicators pushed to TIP/MISP.
- **SOAR-lite automations** (ticket, isolate pod/node toggle, revoke token) with human-in-the-loop approvals.
- **Cloud audit analytics**: 4 Sigma-like detections compiled to SIEM for IAM/risky API actions.
- **Dashboards** extended with runtime & intel KPIs; burn-down trend visible.

---

## 2) Scope & Alignment

- **Platform/Infra:** We integrate with k8s admission (Gatekeeper or Kyverno), image registry, and Sigstore/cosign.
- **Data & Analytics:** We publish intel scoring + alert outcomes to warehouse; they render dashboards.
- **Product Teams:** No change to dev loop; admissions in **staging only** this sprint with allowlist + dry-run preview before enforce.
- **SecOps:** Owns rule tuning and SOAR approvals; we ship content/tests.

---

## 3) Deliverables & Definition of Done

### D1: Image Trust & Provenance Enforcement (Staging)

**Deliverables**

- Gatekeeper/Kyverno policies to **require cosign signatures** and **SLSA provenance** claims.
- ClusterRole/ServiceAccount + CI job to attach attestations on build.
- Allowlist for base images and sidecars.

**DoD**

- Unsigned or unknown-digest images **blocked** in staging; emergency bypass doc exists.

### D2: Runtime Detection (Falco/eBPF) + Tests

**Deliverables**

- Falco rules for: (1) exec into containers, (2) unexpected outbound to rare ASN, (3) write to mounted service account token paths.
- Test harness with pcap/process event fixtures; CI lints rules and runs simulations in a kind/minikube job.

**DoD**

- ≥3 rules active; FP <5% on staging baseline; runbook link embedded in alerts.

### D3: Threat Intel Scoring & Enrichment

**Deliverables**

- Scoring function combining source trust, recency, hit-rate, sandbox verdict (benign/mal/malicious family), and co-occurrence.
- De-duplication using indicator canonicalization (e.g., FQDN punycode, CIDR collapsing, hash normalization).
- MISP/TIP push connector + backfill job.

**DoD**

- Indicators with score ≥ threshold exported daily; TIP shows collections tagged by campaign/theme.

### D4: Cloud Audit Analytics (DaC Expansion)

**Deliverables**

- Detection rules for cloud provider logs (IAM keys created without ticket, role assumption from new ASN, mass object read, KMS decrypt spikes).
- Compilation to SIEM backend and unit tests with sample logs.

**DoD**

- ≥4 rules live; alert-to-triage < 10 minutes; false alarm feedback loop established.

### D5: SOAR-lite Automations (Human-in-the-Loop)

**Deliverables**

- YAML playbooks (create ticket, tag asset, disable user, quarantine pod via label) with approval gates.
- Safety controls: dry-run, rate-limit, auto-roll-back if noisy.

**DoD**

- Two playbooks runnable from alert; audit trail persisted; approval captured.

### D6: Metrics & Dashboards v2

**Deliverables**

- Runtime KPIs: rule FP rate, alert MTTA/MTTR, quarantine duration, intel score distribution.
- Grafana/Looker JSON updates; Prometheus alerts for drift.

**DoD**

- Dashboards render with live data; weekly report template generated.

---

## 4) Day-by-Day Plan (14 Days)

**Days 1–2**

- Deploy Gatekeeper/Kyverno in staging (audit mode).
- Wire CI to attach cosign signatures + SLSA attestations.
- Draft allowlist policy; run dry-run on current workloads.

**Days 3–4**

- Implement admission policies; switch to enforce with emergency label bypass.
- Start Falco rule pack; build kind-based CI job for rule tests.

**Days 5–7**

- Intel scoring module + canonicalization; add sandbox stub; push to TIP/MISP (file or API).
- Cloud audit detection rules + unit tests; onboard to SIEM.

**Days 8–10**

- SOAR-lite: playbook runner + approval flow; link to alerting pathways.
- Tune Falco rules; add egress rare-ASN detector with baseline cache.

**Days 11–12**

- Dashboard v2; SLO alerts; finalize runbooks and emergency procedures.
- Tabletop: image-block scenario + noisy alert rollback.

**Days 13–14**

- Hardening, docs, and handoff; retro capture; backlog grooming for Sprint 03.

---

## 5) Risks & Mitigations

| Risk                            | Likelihood | Impact | Mitigation                                                    |
| ------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Over-blocking legitimate images | Med        | High   | Start audit mode; allowlist; emergency bypass; staged rollout |
| Falco kernel/module issues      | Low        | Med    | Use container-only rules; version-pin; eBPF fallback          |
| TIP/MISP API limits/licensing   | Med        | Med    | Batch exports; backoff; file sink fallback                    |
| SOAR automation misfire         | Low        | High   | Human-in-the-loop approvals; dry-run; rollback scripts        |
| Alert fatigue                   | Med        | High   | Noise budget; suppression windows; rule tests                 |

---

## 6) Artifacts & Scaffolding

### 6.1 Admission Control (Gatekeeper) — Require Signed Images

**`/policy/gatekeeper/templates/k8srequiredsignatures_template.yaml`**

```
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredsignatures
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredSignatures
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredsignatures
        violation[msg] {
          input.review.kind.kind == "Pod"
          some c
          c := input.review.object.spec.containers[_]
          not startswith(c.image, input.parameters.trustedRegistry)
          msg := sprintf("Image %v not from trusted registry", [c.image])
        }
```

**`/policy/gatekeeper/constraints/require_signed_images.yaml`**

```
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredSignatures
metadata:
  name: require-signed-images
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["staging"]
  parameters:
    trustedRegistry: "registry.example.com/"
```

**`/admission/webhook/cosign-verify.yaml`** (if using validating webhook)

```
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: cosign-verify
webhooks:
- name: verify.sigstore.example.com
  admissionReviewVersions: ["v1"]
  sideEffects: None
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE","UPDATE"]
    resources: ["pods"]
  clientConfig:
    service:
      name: cosign-verify
      namespace: security
      path: /validate
```

### 6.2 CI Step — Attach SLSA Attestation & Cosign Signature

**`.github/workflows/release-sign-attest.yml`**

```
name: release-sign-attest
on:
  push:
    tags: ['v*']
jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          docker build -t ${{ github.repository }}:${{ github.ref_name }} .
          echo IMAGE=${{ github.repository }}:${{ github.ref_name }} >> $GITHUB_ENV
      - uses: sigstore/cosign-installer@v3.5.0
      - name: Sign image
        run: cosign sign $IMAGE
      - name: Generate SLSA provenance
        uses: slsa-framework/slsa-github-generator/actions/delegator/generic@v2
        with:
          attestation-name: provenance.intoto.jsonl
```

### 6.3 Falco Rules & Tests

**`/detections/falco/rules.yaml`**

```
- rule: Exec_Into_Container
  desc: Detect interactive shells inside containers
  condition: container and spawned_process and proc.name in (bash,sh,zsh) and (evt.type = execve)
  output: "Shell spawned in container (user=%user.name cmd=%proc.cmdline container=%container.id image=%container.image.repository)"
  priority: WARNING

- rule: SA_Token_File_Write
  desc: Write attempts to service account token paths
  condition: container and evt.type in (open,openat) and fd.name startswith "/var/run/secrets/kubernetes.io/serviceaccount/" and evt.arg.flags contains O_WRONLY
  output: "Write to SA token path (proc=%proc.name file=%fd.name)"
  priority: ERROR

- rule: Rare_Egress_ASN
  desc: Outbound connection to ASN not in baseline cache
  condition: container and outbound and not fd.sip in (baseline.nets)
  output: "Outbound to rare ASN/IP (ip=%fd.sip proc=%proc.name)"
  priority: WARNING
```

**`/detections/falco/tests/run-kind.sh`**

```
#!/usr/bin/env bash
set -euo pipefail
kind create cluster --name falco-test || true
# install falco helm chart, mount rules.yaml, then simulate events
```

### 6.4 Cloud Audit Detections (Sigma-like)

**`/detections/sigma/cloud/iam_key_without_ticket.yml`**

```
title: IAM Access Key Created Without Ticket
logsource: { product: cloudtrail, service: iam }
detection:
  selection:
    eventName: CreateAccessKey
  condition: selection and not ticket_tag_present
fields: [userIdentity.arn, sourceIPAddress, requestParameters.userName]
level: high
```

### 6.5 Intel Scoring & Canonicalization

**`/intel/pipeline/score.py`**

```
from datetime import datetime, timezone

def decay_score(ts_iso, half_life_days=14):
    ts = datetime.fromisoformat(ts_iso.replace('Z','+00:00'))
    age = (datetime.now(timezone.utc) - ts).total_seconds()/86400
    return 0.5 ** (age/half_life_days)

def indicator_score(source_trust, recency_w, hit_rate, sandbox, cooc):
    base = 0.4*source_trust + 0.3*recency_w + 0.2*hit_rate + 0.1*cooc
    if sandbox == 'malicious':
        base += 0.2
    elif sandbox == 'benign':
        base -= 0.2
    return max(0, min(1, base))
```

**`/intel/pipeline/canonicalize.py`**

```
import ipaddress, idna

def canon_domain(d):
    try:
        return idna.encode(d.strip('.').lower()).decode()
    except Exception:
        return d.lower()

def canon_ip(v):
    try:
        return str(ipaddress.ip_address(v))
    except Exception:
        return v
```

**`/intel/export/misp_push.py`**

```
# placeholder: push scored indicators >= threshold to MISP/TIP
```

### 6.6 SOAR-lite Playbooks

**`/soar/playbooks/quarantine-pod.yaml`**

```
name: quarantine-pod
trigger: alert.tag == "containment"
approval: required
steps:
  - action: label
    resource: pod
    params: { label: quarantine=true }
  - action: scale
    resource: deployment
    params: { replicas: 0 }
rollback:
  - action: unlabel
    resource: pod
    params: { label: quarantine }
```

**`/soar/runner.py`**

```
# Loads YAML, prompts for approval, executes kubectl/SDK actions with audit log
```

### 6.7 Dashboards & Metrics

**`/metrics/grafana/intel-sec-v2.json`** — panels for FP rate, MTTA, MTTR, intel score histogram, quarantine count.  
**`/metrics/alerts/prometheus-rules.yaml`** — alerting rules for drift & high FP.

### 6.8 Runbooks (Updates)

**`/runbooks/quarantine.md`**

- Preconditions, approval chain, expected blast radius, rollback steps.  
  **`/runbooks/admission-bypass.md`**
- Label-based bypass, duration, audit entry.

---

## 7) Success Metrics (Sprint 02)

- **Admission blocks:** ≥1 real block caught in staging; 0 prod incidents caused by policy.
- **Runtime rules:** ≥3 enabled; FP <5%.
- **Intel:** ≥2 feeds scored; ≥100 high-score indicators exported; dedup ratio ≥30%.
- **SOAR:** ≥2 playbooks executed with approvals; no rollback beyond plan.
- **Analytics:** Cloud audit detections firing on test scenarios; MTTA < 10 min.

---

## 8) Backlog → Sprint 03 (Preview)

- Roll admission enforcement to prod with progressive rollout.
- Expand DaC to endpoint/EDR and SaaS audit logs.
- Add token-binding & key attestation for service identity.
- Implement canary tokens and deception beacons.
- Threat hunting package + weekly queries.

---

## 9) Operating Model & Handoffs

- **Responsible:** Covert Insights (intel-sec), SecOps
- **Accountable:** CISO/Head of Platform
- **Consulted:** Infra/Platform, Data/Analytics, Legal/Privacy
- **Informed:** PMO, Product Owners, Support
