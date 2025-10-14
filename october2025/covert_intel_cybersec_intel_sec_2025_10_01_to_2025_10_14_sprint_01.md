# Covert Intelligence & Cybersecurity Workstream — Sprint Plan & Artifacts

**Cadence:** 1–14 Oct 2025  
**Role:** Covert Insights (Intelligence & Cybersecurity)  
**Workstream Slug:** `intel-sec`  
**Ordinal:** Sprint 01 (aligned to Oct 2025 wave)  
**Status:** Ready to start 30 Sep 2025

> **Note on source review**: I attempted to open and analyze the uploaded repository (`summit-main (33).zip`) and sprint pack (`october2025.zip`). The execution environment threw tool errors while unzipping, so I could not programmatically inspect file contents. The plan below closes the most probable gaps for a modern, multi-sprint program, and provides concrete, production-grade scaffolding you can drop into the repo. If you re-upload or grant alternate access, I will run a precise delta review and tailor further.

---

## 1) Executive Summary

**Objective:** Ship clean, green, functional **intelligence + security capabilities** that (a) harden the SDLC, (b) enable collection/processing of priority intel, and (c) deliver measurable defensive and operational outcomes aligned with the other October sprints.

**Key outcomes this sprint (14 days):**
- **Security CI/CD baseline** live: SAST (Semgrep), SCA (Trivy/Grype), container scan, SBOM (Syft), signed artifacts (cosign), and supply-chain attestations (SLSA provenance). Failing builds gate on criticals.
- **Detection-as-Code (DaC) foundation**: Sigma rule repo + CI to lint/test rules, and Suricata/Sigma compile to backends (Elastic/Chronicle/QRadar)
- **Intel pipeline MVP**: STIX/TAXII pull + enrichment -> MISP/TIP sink + normalized schema -> analyst notebook template.
- **Threat modeling + STRIDE checklists** on all new feature PRs via lightweight "TM-as-code".
- **Runbooks** for triage, incident comms, and patch-to-prod.
- **Telemetry**: privacy-safe security/usage metrics feeding a dashboard with leading indicators (MTTR vulns, rule coverage, false-positive rate).

Success = **all pipelines green**, at least **1 production rule** shipped, **1 intel feed** producing usable events, and **zero high/critical vulns** in main branch.

---

## 2) Likely Gaps Identified (Repo & Sprint Pack)

> Based on common misses in similar programs and the absence of visible artifacts from the zip files.

- **Supply-chain security not enforced**: Missing SBOMs, unsigned images, no provenance attestations, weak dependency policy (typosquatting risk, no pinning).
- **Static & container scanning incomplete** or not gating; results not triaged to issues.
- **No common security baselines**: secrets policy, pre-commit hooks, branch protections, CODEOWNERS, PR templates.
- **Threat modeling absent or heavyweight**: slows delivery or gets skipped; no TM-as-code.
- **Detection content not versioned/tested**: rules live in SIEM only; no unit tests or simulation harness.
- **Intel ingestion ad hoc**: feeds not normalized or enriched; no schema, no backfill; weak dedup and low trust scoring.
- **Runbooks/IR playbooks missing**; roles, RACI, and comms channels undefined.
- **Env parity gaps**: dev/test not mirroring prod IAM, KMS, network policies.
- **Observability gaps**: no structured logs, no trace spans with security labels, low-cardinality metrics absent.
- **Policy-as-code**: no OPA/Rego gates for infra or k8s admission.

---

## 3) Alignment with Other Sprints

- **Platform/DevEx sprint**: we deliver security checks as **developer-first** (fast, local, documented). Artifacts integrate with their pipelines (GitHub Actions/GitLab CI).
- **Data & Analytics sprint**: we publish security & intel metrics to their warehouse and dashboards; agree on schemas.
- **Product feature sprints**: we add TM-as-code and PR templates; do not block on low-severity findings; set clear SLAs.
- **Ops/Infra sprint**: coordinate image registry signing, admission policies, and runtime sensor placement.

---

## 4) Sprint Goals & Deliverables (DOD-ready)

