````markdown
---
slug: sprint-2025-11-24-foxtrot
version: v2025.11.24-f1
cycle: Sprint 28 (2 weeks)
start_date: 2025-11-24
end_date: 2025-12-05
owner: Release Captain (you)
parent_slug: sprint-2025-11-10-echo
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - FinOps Lead
  - Repo Maintainer / Arborist
objectives:
  - 'Blue/Green deploys for gateway + docs-api with zero-downtime flips and traffic mirroring.'
  - 'WAF + DDoS posture: managed rules, anomaly scoring, and synthetic attack drills.'
  - 'Secrets lifecycle: quarterly rotation automated end‑to‑end with attestations.'
  - 'Infra drift detection + auto-remediation proposals (Terraform + K8s).'
  - 'Perf focus: p95 < 1.2s on top 3 endpoints via profiling + caching; reduce cold-starts.'
  - 'Audit & compliance: SOC2/SOX-friendly evidence collection automated in CI.'
---

# Sprint 28 Plan — Blue/Green, Secrets Rotation, and Edge Security

Assumes Sprints 24–27 are deployed (canary, EMC, supply-chain signing, OPA bundles, multi-region rehearsals). This sprint introduces **Blue/Green** for critical services, hardens the edge with **WAF/DDoS**, formalizes **secrets rotation**, and clamps **infra drift**.

---

## 0) Definition of Ready (DoR)

- [ ] Services selected for Blue/Green have health endpoints and idempotent startup.
- [ ] WAF rule sets and allowlists drafted; drill window approved.
- [ ] Secrets inventory (who/what/where) documented; rotation order defined; break-glass plan set.
- [ ] Drift policy agreed: which resources are auto-remediated vs. require PR.
- [ ] Perf targets and test datasets locked; profiling hooks ready.

---

## 1) Swimlanes

### A. Blue/Green Delivery (Deployment + Platform)

1. **BG for gateway & docs-api** with weighted router and traffic mirror.
2. **Shadow tests** against Green before cutover; error budget guard.
3. **Rollback** via DNS/LB weight revert within 2 minutes.

### B. Edge Security (Security/Platform)

1. **WAF managed rules** (OWASP top-10) + custom allowlist/denylist; anomaly scoring.
2. **DDoS drill**: synthetic L7 surge with rate-limit and circuit breaker verification.

### C. Secrets Lifecycle (Security/CI/CD)

1. **Quarterly rotation** pipeline (KMS keys, API tokens, DB creds) with sealed-secrets update and staged rollout.
2. **Attestation** emitted per secret (who/when/what) to audit sink.

### D. Infra Drift & Governance (Platform/Arborist)

1. **Terraform drift** detection + plan comment bot; auto-PR proposals.
2. **K8s drift** guard (ensure desired replicas/probes/resources) via controller or policy.

### E. Performance & Cold-Start (Observability/Platform)

1. **Profiling** (CPU/mem/alloc) in stage under load; identify top 3 wins.
2. **Cache & connection pooling** improvements; **pre-warm** green on cut.

### F. Audit & Evidence (Compliance)

1. **Evidence collectors** in CI for changes affecting security/DR; store to object-lock bucket.

---

## 2) Measurable Goals

- Blue/Green flip for `gateway` and `docs-api` with **≤1 request** error spike and rollback tested.
- WAF enabled with <0.5% false positives during drill; DDoS surge handled with **no 5xx** (graceful 429s only).
- 100% scoped secrets rotated; attestations written with Object Lock.
- Drift bot posts plan on every infra change; 0 unmanaged drift by sprint end.
- p95 improved to **≤1.2s** on `/search`, `/docs/:id`, `/ingest` in stage.

---

## 3) Risk Register

| Risk                                | Prob | Impact | Mitigation                                             | Owner    |
| ----------------------------------- | ---: | -----: | ------------------------------------------------------ | -------- |
| Green differs subtly (config drift) |    M |      H | Mirror + shadow tests; config parity checks            | Deploy   |
| WAF rules block legit traffic       |    M |      M | Log-only, then staged enforce; tenant allowlist        | Security |
| Secret rotation outage              |    L |      H | Phased rollout with canary, fallback keys, break-glass | CI/CD    |
| Drift bot noise overload            |    M |      M | Scope filters; label `infra/no-drift` for exceptions   | Platform |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-BG: Blue/Green

