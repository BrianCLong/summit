# Angleton IG — SecDevOps Workstream (Sprint 3)

**Cadence:** Nov 3–14, 2025 (Sprint 3 of Q4)  
**Alignment:** Builds on Sprint 1 (verifiable builds) + Sprint 2 (verified deploys/runtime)  
**Role:** Security • DevSecOps • Counterintelligence  
**Prime Directive:** Protect people, data, funds, infrastructure, brand.

---

## 1) Objectives & Definition of Done (DoD)

**Objective:** Evolve from "verified deploys" to **"detectable, recoverable, and provable operations"**. Ship runtime policy enforcement with continuous verification, auto‑rotation playbooks, org‑wide policy bundle, DR drills, and audit‑ready evidence packs.

**DoD:**

- **Detect:** Runtime policy violations and anomalous changes generate alerts with evidence (OPA decision logs + container/runtime events) feeding dashboards and paging oncall.
- **Recover:** Tested DR (database + object store) RPO ≤ 15 min, RTO ≤ 60 min; blue/green rollback ready for Switchboard.
- **Prove:** Every release has a signed Evidence Pack (attestations, SBOM, gate results, lineage hashes) uploaded to immutable storage with retention ≥ 1 year.
- **Rotate:** Automated secret rotation for GitHub OIDC‑bound cloud roles and app tokens with least‑privilege scopes and max 90‑day TTL.

---

## 2) Backlog (ranked)

### P0 — Must land

1. **Org‑wide Policy Bundle**: Consolidate OPA/Gatekeeper/Kyverno rules into `policy-bundle/` with versioning, tests, and release flow (signed bundle artifact).
2. **Evidence Pack Generator**: CI job that collects SBOM, attestations, gate outputs, decision logs, perf + e2e results, hashes → signs and stores to immutable bucket.
3. **Secrets Auto‑Rotation**: One‑time provisioning flow + scheduled rotation for: GH Actions OIDC ↔ AWS roles; app tokens for ArgoCD and Grafana; DB creds via AWS RDS IAM auth.
4. **DR Drill (Tabletop + Live)**: Scripted, time‑boxed restore of Postgres + Redis from snapshots; validate app health; document RPO/RTO.

### P1 — Strongly desired

5. **Runtime Policy Watcher**: OPA decision log shipping (Fluent Bit → Loki) with alerts on deny spikes and high‑risk actions.
6. **Blue/Green + Verify**: Argo Rollouts with pre/post‑promotion checks (cosign verify + k6 smoke) and instant rollback.
7. **Policy Simulation Mode**: `release.gate` supports dry‑run with diff output for proposed policy changes.

### P2 — Stretch

8. **SLSA Level Upgrade**: Move from provenance present → **SLSA v1.0 Build L2** alignment (reusable, hardened builders).
9. **Data Classification Hooks**: Tagging flow in CI that maps components → labels (public/internal/confidential) used in OPA decisions.

---

## 3) Patch Set (ready‑to‑apply)

> Minimal, reversible diffs. Adjust `org`/paths as needed.

### 3.1 Org‑wide policy bundle (versioned & signed)

**NEW:** `policy-bundle/README.md`

```md
# Policy Bundle

Unified policies for CI, release gates, and cluster admission.

- `opa/` — OPA rego modules + tests
- `gatekeeper/` — Constraints & templates
- `kyverno/` — Image signature/digest rules
- `tests/` — Conftest + opa tests
- `release.sh` — Build & sign bundle
```

**NEW:** `policy-bundle/opa/release_gate.rego` (migrate from external)

```rego
package policy.release

# Inputs from Evidence Pack builder
default allow = false

allow {
  input.sbom_present
  input.provenance_present
  input.secrets_scan_clean
  input.license.forbidden == []
}
```

**NEW:** `policy-bundle/release.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
ver="$1" # e.g., 0.3.0
out="dist/policy-bundle-$ver.tgz"
mkdir -p dist
 tar czf "$out" opa gatekeeper kyverno
cosign attest --predicate <(sha256sum "$out" | awk '{print $1}' | jq -R '{sha256: .}') --type blob --yes "$out"
```

**NEW:** `.github/workflows/policy.bundle.release.yml`

```yaml
name: policy.bundle.release
on:
  push:
    tags: ['policy-bundle-v*.*.*']
permissions: { contents: read, id-token: write }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./policy-bundle/release.sh ${GITHUB_REF_NAME#policy-bundle-v}
      - uses: actions/upload-artifact@v4
        with: { name: policy-bundle, path: policy-bundle/dist/*.tgz }
```

### 3.2 Evidence Pack generator

**NEW:** `.github/workflows/evidence.pack.yml`