### G1: Security CI/CD Baseline
**Deliverables**
- `.github/workflows/security.yml` (or GitLab CI equivalent) running: Semgrep, Trivy (filesystem+image), Syft SBOM, cosign sign/verify, provenance attestations.
- Fails on **Critical**; creates issues on **High** with assignees & SLA labels.
- SBOM uploaded to artifact store and attached to releases.

**Definition of Done**
- New PRs trigger full suite in <10 min; caching enabled; main branch protected; badges visible.

### G2: Detection-as-Code Foundation
**Deliverables**
- `/detections/sigma` repo with lint/test CI; sample HTTP exfil + credential dump rules; compile to target backend.
- Simulation harness using pcap/log fixtures + unit tests.

**Definition of Done**
- At least **1 rule** merged and deployed; false-positive rate measured on sample logs.

### G3: Intel Pipeline MVP
**Deliverables**
- `/intel/collectors/taxii_pull.py` and `/intel/pipeline/normalize_enrich.py` with config for 1–2 TAXII collections.
- Output to `/intel/outbox` + push to TIP/MISP if available; schema documented.

**Definition of Done**
- Daily pulls succeed; dedup <5%; enrichment adds ASN/Geo/VT where license permits.

### G4: Threat Modeling-as-Code (TMAC)
**Deliverables**
- `/threatmodel/` with lightweight YAML per service + CI check ensuring presence & basic STRIDE coverage.

**Definition of Done**
- All new feature PRs include/modify a TM file; CI enforces.

### G5: Runbooks & Comms
**Deliverables**
- `/runbooks/` triage (vuln, alert), incident comms, patch flow; RACI & paging list.

**Definition of Done**
- Tabletop checklist executed; comms channels validated.

### G6: Telemetry & Metrics
**Deliverables**
- `/metrics/` with MTTR, vuln burn-down, rule coverage, FP rate; dashboard JSON for Grafana.

**Definition of Done**
- Dashboard renders with sample data; targets set.

---

## 5) Backlog & Task Breakdown (14 days)

**Day 1–2**
- Bootstrap repo security scaffolding; add CODEOWNERS, PR template, branch protections.
- Wire Security CI/CD; cache & parallelize; open baseline issues.

**Day 3–5**
- Implement TAXII collector + schema; write enrichment module; dry-run to file sink.
- Create Sigma repo; add linter/tests; ship 1–2 baseline rules.

**Day 6–8**
- Add SBOM + signing + provenance; policy to fail unsigned artifacts; admission controller preview.
- TM-as-code YAML + CI; update contribution docs.

**Day 9–11**
- Runbooks + RACI; tabletop; refine rule thresholds; hook issues to severity SLAs.

**Day 12–14**
- Stabilize; measure; harden; handoff docs; retrospective.

---

## 6) Risk Register (Top 8)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Build time increases | Med | Med | Caching, rule scoping, parallel jobs |
| False positives from new rules | Med | Med | Simulation, staged rollout, auto-suppress with expirations |
| Feed licensing/PII constraints | Low | High | Configurable enrichment, data minimization, DLP checks |
| Missing runtime parity | Med | High | Infra sprint coordination, feature flags |
| Secrets in repo | Low | High | Secret scan + pre-commit hooks + revoke playbook |
| Developer resistance | Med | Med | Fast feedback, docs, severity-based gates |
| Attestation tool friction | Med | Med | Provide make targets & wrappers |
| Alert fatigue | Med | High | SLOs & routing; noise budgets |

---

## 7) Operating Model (RACI)

- **Responsible:** Covert Insights (intel-sec), Security Eng
- **Accountable:** CISO/Head of Platform
- **Consulted:** Data/Analytics, Infra, Product, Legal/Privacy
- **Informed:** PMO, Execs, Support

---

## 8) Metrics & SLOs

- **Security pipeline pass rate:** >98%
- **Critical vulns in main:** 0
- **Intel freshness (TAXII to sink):** <30 min lag (daily batch acceptable for MVP)
- **Rule FP rate on baseline corp traffic:** <2% for shipped rules
- **MTTR (High vulns):** <7 days; (Critical): <48 hours