- [ ] BG-1701 — Traffic mirror for gateway (10%) + shadow assertions
- [ ] BG-1702 — Blue/Green Helm values & scripts; atomic LB weight cutover
- [ ] BG-1703 — Rollback runbook + timer proof (≤ 2 min)

### EPIC-WAF: Edge Security

- [ ] WAF-1751 — Enable managed rules + custom ruleset; log-only → enforce
- [ ] WAF-1752 — DDoS drill playbook; synthetic surge generator + metrics

### EPIC-SECR: Secrets Lifecycle

- [ ] SECR-1801 — Secrets inventory + rotation order; annotate ownership
- [ ] SECR-1802 — Rotation workflow (KMS/DB/API) + sealed-secret update
- [ ] SECR-1803 — Attestation writer + evidence upload

### EPIC-DRFT: Infra Drift

- [ ] DRFT-1851 — Terraform drift detector + PR comment bot
- [ ] DRFT-1852 — K8s desired-state guard (controller/policy)

### EPIC-PERF: Performance

- [ ] PERF-1901 — Stage profiling + flamegraphs; actions list
- [ ] PERF-1902 — Connection pooling & cache headers tuned
- [ ] PERF-1903 — Pre-warm green instances on deploy

### EPIC-AUD: Audit Evidence

- [ ] AUD-1951 — CI evidence collector; upload to object-lock bucket

---

## 5) Scaffolds & Snippets

### 5.1 Blue/Green Helm Overlay

**Path:** `charts/gateway/values-bluegreen.yaml`

```yaml
routing:
  strategy: bluegreen
  mirror:
    enabled: true
    weight: 10
cutover:
  method: lb-weight
  rollback:
    maxDuration: 120s
```
````

**Cutover script**
**Path:** `tools/cutover.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
SVC=${1:-gateway}
BLUE=${2:-blue}
GREEN=${3:-green}
# mirror traffic to green
kubectl -n prod annotate svc $SVC mirror=green --overwrite
sleep 120
# switch weights
kubectl -n prod annotate svc $SVC weight-blue=0 weight-green=100 --overwrite
```

### 5.2 NGINX/Envoy Traffic Mirror (example)

**Path:** `charts/gateway/templates/mirror.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: gw-mirror }
data:
  envoy.yaml: |
    route_config:
      request_mirror_policies:
        - cluster: green
          runtime_fraction: { default_value: { numerator: 10 } }
```

### 5.3 WAF (Cloud provider or NGINX ModSecurity)

**Path:** `charts/edge/templates/waf-config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: waf-rules }
data:
  modsecurity.conf: |
    SecRuleEngine On
    SecDefaultAction "phase:1,log,pass,tag:'waf'"
    Include /etc/modsecurity/owasp-crs/crs-setup.conf
    Include /etc/modsecurity/owasp-crs/rules/*.conf
```

**Ingress annotations (log-only → enforce)**

```yaml
nginx.ingress.kubernetes.io/enable-modsecurity: 'true'
nginx.ingress.kubernetes.io/modsecurity-snippet: |
  SecRuleEngine DetectionOnly
```

### 5.4 DDoS Drill Generator

**Path:** `tools/ddos-surge.sh`

```bash
#!/usr/bin/env bash
# generate bursty RPS with keep-alive off
URL=${1:-https://api.example.com/}
for i in {1..10}; do (seq 1 2000 | xargs -n1 -P100 curl -s -o /dev/null "$URL" &); done
wait
```

### 5.5 Secrets Rotation Workflow

**Path:** `.github/workflows/secrets-rotation.yml`

```yaml
name: secrets-rotation
on:
  workflow_dispatch:
    inputs:
      scope: { description: 'all|db|api|kms', required: true, default: 'all' }
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate new secrets
        run: ./tools/rotate-secrets.sh ${{ inputs.scope }}
      - name: Seal & commit
        run: |
          ./tools/seal.sh secrets/*.yaml
          git add secrets/*-sealed.yaml && git commit -m "chore(secrets): rotation ${{ inputs.scope }}"
      - name: Open PR
        run: gh pr create -t "chore(secrets): rotation ${{ inputs.scope }}" -b "Automated rotation"
```

**Rotation script (sketch)**
**Path:** `tools/rotate-secrets.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
SCOPE=${1:-all}
# generate new creds/tokens via provider CLIs, write raw YAML into secrets/, never commit raw
```

