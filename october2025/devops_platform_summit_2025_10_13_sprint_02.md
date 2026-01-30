# Ops & Delivery Orchestrator — Workstream Plan (Sprint 02)

**Slug:** `devops-platform-summit-2025-10-13-sprint-02`  
**Dates:** 2025‑10‑13 → 2025‑10‑24 (2 weeks)  
**Role:** DevOps / CI‑CD / Deployment / Repo Arborist / Merge & Release Captain  
**Environments:** dev → stage → prod (+ ephemeral previews per PR)  
**Mission:** Harden reliability, disaster recovery, governance, and cost posture on top of the golden delivery path shipped in Sprint 01.

---

## 0) Context Snapshot (post Sprint 01)

- Golden path CI/CD live: build→scan→SBOM/attest→preview→canary w/ SLO gates, gated Terraform plan→apply, sealed‑secrets baseline, SLO rules for `gateway`, OTEL baseline.
- Stage canary proven for `gateway`; rollback runbook validated.
- Remaining follow‑ons from Sprint 01: DR drill, cost guardrails, data retention & dual‑control deletes, WAF/CDN.

---

## 1) Sprint Goal

> **Prove we can lose a region and keep service.** Establish cross‑region replicas, automated backups & restores, failover DNS, and cost/guardrail visibility — all governed by policy‑as‑code and exercised via chaos drills.

**Definition of Success:**

- Stage environment can fail over (DB + app + ingress) within RTO ≤ 15 minutes, RPO ≤ 5 minutes, verified via runbook and evidence.
- Kubecost dashboards show per‑namespace spend; budget alerts wired.
- WAF rules & CDN caching in front of `gateway` production ingress.
- Retention & dual‑control delete flows implemented and audited.

---

## 2) Scope (In/Out)

**In**

- Cross‑region data layer: Postgres (PITR + replica), Neo4j causal cluster (or read replica), S3 multi‑region replication.
- DNS failover (Route53) + health checks; ingress readiness scripts.
- Backups: Velero for K8s objects + CSI snapshots; restore runbook.
- Chaos/DR drills on stage + synthetic load during canary & failover.
- FinOps: Kubecost, autoscaling profiles (Karpenter/Cluster‑Autoscaler), right‑sizing guardrails.
- Governance: dual‑control delete, data retention schedules, immutable audit log shipping.
- Security edge: WAF ruleset + rate limiting + basic bot mitigation.

**Out (this sprint)**

- Active‑active global traffic management (we’ll deliver active‑passive → evaluate A/A next sprint).
- Full DLP/classification; advanced bot management.

---

## 3) Deliverables (Merge‑ready Artifacts)

### 3.1 Terraform — Cross‑Region + DNS Failover

```hcl
// infra/aws/dr/main.tf
module "db_postgres" {
  source = "terraform-aws-modules/rds/aws"
  engine = "postgres"
  multi_az = true
  backup_retention_period = 14
  iam_database_authentication_enabled = true
  copy_tags_to_snapshot = true
  deletion_protection = true
  # PITR window
  backup_window = "03:00-04:00"
  maintenance_window = "Sun:04:00-Sun:05:00"
}

module "rds_cross_region_read_replica" {
  source = "github.com/cloudposse/terraform-aws-rds-cross-region-replica"
  providers = { aws = aws.dr }
  # inputs referencing module.db_postgres
}

resource "aws_s3_bucket" "backups" { bucket = "summit-backups-${var.env}" }
resource "aws_s3_bucket_versioning" "v" { bucket = aws_s3_bucket.backups.id versioning_configuration { status = "Enabled" } }
resource "aws_s3_bucket_replication_configuration" "rep" {
  role = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.backups.id
  rule { id = "cross-region" status = "Enabled" destination { bucket = aws_s3_bucket.backups_dr.arn storage_class = "STANDARD_IA" } }
}

# Route53 Health Check + Failover records
resource "aws_route53_health_check" "gw" {
  type = "HTTPS"
  fqdn = "gateway.${var.domain}"
  resource_path = "/healthz"
  failure_threshold = 3
  request_interval = 30
}
resource "aws_route53_record" "gw_primary" {
  zone_id = var.zone_id
  name    = "gateway.${var.domain}"
  type    = "A"
  set_identifier = "primary"
  failover_routing_policy { type = "PRIMARY" }
  alias { name = aws_lb.primary.dns_name zone_id = aws_lb.primary.zone_id evaluate_target_health = true }
  health_check_id = aws_route53_health_check.gw.id
}
resource "aws_route53_record" "gw_secondary" {
  zone_id = var.zone_id
  name    = "gateway.${var.domain}"
  type    = "A"
  set_identifier = "secondary"
  failover_routing_policy { type = "SECONDARY" }
  alias { name = aws_lb.secondary.dns_name zone_id = aws_lb.secondary.zone_id evaluate_target_health = true }
}
```