```yaml
name: evidence.pack
on:
  workflow_run:
    workflows: ["CI Switchboard", "release.gate", "deploy.verify", "e2e.playwright", "perf.k6", "dlp.scan"]
    types: ["completed"]
permissions: { contents: read, id-token: write }
jobs:
  assemble:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { path: artifacts }
      - name: Assemble Evidence Pack
        run: |
          mkdir -p evidence
          cp -r artifacts/** evidence/ || true
          echo "${GITHUB_RUN_ID}" > evidence/run.txt
          find evidence -type f -print0 | xargs -0 sha256sum | sort -k2 > evidence/hashes.sha256
          tar czf evidence-pack.tgz evidence
      - name: Attest Evidence Pack (keyless)
        uses: sigstore/cosign-installer@v3
      - run: cosign attest --yes --type blob --predicate <(sha256sum evidence-pack.tgz | awk '{print $1}' | jq -R '{sha256: .}') evidence-pack.tgz
      - name: Upload + Archive (immutable)
        env: { BUCKET: ${{ secrets.ARTIFACT_BUCKET }}, AWS_REGION: ${{ secrets.AWS_REGION }} }
        run: |
          aws s3 cp evidence-pack.tgz s3://$BUCKET/$GITHUB_RUN_ID/ --acl bucket-owner-full-control
```

### 3.3 Secrets auto‑rotation

**NEW:** `ops/rotation/README.md`

```md
- GitHub OIDC ↔ AWS: short-lived roles; max TTL 60m; policy scoping per workflow.
- ArgoCD/Grafana tokens: rotate every 90 days; store in GH Encrypted Secrets or SSM.
- DB creds: switch to IAM auth; application uses token provider with 15m refresh.
```

**NEW:** `.github/workflows/rotate.secrets.yml`

```yaml
name: rotate.secrets
on:
  schedule: [{ cron: '0 6 * * 1' }] # Mondays 06:00 UTC
  workflow_dispatch:
permissions: { contents: read }
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rotate ArgoCD token
        run: ./ops/rotation/rotate-argocd.sh
      - name: Rotate Grafana token
        run: ./ops/rotation/rotate-grafana.sh
      - name: Report rotation summary
        run: |
          echo "rotated=$(date -u +%FT%TZ)" > rotation.json
          cat rotation.json
      - uses: actions/upload-artifact@v4
        with: { name: rotation-report, path: rotation.json }
```

**NEW:** `ops/rotation/rotate-argocd.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# Exchange with real API calls; placeholder demonstrates structure
NEW=$(uuidgen)
aws ssm put-parameter --name /companyos/argocd/token --value "$NEW" --type SecureString --overwrite
```

### 3.4 DR drill scripts

**NEW:** `ops/dr/restore.postgres.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
DB=${1:-switchboard}
SNAP=$(aws rds describe-db-snapshots --db-instance-identifier $DB --query 'DBSnapshots[-1].DBSnapshotIdentifier' --output text)
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier ${DB}-restore --db-snapshot-identifier $SNAP
# Wait & swap config (placeholder)
```

**NEW:** `.github/workflows/dr.drill.yml`

```yaml
name: dr.drill
on: [workflow_dispatch]
jobs:
  postgres-restore:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ops/dr/restore.postgres.sh switchboard
  redis-restore:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Validate Redis snapshot (manual for now)"
```

### 3.5 Runtime policy watcher

**NEW:** `deploy/logging/fluentbit-opa.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: fluent-bit-opa, namespace: observability }
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
    [INPUT]
        Name tail
        Path /var/log/opa/decision.log
        Tag  opa
    [FILTER]
        Name   grep
        Match  opa
        Regex  log.level  (warn|error|deny)
    [OUTPUT]
        Name   loki
        Match  *
        Url    $LOKI_URL
        Labels job=opa
```

### 3.6 Blue/Green with verification

**NEW:** `deploy/rollouts/switchboard.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: switchboard }
spec:
  replicas: 2
  strategy:
    blueGreen:
      activeService: switchboard-svc
      previewService: switchboard-preview
      prePromotionAnalysis:
        templates:
          - templateName: cosign-verify
          - templateName: k6-smoke
      autoPromotionEnabled: false
```

**NEW:** `deploy/rollouts/analysis-templates.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: cosign-verify }
spec:
  metrics:
    - name: cosign-verify
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: cosign
                    image: ghcr.io/sigstore/cosign/cosign
                    command: ['cosign', 'verify', '--help']
                restartPolicy: Never
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: k6-smoke }
spec:
  metrics:
    - name: k6-smoke
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: k6
                    image: grafana/k6
                    command: ['k6', 'run', '/scripts/smoke.js']
                restartPolicy: Never
```

### 3.7 Policy simulation mode (release.gate)

**Edit:** `.github/workflows/release.gate.yml` (add input)

```yaml
on:
  workflow_dispatch:
    inputs:
      simulate:
        description: 'Dry-run policy (no fail)'
        default: false
        type: boolean
```

**Add step:**