### 5.6 Attestation Writer (rotation evidence)

**Path:** `services/audit-writer/rotation.ts`

```ts
import { writeAudit } from './main';
export async function attestRotation(subject: string, items: string[]) {
  await writeAudit({
    type: 'secrets-rotation',
    subject,
    items,
    at: new Date().toISOString(),
    actor: process.env.GITHUB_ACTOR,
  });
}
```

### 5.7 Terraform Drift Detector Bot

**Path:** `.github/workflows/tf-drift.yml`

```yaml
name: tf-drift
on:
  schedule: [{ cron: '0 */6 * * *' }]
  workflow_dispatch:
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Terraform plan
        run: |
          terraform -chdir=infra plan -no-color -out=tfplan || true
          terraform -chdir=infra show -no-color tfplan > plan.txt || true
      - name: Comment plan
        run: gh issue comment $(gh issue list -s open -L1 -q '.[0].number') -b "\n### Drift Plan\n\n\n\n\n$(sed 's/`/\`/g' plan.txt)"
```

### 5.8 K8s Desired-State Guard (minimal controller via kubectl)

**Path:** `.github/workflows/k8s-guard.yml`

```yaml
name: k8s-guard
on:
  schedule: [{ cron: '*/30 * * * *' }]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: Ensure replicas/resources/probes
        run: |
          kubectl get deploy -A -o json | jq -r '.items[] | select(.spec.replicas==0 or (.spec.template.spec.containers[]?.readinessProbe|not)) | [.metadata.namespace,.metadata.name] | @tsv' | while read ns name; do
            echo "Non-compliant: $ns/$name";
          done
```

### 5.9 Perf Profiling & Flamegraphs (Node)

**Path:** `services/**/scripts/profile.sh`

```bash
node --cpu-prof --cpu-prof-dir=./profiles server.js
# use clinic/flame for richer profiling
```

### 5.10 CI Evidence Collector

**Path:** `.github/workflows/evidence.yml`

```yaml
name: evidence
on:
  workflow_run:
    workflows: ['deploy', 'supply-chain', 'migration-gate', 'secrets-rotation']
    types: [completed]
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Bundle artifacts
        run: echo "Collect SBOMs, signatures, plans, alerts → tar.gz"
      - name: Upload to audit bucket
        run: echo "s3 cp ... with ObjectLock"
```

---

## 6) Observability & Alerts

- **Dashboards**: Blue/Green cutover panel (requests by color), WAF hits by rule, rotation events, drift counts, p95 trend.
- **Alerts**: Cutover spike >1% errors (page), WAF false-positive spike (warn), secrets rotation failure (page), unmanaged drift appeared (warn).

---

## 7) Promotions & Gates

| Stage | Preconditions                     | Action                                            | Verification                              | Rollback                               |
| ----- | --------------------------------- | ------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| dev   | BG overlays present; WAF log-only | Deploy Green; start mirror 10%                    | Shadow asserts pass; no error budget burn | Stop mirror                            |
| stage | Config parity verified            | Increase mirror 30% → cutover; WAF enforce on 10% | RED stable; 429s only during surge        | Revert weights; disable enforce        |
| prod  | Stage soak 48h; approvals         | Cutover with pre-warm; rotation PRs merged        | p95 ≤ 1.2s; evidence stored               | Flip back to Blue; reissue old secrets |

---

## 8) Acceptance Evidence

- Cutover timestamps & request graphs; rollback drill video or logs.
- WAF drill metrics; deny/allow stats; zero 5xx during surge.
- Rotation attestations in audit store; sealed-secrets diffs.
- Drift bot comments/PRs; final report: 0 unmanaged drift.
- Perf dashboards showing p95 improvement to ≤1.2s.

---

## 9) Calendar & Ownership

- **Week 1**: BG mirror + overlay; WAF log-only; drift bot; profiling; rotation scripts.
- **Week 2**: Stage enforce + cutover; DDoS drill; rotate secrets; perf tuning; release cut.

Release cut: **2025-12-05 (Fri)** with Blue/Green rollback tested.

---

## 10) Issue Seeds

- BG-1701/1702/1703, WAF-1751/1752, SECR-1801/1802/1803, DRFT-1851/1852, PERF-1901/1902/1903, AUD-1951

---

_End of Sprint 28 plan._

```

```