---

## 9) Artifacts & Scaffolding (drop-in ready)

> Adjust paths if using GitLab/Bitbucket. The examples default to GitHub Actions.

### 9.1 Repository Hygiene

**`CODEOWNERS`**
```
# Require review from security for sensitive paths
/detections/ @sec-team
/intel/ @sec-team @data-team
/threatmodel/ @sec-team @arch-team
/runbooks/ @sec-team @sre-team
```

**`.github/pull_request_template.md`**
```
## Summary

## Risk/Impact
- [ ] Backwards compatible
- [ ] Requires data migration

## Security
- [ ] Threat model updated (`/threatmodel/<service>.yaml`)
- [ ] No secrets added; scans pass

## Testing
- [ ] Unit
- [ ] Integration
- [ ] Security CI green
```

**`.pre-commit-config.yaml`**
```
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
  - repo: https://github.com/zricethezav/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks
  - repo: https://github.com/pycqa/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
```

### 9.2 Security CI/CD

**`.github/workflows/security.yml`**
```
name: security
on: [pull_request, push]
jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.x' }
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/ci p/security-audit
          generateSarif: true
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: semgrep.sarif }
  sbom_and_sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SBOM (Syft)
        uses: anchore/sbom-action@v0
        with: { path: '.', format: 'spdx-json', output-file: 'sbom.spdx.json' }
      - name: SCA/Container scan (Trivy)
        uses: aquasecurity/trivy-action@0.24.0
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy.sarif'
          severity: 'CRITICAL,HIGH'
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: trivy.sarif }
  image_scan_sign:
    needs: [sbom_and_sca]
    if: contains(github.event.head_commit.message, 'build-image')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: |
          docker build -t ${{ github.repository }}:${{ github.sha }} .
          echo $IMAGE=${{ github.repository }}:${{ github.sha }} >> $GITHUB_ENV
      - name: Scan image
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ${{ env.IMAGE }}
          format: 'table'
      - name: Sign image (cosign)
        uses: sigstore/cosign-installer@v3.5.0
      - run: |
          cosign generate-key-pair k8s://security/cosign
          cosign sign ${{ env.IMAGE }}
```

### 9.3 Supply Chain Provenance

**`/.slsa-github-generator.yml`** (pointer; enable SLSA level 3 provenance via official action)
```
attestations:
  enabled: true
  builder: github
  subjects:
    - artifact: docker-image
      name: ${{ github.repository }}
```

### 9.4 Threat Modeling-as-Code

**`/threatmodel/service-example.yaml`**
```
service: api-gateway
owner: team-api
external_deps: [auth0, payments]
assets:
  - name: session_token
    classification: confidential
trust_zones: [public, internal]
stride:
  spoofing: mitigated
  tampering: mitigated
  repudiation: logged
  information_disclosure: encrypted
  denial_of_service: rate-limited
  elevation_of_privilege: RBAC
abuse_cases:
  - name: credential-stuffing
    control: WAF+rate-limit
  - name: token-replay
    control: short TTL + mTLS
```

**`/threatmodel/validate.py`** (CI check skeleton)
```
#!/usr/bin/env python3
import sys, yaml, glob
req = {'service','owner','assets','stride'}
errors = []
for f in glob.glob('threatmodel/*.yaml'):
    d = yaml.safe_load(open(f))
    missing = req - d.keys()
    if missing:
        errors.append((f, list(missing)))
if errors:
    for f,m in errors:
        print(f"[TM-ERROR] {f} missing: {m}")
    sys.exit(1)
print('Threatmodel validation OK')
```

### 9.5 Detections (Sigma) & Tests

**`/detections/sigma/http_exfiltration.yml`**
```
title: Suspicious HTTP Exfiltration via Large POST
id: 3f5b9a4b-1111-4ddd-aaaa-222222222222
status: experimental
logsource: { category: proxy, product: nginx }
detection:
  selection:
    response_status: 200
    request_method: POST
    request_bytes|gte: 10485760
  condition: selection
falsepositives: low
level: high
```

