# PR Pack 011 — FinOps, GPU/AI Scheduling, Data Tiering, Archival/Retention (Ready‑to‑merge)

Twelve PRs to cut infra cost, make GPU workloads efficient, and implement sustainable data retention/archival. Each PR includes rollback and cutover steps.

---

## PR 119 — Karpenter spot‑friendly autoscaling with interruption handling

**Purpose:** Replace static node groups; prefer spot where safe; drain gracefully on interruption.

**Files**

**`infra/karpenter/values.yaml`** (excerpt)

```yaml
settings:
  aws:
    clusterName: intelgraph
    interruptionQueueName: intelgraph-karpenter
  batchMaxDuration: 30s
  consolidation:
    enabled: true
  drift:
    enabled: true
provisioners:
  - name: general
    requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: [spot, on-demand]
      - key: node.kubernetes.io/instance-type
        operator: In
        values: [m7g.large, m7g.xlarge, c7g.large, c7g.xlarge]
    limits: { resources: { cpu: '200', memory: '800Gi' } }
    ttlSecondsAfterEmpty: 120
    consolidationPolicy: WhenUnderutilized
    labels: { pool: general }
  - name: gpu
    requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: [on-demand, spot]
      - key: node.kubernetes.io/instance-type
        operator: In
        values: [g5.xlarge, g5.2xlarge, l4g.xlarge]
    taints: [{ key: gpu, value: 'true', effect: NoSchedule }]
```

**`k8s/karpenter/interruption-handler.yaml`** (optional sqs‑drainer)

**Rollback:** Disable Karpenter; revert to managed node groups. Set `values.provisioners[*].requirements` to on‑demand only.

---

## PR 120 — Node pools, taints, and PriorityClasses (system/web/batch/gpu)

**Purpose:** Keep critical paths fast; push best‑effort/batch to cheaper nodes.

**Files**

**`k8s/priorityclasses.yaml`**

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: { name: system-high }
value: 100000
preemptionPolicy: PreemptLowerPriority
---
kind: PriorityClass
apiVersion: scheduling.k8s.io/v1
metadata: { name: web-med }
value: 1000
---
kind: PriorityClass
apiVersion: scheduling.k8s.io/v1
metadata: { name: batch-low }
value: 10
```

**`charts/app/values.yaml`** (excerpt)

```yaml
priorityClassName: web-med
nodeSelector: { pool: general }
tolerations: []
```

**Rollback:** Remove PriorityClass references; clear tolerations.

---

## PR 121 — NVIDIA device plugin + time‑slicing/MIG

**Purpose:** Increase GPU utilization; isolate workloads safely.

**Files**

**`k8s/gpu/nvidia-plugin.yaml`** — official DaemonSet install.

**`k8s/gpu/time-slicing-config.yaml`**

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: nvidia-time-slicing, namespace: kube-system }
data:
  time-slicing: |
    version: v1
    flags:
      default: 2  # slices per GPU
```

**`charts/inference/values.yaml`**

```yaml
resources:
  limits: { nvidia.com/gpu: 0.25 }
  requests: { nvidia.com/gpu: 0.25 }
nodeSelector: { pool: gpu }
tolerations: [{ key: gpu, operator: Exists, effect: NoSchedule }]
```

**Rollback:** Set requests/limits to whole GPU; remove time‑slicing config.

---

## PR 122 — Kueue (or Volcano) GPU batch queue + team quotas

**Purpose:** Fair share for GPU training/batch; keep inference responsive.

**Files**

**`k8s/kueue/manager.yaml`** (install)

**`k8s/kueue/cluster-queue.yaml`**

```yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata: { name: gpu-queue }
spec:
  namespaceSelector: {}
  resources:
    - name: 'nvidia.com/gpu'
      flavors:
        - name: g5
          quota:
            guaranteed: 8
            ceiling: 16
```

**Rollback:** Delete Kueue objects; GPU jobs schedule like normal.

---

## PR 123 — VPA + Goldilocks + LimitRanges

**Purpose:** Right‑size pods automatically; prevent over‑requests.

**Files**

**`k8s/vpa/crds.yaml`** — Vertical Pod Autoscaler.

**`k8s/limits/limitrange.yaml`**

```yaml
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: prod }
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: 100m, memory: 256Mi }
      default: { cpu: 500m, memory: 512Mi }
```

**`k8s/goldilocks/values.yaml`** — dashboards & recommendations.

**Rollback:** Remove VPA/LimitRange; keep HPA only.

---

## PR 124 — Preview TTL sweeper & idle resource reaper

**Purpose:** Kill forgotten namespaces/pods to cut costs.

**Files**

**`.github/workflows/preview-gc.yml`**

```yaml
name: preview-gc
on: [schedule]
schedule: [{ cron: '0 7 * * *' }]
jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview namespaces older than 7 days
        env: { KUBECONFIG: ${{ secrets.DEV_KUBECONFIG }} }
        run: |
          kubectl get ns -l app=preview -o json | jq -r '.items[] | select(.metadata.creationTimestamp < (now-7*86400|toiso8601)) | .metadata.name' | xargs -r kubectl delete ns
```

**Rollback:** Disable schedule; run on demand.

---

## PR 125 — Storage tiering & lifecycle (S3/Logs/Backups/Thanos)

**Purpose:** Move cold data to Glacier; downsample metrics; trim retention.

**Files**