### 3.2 Velero — Cluster Backups + CSI Snapshots

```yaml
# infra/helm/velero/values.yaml
credentials:
  useSecret: true
configuration:
  provider: aws
  backupStorageLocation:
    name: default
    bucket: summit-backups-stage
    config:
      region: us-east-1
      s3ForcePathStyle: true
      s3Url: https://s3.amazonaws.com
  volumeSnapshotLocation:
    name: default
    config: { region: us-east-1 }
schedules:
  nightly:
    schedule: '0 3 * * *'
    template:
      ttl: 720h
      includedNamespaces:
        - gateway
        - intelgraph
        - postgres
```

### 3.3 Neo4j — Causal Cluster Helm Overlay (Stage)

```yaml
# infra/helm/neo4j/values-dr.yaml
core:
  numberOfServers: 3
  persistentVolume:
    size: 200Gi
readReplica:
  numberOfServers: 2
  persistentVolume:
    size: 200Gi
config:
  dbms.mode: CORE
  dbms.active_database: neo4j
  dbms.cluster.raft.advertised_address: ${POD_IP}:7000
```

### 3.4 CI — Chaos/DR Drill & Evidence

```yaml
# .github/workflows/dr-drill.yml
name: DR Drill (stage)
on: { workflow_dispatch: {} }
permissions: { contents: read, id-token: write }
jobs:
  inject_faults:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Stage OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_ROLE_STAGE }}, aws-region: ${{ secrets.AWS_REGION }} }
      - name: Start load (k6)
        run: BASE=https://stage.example.com k6 run ci/k6/canary.js & echo $! > k6.pid
      - name: Simulate primary outage
        run: ./ci/dr/fail_primary.sh
      - name: Wait for DNS failover
        run: ./ci/dr/wait_for_failover.sh --timeout 900
      - name: Verify RTO/RPO
        run: ./ci/dr/verify_rto_rpo.sh --rto 900 --rpo 300
      - name: Collect evidence
        run: ./ci/dr/collect_evidence.sh
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with: { name: dr-evidence, path: out/evidence/** }
```

### 3.5 WAF + CDN — Ingress

```hcl
# infra/aws/waf.tf
resource "aws_wafv2_web_acl" "gateway" {
  name  = "gw-acl"
  scope = "CLOUDFRONT"
  default_action { allow {} }
  rule { name = "common-bad-bots" priority = 1 statement { managed_rule_group_statement { name = "AWSManagedRulesBotControlRuleSet" vendor_name = "AWS" } } visibility_config { cloudwatch_metrics_enabled = true metric_name = "waf-gw" sampled_requests_enabled = true } }
  rule { name = "rate-limit" priority = 2 statement { rate_based_statement { limit = 2000 aggregate_key_type = "IP" } } visibility_config { cloudwatch_metrics_enabled = true metric_name = "waf-rate" sampled_requests_enabled = true } }
  visibility_config { cloudwatch_metrics_enabled = true metric_name = "waf" sampled_requests_enabled = true }
}
```

### 3.6 FinOps — Kubecost + Autoscaling Profiles

```yaml
# infra/helm/kubecost/values.yaml
kubecostToken: ${KUBECOST_TOKEN}
prometheus:
  kubeStateMetricsEnabled: true
ingress:
  enabled: true
  hosts: ['kubecost.stage.example.com']
```

```yaml
# infra/k8s/autoscaling/karpenter-provisioner.yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata: { name: general }
spec:
  template:
    requirements:
      - key: 'kubernetes.io/arch'
        operator: In
        values: [amd64, arm64]
    taints: []
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
```

### 3.7 Governance — Dual‑Control Delete & Retention

```yaml
# policy/opa/retention.rego
package retention

default allow = false
allow {
input.resource.kind == "DeleteRequest"
input.resource.dataset == "user_content"
input.resource.requested_by != input.resource.approved_by
time.now_ns() - time.parse_rfc3339_ns(input.resource.created_at) > 24*60*60*1e9
}
```

```md
# RUNBOOK: Dual‑Control Delete

- Requester opens DeleteRequest with justification.
- Second approver (different identity) approves in Admin Console.
- CI emits immutable audit (Sigstore signed) and executes retention‑aware purge job.
- Evidence: request ID, approvals, signed attestation, purge logs.
```

### 3.8 Migration Gate — Postgres

```yaml
# .github/workflows/db-migration.yml
name: DB Migration Gate
on:
  pull_request:
    paths: ['db/migrations/**']
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate plan (sqitch dry‑run)
        run: ./db/tools/plan.sh
      - name: Safety checks
        run: ./db/tools/safety_gate.sh # no table drops without flag; online index builds
      - name: Approval
        uses: trstringer/manual-approval@v1
        with: { reviewers: team:database }
```

---

## 4) Sprint Backlog

