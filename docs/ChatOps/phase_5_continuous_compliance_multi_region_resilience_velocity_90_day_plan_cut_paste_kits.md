# Phase 5 — Continuous Compliance, Multi‑Region Resilience & Velocity

**Chair:** Markus Wolf · **Window:** 90 days · **Objective:** Convert today’s disciplined CI/CD into **auditable, cert‑ready, multi‑region** operations while **increasing velocity**.

> Mandate: _Deny by default, prove by artifact, survive region failure, and go faster._

---

## I. North‑Star Outcomes (by Day 90)

1. **Cert‑Ready Evidence** — Each release emits a signed **Control Attestation** mapped to SOC 2/ISO control IDs, assembled from Evidence Packs.
2. **SLSA‑3 Track** — Hermetic builds with pinned toolchains, isolated builders, and reproducible Docker images (document reproducibility ratio).
3. **Multi‑Region** — Active‑passive for writes, active‑active for reads; monthly region failover proving RPO ≤ 15m, RTO ≤ 60m.
4. **Runtime Security Baseline** — Admission + eBPF/Falco policies, approved base‑image allowlist, drift detection.
5. **Data Governance** — DLP rules in CI (exports/backfills), lineage tags in provenance, redact PII in traces/logs.
6. **Velocity & Cost** — DORA dashboards green, perf budgets enforced, autoscale policies versioned, per‑service cost budgets enforced.
7. **Adoption** — ≥ 90% services on golden path; legacy bootstrap retired.

---

## II. Workstreams & 30/60/90 Day Milestones

### A) Continuous Compliance & Control Attestations

- **D30:** Control Catalog YAML authored; Evidence→Control mapping defined.
- **D60:** GitHub Action renders **Control Attestation PDF** per tag (signed), attached to release.
- **D90:** Quarterly **Evidence Audit** job validates a random 10% of releases; results posted.

### B) SLSA‑3 & Hermetic Builds

- **D30:** Toolchain pinning; `--network=none` steps for compile/package; base images SBOM‑signed.
- **D60:** Isolated builders (ephemeral runners); cache attestations; reproducibility target ≥ 80%.
- **D90:** Reproducible build report included in Evidence Pack; variance documented and triaged.

### C) Multi‑Region Resilience

- **D30:** Runbook + traffic manager design; read replicas available in failover region.
- **D60:** ApplicationSets deploy both regions; data replication health SLOs; scripted DNS switch.
- **D90:** Monthly game‑day pass (region evacuation < 60m); lag & durability charts in dashboards.

### D) Runtime Security & Image Hygiene

- **D30:** Allowlist of approved base images; policy denies others.
- **D60:** eBPF/Falco detections for exec‑into‑container, crypto‑miner signals; alerts wired.
- **D90:** Runtime exceptions require time‑boxed waivers; drift report added to Evidence Pack.

### E) Data Governance & Privacy

- **D30:** DLP patterns + export backfill hooks added to CI; PII redaction spec for logs/traces.
- **D60:** Provenance includes data lineage tags (source, transform, policy version).
- **D90:** Quarterly DLP audit; redaction coverage ≥ 95% of critical paths.

### F) Velocity, Cost & Adoption

- **D30:** Perf budgets (k6) block PRs on regression; autoscale policies codified per service.
- **D60:** DORA weekly digest to leadership; cost budget gates tuned; at least 1 right‑size per week.
- **D90:** Golden‑path adoption ≥ 90%; mean CI wall‑clock ↓ 20%; flake rate ↓ 50%.

---

## III. Cut‑Paste Kits (drop‑in snippets)

### 1) Control Catalog (map evidence → controls)

Create `compliance/control_catalog.yaml`:

```yaml
schema: 1
controls:
  - id: SC-01
    name: Supply Chain — SBOM & Scans
    evidence:
      - path: sbom/sbom-*.json
      - path: scans/trivy.sarif
    assert:
      - type: sarif_no_levels
        levels: [CRITICAL, HIGH]
  - id: SC-02
    name: Signing & Provenance
    evidence:
      - path: provenance/*.json
    assert:
      - type: cosign_verify_attestation
  - id: PL-01
    name: Policy Pack (Warrant/License/Citations)
    evidence: [policies/conftest-results.json]
  - id: REL-01
    name: Canary & SLO Burn
    evidence: [rollout/canary-metrics.json, rollout/slo-burn.json]
  - id: DB-01
    name: Schema Lints & Shadow Reads
    evidence: [schema/migrate-lint.txt, schema/shadow-read.txt]
  - id: FIN-01
    name: Cost Guard
    evidence: [finops/cost-diff.json]
  - id: DR-01
    name: Chaos/DR Drills
    evidence: [chaos-dr/run-*.json]
```

### 2) Control Attestation Renderer

Add `scripts/render_control_attestation.py`:

```python
#!/usr/bin/env python3
import json, os, sys, glob, subprocess
from datetime import datetime
import yaml
CAT = yaml.safe_load(open('compliance/control_catalog.yaml'))
EP = sys.argv[1] if len(sys.argv)>1 else 'evidence-pack/release-latest'
report = { 'created_utc': datetime.utcnow().isoformat()+'Z', 'controls': [] }

# Simple checks; extend as needed
sarif_levels = { 'CRITICAL', 'HIGH' }

def sarif_clean(f):
  try:
    d=json.load(open(f))
    for r in d.get('runs',[]):
      for res in r.get('results',[]):
        lvl = res.get('level','').upper()
        if lvl in sarif_levels: return False
    return True
  except: return False

for c in CAT['controls']:
  ok=True; details=[]
  for e in c.get('evidence',[]):
    matches = glob.glob(os.path.join(EP, e['path'])) if isinstance(e, dict) else glob.glob(os.path.join(EP, e))
    if not matches: ok=False; details.append({'missing': e}); continue
    for m in matches:
      if c['id']=='SC-01' and m.endswith('trivy.sarif'):
        ok = ok and sarif_clean(m)
  report['controls'].append({'id': c['id'], 'name': c['name'], 'pass': ok, 'details': details})

overall = all(x['pass'] for x in report['controls'])
report['overall']=overall
print(json.dumps(report, indent=2))
```

Add `Makefile` targets:

```make
control-attestation:
	@python3 scripts/render_control_attestation.py $(OUT_DIR) > $(OUT_DIR)/controls/attestation.json
	@jq -e '.overall==true' $(OUT_DIR)/controls/attestation.json >/dev/null
```

Modify your Evidence Pack builder to `mkdir -p $(OUT_DIR)/controls` then call `make control-attestation`.

### 3) Hermetic Build Guard (Docker)

In CI before `docker build`:

```bash
docker build --network=none --pull=false \
  --label io.intelgraph.sbom=present \
  -t $IMAGE:$TAG .
```

For Bazel/Nix, enforce offline fetch during compile/package phases and pin toolchains.

### 4) Approved Base‑Image Allowlist (Kyverno)

`platform/policy/kyverno/base-image-allowlist.yaml`:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: base-image-allowlist }
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-approved-base
      match:
        resources: { kinds: [Pod, Deployment, StatefulSet, Job, Rollout] }
      validate:
        message: "Image base not approved"
        pattern:
          spec:
            containers:
              - image: "ghcr.io/intelgraph/*|public.ecr.aws/intelgraph/*"
```

### 5) eBPF/Falco Runtime Signals (minimal)

Falco rule example `runtime/falco/rules.yaml`:

```yaml
- rule: Suspicious Shell In Container
  desc: A shell was spawned in a container
  condition: container and proc.name in (bash, sh, zsh)
  output: "Shell in container (user=%user.name container=%container.id proc=%proc.name)"
  priority: WARNING
```

Wire alerts to your incident channel.

### 6) Multi‑Region AppSets (Argo CD) — skeleton

`platform/gitops/argo/apps/multiregion-core.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata: { name: core-multiregion }
spec:
  generators:
    - list:
        elements:
          - name: core-us-east
            region: us-east-1
            values: environments/prod/us-east.yaml
          - name: core-us-west
            region: us-west-2
            values: environments/prod/us-west.yaml
  template:
    metadata: { name: "{{name}}" }
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/your-repo
        targetRevision: HEAD
        path: charts/core
        helm:
          valueFiles: ["{{values}}"]
      destination:
        server: https://kubernetes.default.svc
        namespace: core
      syncPolicy:
        automated: { prune: true, selfHeal: true }
```

### 7) Data Lineage in Provenance (build script patch)

Append to `generate_provenance.sh`:

```bash
jq '. + { data_lineage: { source: env(DATA_SOURCE), transform: env(DATA_PIPELINE), policy_version: env(DLP_POLICY_VERSION) } }' \
  dist/provenance.json > dist/provenance.tmp && mv dist/provenance.tmp dist/provenance.json
```

### 8) Perf Budget Gate (k6)

CI step to fail on regression > threshold:

```bash
THRESH_P95=${THRESH_P95:-"+10%"}
# Compare current run vs baseline.json (store from nightly)
node scripts/compare_k6.js --baseline artifacts/k6/baseline.json --current artifacts/k6/current.json --p95 $THRESH_P95
```

---

## IV. ORR 2.0 — Go/No‑Go (additions)

- **SLSA‑3 checks**: hermetic build log present; base image from allowlist; cache attestations recorded.
- **Multi‑Region**: replication lag < target; failover drill passed in last 30 days.
- **Runtime**: Falco/eBPF alerts quiet for last 24h; no drift from approved base images.
- **Compliance**: Control Attestation attached to release and signed.

---

## V. Metrics & OKRs

- **O1:** Golden‑path adoption ≥ 90% (KR: +10 services onboarded).
- **O2:** Multi‑region drill monthly (KR: 3 passes, MTTR ≤ 30m by quarter end).
- **O3:** SLSA‑3 track milestones hit (KR: hermetic builds ≥ 80% reproducible).
- **O4:** Cost/request ↓ 10% while keeping SLOs green (KR: 4 right‑sizes merged/month).
- **O5:** Compliance automation (KR: 100% releases have signed Control Attestation).

---

## VI. Deployment Order (safe roll‑out)

1. Land Control Catalog + renderer; attach attestation to next tag.
2. Enforce hermetic builds + base‑image allowlist in **stage**, then **prod**.
3. Deploy multi‑region AppSets to **stage**; cut traffic tests; then expand to **prod**.
4. Enable Falco/eBPF alerts → tune → enforce.
5. Turn on DLP gates (warn→fail) and provenance lineage tags.
6. Flip perf budget gates to blocking once baselines are stable.