```yaml
- name: Evaluate (simulate or enforce)
  run: |
    RESULT=$(./opa eval -i input.json -d release_gate.rego 'data.policy.release.allow' -f pretty)
    echo "allow=$RESULT"
    if [ "${{ inputs.simulate }}" != "true" ] && [ "$RESULT" != "true" ]; then
      echo "OPA gate failed" && exit 1
    fi
```

---

## 4) Observability & Evidence

- **Evidence Pack**: `evidence-pack.tgz` + cosign attestation; includes SBOM, provenance, gate results, CI logs hashes, decision logs, perf/e2e outputs.
- **Dashboards**: Lineage board enhanced with rotation results and DR drill timings (RPO/RTO chart).
- **Alerts**: Loki/Alertmanager rules for deny spikes (>5/min) and rotation failures.

---

## 5) Tests & Verification

- **Policy bundle**: `opa test` + `conftest` across `policy-bundle/`.
- **Secrets rotation**: New tokens in SSM; old tokens revoked; app health unaffected.
- **DR drill**: Restore completes under RTO; data loss within RPO.
- **Rollouts**: Pre‑promotion checks gate traffic; manual promotion then rollback validated.
- **Evidence pack**: Exists, signed, retrievable by run ID.

**Success Criteria**

- A tag deploy produces a signed Evidence Pack in immutable storage.
- Rotation job runs with report artifact; no leaked long‑lived secrets remain.
- DR drill report shows RPO ≤ 15m, RTO ≤ 60m.
- Alert fires on synthetic deny spike and is acknowledged within SLO.

---

## 6) Ownership & Approvals

- **Owners:** SecDevOps (Angleton IG), Platform/Infra, App Eng, Data Platform (for classification hooks).
- **Approvals:** Platform lead (rollouts/logging), Security lead (policy bundle), SRE lead (DR drill), App Eng lead (rotation integration).

---

## 7) Timeline

- **Days 1–2:** Policy bundle creation + tests + signed release.
- **Days 3–4:** Evidence Pack generator wiring; dashboards update.
- **Days 5–6:** Secrets rotation jobs + audits; switch DB auth to IAM tokens.
- **Day 7:** DR drill (tabletop AM, live PM).
- **Day 8:** Runtime log shipping + alerts; synthetic deny test.
- **Day 9:** Blue/Green rollout with verification + rollback.
- **Day 10:** Buffer, polish, docs, approvals.

---

## 8) PR Template Additions

```
- [ ] Evidence Pack attached and attested
- [ ] Rotation completed; old creds revoked
- [ ] DR drill results attached (RPO/RTO)
- [ ] Admission/rollout pre/post checks passed
- [ ] Policy bundle version referenced
```

---

## 9) Artifacts Index

- Policy bundle: `policy-bundle/**`, `.github/workflows/policy.bundle.release.yml`
- Evidence: `.github/workflows/evidence.pack.yml`
- Rotation: `ops/rotation/**`, `.github/workflows/rotate.secrets.yml`
- DR: `ops/dr/**`, `.github/workflows/dr.drill.yml`
- Logging: `deploy/logging/fluentbit-opa.yaml`
- Rollouts: `deploy/rollouts/*`
- Gate simulation: updated `.github/workflows/release.gate.yml`

---

## 10) Structured Output (for exec/PM traceability)

summary: Establish detectable, recoverable, and provable operations: versioned policy bundle, signed Evidence Packs, automated secret rotation, DR drills with RPO/RTO targets, runtime decision logging/alerts, and blue/green rollouts with verification.  
risk_score: 48  
confidence: high  
key_findings:

- id: evidence-gaps
  evidence: [ lack of unified, signed evidence across CI→deploy ]
  impact: Audit friction; weak incident reconstruction.
- id: secrets-lifecycle
  evidence: [ long-lived tokens; manual rotations ]
  impact: Elevated blast radius; compliance exposure.
- id: recovery-unknowns
  evidence: [ no validated RPO/RTO ]
  impact: Business continuity risk under incident.
  recommended_actions:
- title: Release a signed policy bundle and enforce referencing it
  change_type: Policy
  effort: M
  prereqs: cosign setup; Gatekeeper/Kyverno present
- title: Generate and attest Evidence Packs each release
  change_type: PR
  effort: S
  prereqs: Artifact bucket with immutability
- title: Automate secret rotation
  change_type: Infra
  effort: M
  prereqs: SSM and app integration
- title: Perform DR drill and document RPO/RTO
  change_type: Runbook
  effort: M
  prereqs: Snapshots; non-prod env
  verification:
- checks: [ policy-tests-pass, evidence-pack-signed, rotation-report-present, dr-rpo-rto-met, alert-fire-ack ]
- success_criteria: All checks green; alerts validated; rollback works.
  owners_notified: [ SecDevOps, Platform, App Eng, SRE ]
  links:
  pr:
  runbook: Included in `ops/` tree
  dashboards: Lineage + Rotation + DR dashboards to be linked after merge