**`infra/storage/s3-logs-lifecycle.tf`**

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "logs-tiering"
    status = "Enabled"
    transition { days = 30, storage_class = "STANDARD_IA" }
    transition { days = 90, storage_class = "GLACIER" }
    expiration { days = 365 }
  }
}
```

**`observability/thanos/values.yaml`** (downsampling & retention windows)

**Rollback:** Increase retention windows; remove lifecycle policy.

---

## PR 126 — Postgres partitioning + automatic retention (pg_partman)

**Purpose:** Fast deletes & scans; keep only hot data online.

**Files**

**`db/migrations/2025090707_partman.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;
SELECT partman.create_parent('public.event_logs','created_at','partman','native','daily');
-- retention: keep 90 days
SELECT partman.set_config_option('public.event_logs','retention','90 days');
```

**`k8s/cron/partman-maint.yaml`** — nightly `run_maintenance()` job.

**Rollback:** Stop maintenance; partitions remain readable.

---

## PR 127 — Archive pipeline → Parquet/Iceberg (Athena/Trino)

**Purpose:** Keep historical analytics cheap; free OLTP storage.

**Files**

**`workers/archive/export_events.ts`**

```ts
// Incrementally export old partitions to Parquet in S3: s3://intelgraph-archive/events/dt=YYYY-MM-DD
```

**`infra/glue/catalog.tf`** — create Glue/Athena table; or Trino catalog config.

**Rollback:** Pause exporter; keep data in OLTP longer.

---

## PR 128 — Cost anomaly detection + budgets + Kubecost guardrails

**Purpose:** Catch spend spikes; fail PRs that exceed budget deltas.

**Files**

**`.github/workflows/cost-anomaly.yml`**

```yaml
name: cost-anomaly
on:
  schedule: [{ cron: '0 */6 * * *' }]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Query Kubecost anomalies
        run: curl -fsSL "$KUBECOST_URL/model/anomalies?window=6d"
      - name: Enforce budget delta
        run: node scripts/infracost_enforce.js
        env: { INFRACOST_LIMIT: '100' }
```

**`infra/budgets.tf`** — cloud budgets with email/webhook notifications.

**Rollback:** Alert‑only mode (no PR enforcement).

---

## PR 129 — Ephemeral GitHub runners (autoscaling, spot)

**Purpose:** Cut CI cost/queue; isolate builds.

**Files**

**`ci/runners/scale-set.yaml`** — GHA runner scale sets (spot preferred) with `actions-runner-controller`.

**`ci/runners/policy.yaml`** — restrict repo/labels; job TTL.

**Rollback:** Switch back to GitHub‑hosted runners.

---

## PR 130 — WORM audit logs (S3 Object Lock) + legal hold + purge attestations

**Purpose:** Immutable audit retention; provable deletions.

**Files**

**`infra/storage/object-lock.tf`**

```hcl
resource "aws_s3_bucket" "audit" { bucket = "intelgraph-audit" object_lock_enabled = true }
resource "aws_s3_bucket_object_lock_configuration" "audit" {
  bucket = aws_s3_bucket.audit.id
  rule { default_retention { mode = "COMPLIANCE" days = 365 } }
}
```

**`scripts/purge_attest.ts`**

```ts
// Emits signed attestations (cosign) for data purges; stores in audit bucket
```

**Rollback:** Retention can be increased but not reduced for existing locked objects (COMPLIANCE mode). For future objects, change default retention.

---

## PR 131 — Rightsizing dashboard & weekly FinOps review issue

**Purpose:** Make savings opportunities visible and track follow‑ups.

**Files**

**`observability/grafana/dashboards/finops.json`** — idle nodes, underutilized pods, top spenders.

**`.github/workflows/finops-review.yml`**

```yaml
name: finops-review
on: { schedule: [{ cron: '0 13 * * 1' }] }
jobs:
  open:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Weekly FinOps Review'
          content-file: reports/finops.md
          labels: [finops]
```

**Rollback:** Manual review cadence.

---

# Cutover (half day)

1. Install **Karpenter** with conservative settings; validate interruption handling.
2. Apply **PriorityClasses**, **taints**, and **GPU device plugin**; migrate inference first, then batch to **Kueue**.
3. Enable **VPA/LimitRanges** and deploy **Goldilocks**; apply recommendations to top 5 services.
4. Turn on **preview GC**; set 7‑day TTL.
5. Apply **S3/Thanos lifecycle**; confirm retrieval for Glacier; tighten Prom retention.
6. Partition **event_logs** with **pg_partman**; schedule maintenance; verify queries.
7. Start **archive exporter** on oldest partitions; validate Athena/Trino reads.
8. Enable **cost anomaly** checks and **budgets**; set initial thresholds.
9. Roll out **ephemeral runners** for heavy jobs; monitor queue times + cost.
10. Enable **WORM audit** bucket for new objects; integrate **purge attestation**.
11. Publish **FinOps dashboard**; create first weekly review issue.

# Rollback

- Set Karpenter to on‑demand only or disable.
- Remove taints/priority if preemption is too aggressive.
- Pause VPA and revert resource changes using last good values.
- Disable GC and lifecycle schedules.
- Stop archive exporter; keep OLTP partitions longer.
- Switch CI back to hosted runners.

# Ownership

- **Platform/Infra:** PR 119–121, 123–125, 129–131
- **Data:** PR 126–127, 130
- **FinOps:** PR 128, 131
- **ML/Platform:** PR 122