### Epic F — DR/BCP

- **F1**: Provision cross‑region replicas (Postgres PITR + read replica).
- **F2**: Neo4j cluster w/ read replicas; snapshot strategy documented.
- **F3**: Velero backups + nightly schedule + restore test.
- **F4**: Route53 failover and health checks.
- **F5**: DR drill workflow + evidence pipeline.

**Acceptance:** RTO ≤ 15m, RPO ≤ 5m on stage; evidence artifacts stored.

### Epic G — Edge & Ingress

- **G1**: WAF ruleset via Terraform; attach to CDN/ALB/CloudFront.
- **G2**: Rate limiting and basic bot mitigation enabled.

**Acceptance:** WAF metrics and blocked requests visible; synthetic tests pass.

### Epic H — FinOps & Autoscaling

- **H1**: Deploy Kubecost; expose per‑namespace/project costs.
- **H2**: Configure Karpenter/Autoscaler profiles; consolidation enabled.
- **H3**: Budget alerts (Slack) for stage/prod.

**Acceptance:** Cost dashboard live; alert fires in test; >15% idle reclaimed.

### Epic I — Governance & Data Lifecycle

- **I1**: Dual‑control delete flow with immutable audits.
- **I2**: Retention policies encoded in OPA + scheduled purge job.
- **I3**: Migration gate for Postgres with safety checks.

**Acceptance:** Successful purge with approvals; migration PR blocked until gate passes.

### Epic J — Observability Hardening

- **J1**: Add SLOs for `intelgraph` & `web` services (p95/err/saturation).
- **J2**: Alert routing by severity; on‑call runbooks.

**Acceptance:** Dashboards updated; synthetic breach triggers alerts.

---

## 5) Day‑by‑Day Cadence

- **D1‑D2**: Terraform DR foundations, S3 replication, Route53 health checks.
- **D3**: Velero install + first backup, restore rehearsal in an empty ns.
- **D4**: Neo4j cluster overlay, Postgres replica hookup, verify replication lag.
- **D5**: DR drill workflow; k6 load; evidence harness.
- **D6**: WAF rules + rate limiting; smoke tests.
- **D7**: Kubecost + autoscaling profiles; rightsizing pass.
- **D8**: Governance (dual‑control delete + retention OPA); audit wiring.
- **D9**: SLOs for remaining services; alert routes; runbooks.
- **D10**: Soak, fix, and capture acceptance evidence; ship.

---

## 6) Acceptance Evidence to Capture

- Terraform plans/applies, Route53 health check status, Velero backup/restore logs, replication lag graphs, DR drill timings, WAF metrics, Kubecost screenshots, autoscaler events, OPA decision logs, audit attestations, alert screenshots.

---

## 7) Risks & Mitigations

- **Cross‑region costs** → use lower storage class, snapshot pruning, right‑size replicas.
- **False positives in WAF** → start in count mode → switch to block after review.
- **Backup bloat** → enforce retention and verify restore before turning on broader scopes.
- **Replica lag** → cap write throughput in drill, tune wal
  autovacuum settings.

---

## 8) Alignment with Other Sprints

- _UNIFIED DATA FOUNDATION_: relies on durable storage + migrations → Migration Gate (Epic I) provides safety.
- _TRIAD MERGE_: cross‑region availability ensures merge rollouts are safe → DR (Epic F) de-risks.
- _MAESTRO COMPOSER_: predictable costs → Kubecost (Epic H) and autoscaling feed planning.

---

## 9) Runbooks (new/updated)

```md
# RUNBOOK: Stage DR Failover

1. Trigger `DR Drill (stage)` workflow with reason.
2. Observe k6 load active.
3. Simulate primary failure via script; confirm health checks flip.
4. Validate RTO by timestamped first 2xx on secondary.
5. Validate RPO by checking latest tx id vs. replica.
6. Roll back to primary, re‑sync, close incident, attach evidence.
```

```md
# RUNBOOK: Velero Restore

- Identify backup: `velero backup get` → name.
- Restore: `velero restore create --from-backup <name>`.
- Verify pods ready; run smoke.
- Attach logs in evidence bundle.
```

---

## 10) Quick‑Start Commands

```bash
# Force Route53 failover test
./ci/dr/force_health_fail.sh --service gateway --env stage

# Measure replica lag (Postgres)
psql -c 'select now() - pg_last_xact_replay_timestamp();'

# Velero backup list
velero backup get

# Kubecost port-forward
kubectl -n kubecost port-forward svc/kubecost-cost-analyzer 9090:9090
```

---

## 11) Follow‑on Seeds (Sprint 03)

- Active‑active traffic steering (Geo/Latency) with per‑region write fencing.
- Data tier benchmarking + tuned p95 targets by domain.
- Advanced bot mitigation and fraud signals.
- Cost policies (OPA) that block out‑of‑budget preview spins.