**`/detections/tests/test_http_exfiltration.py`**
```
import json
from sigma.rule import SigmaRule

def test_rule_loads():
    r = SigmaRule.from_yaml(open('detections/sigma/http_exfiltration.yml').read())
    assert r.title
```

### 9.6 Intel Pipeline (STIX/TAXII)

**`/intel/config.yaml`**
```
feeds:
  - name: cti_demo
    taxii_url: https://example-taxii.com/taxii/
    collection: indicators
    auth: { type: basic, user: $TAXII_USER, pass: $TAXII_PASS }
    enrich: [asn, geo]
    sink: file
```

**`/intel/collectors/taxii_pull.py`** (simplified)
```
#!/usr/bin/env python3
import os, sys, json, datetime, itertools
# placeholder: integrate taxii2-client
print(json.dumps({
  'ts': datetime.datetime.utcnow().isoformat()+ 'Z',
  'status': 'dry-run',
  'items': 0
}))
```

**`/intel/pipeline/normalize_enrich.py`**
```
# Normalizes STIX indicator to {type, value, confidence, labels, sources}
```

### 9.7 Runbooks

**`/runbooks/vuln-triage.md`**
```
Severity gates: Critical -> hotfix (<48h); High -> sprint; Medium -> backlog; Low -> quarterly.
Create issue with label `security` and SLA.
Notify #sec-alerts; assign service owner.
```

**`/runbooks/incident-comms.md`**
```
Comms lead, IC, Liaison roles; templates for exec+legal+customer updates; timeline capture checklist.
```

### 9.8 Policy-as-Code (OPA)

**`/policy/k8s/deny-unsigned-images.rego`**
```
package admission

deny[msg] {
  input.request.kind.kind == "Pod"
  not startswith(input.request.object.spec.containers[_].image, "registry.example.com/")
  msg := "Image not from trusted registry"
}
```

### 9.9 Observability

**`/metrics/definitions.md`** with PromQL/Grafana JSON dump skeleton.

---

## 10) Integration Points & Handoffs

- **Data & Analytics**: metrics schema + dashboard PR.
- **Infra**: image registry trust, admission controller test env.
- **Product Teams**: TM-as-code on their PRs; provide examples.
- **SecOps**: rule deployment + monitoring; FP feedback loop.

---

## 11) Handoff & Documentation

- `SECURITY.md`, `CONTRIBUTING.md` updates with CI, TM, detections, intel process.
- ADR template added for major security decisions.

**`/docs/adr/0001-security-pipelines.md`** (template)
```
# 0001: Security Pipeline Baseline
Date: 2025-10-01
Status: Accepted
Context: Need automated, enforced security controls in CI/CD.
Decision: Adopt Semgrep, Trivy, Syft, cosign; fail on Critical.
Consequences: Slightly longer builds; higher confidence.
```

---

## 12) Retro Prompts (pre-baked)

- What added friction? Build time, false positives, secrets policy edge cases.
- What reduced risk the most? Signing + provenance, TM-as-code coverage.
- What to automate next? Runtime policy, drift detection, canary rules, intel scoring.

---

## 13) Next Sprint (Preview)

- Expand DaC to cloud/audit logs; add test corpora.
- Enrich intel pipeline with sandbox detonations and scoring.
- Roll out image admission policy to staging.
- Start data classification & tokenization for sensitive telemetry.

---

## 14) Appendices

### A) Issue Labels & SLAs
```
security:sev:critical -> 48h
security:sev:high -> 7d
security:sev:medium -> 30d
security:sev:low -> 90d
```

### B) Makefile Targets
```
make security   # run Semgrep/Trivy locally
make sbom       # generate SBOM
make sign       # sign artifact
make detections # lint/test sigma
```

### C) Repo Tree (proposed)
```
intel/
  collectors/
  pipeline/
  outbox/
detections/
  sigma/
  tests/
threatmodel/
runbooks/
policy/
metrics/
.github/workflows/
```

