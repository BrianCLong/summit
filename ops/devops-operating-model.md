# CompanyOS DevOps Operating Model

## High-level objectives

- One-command deploy per environment with repeatable, idempotent provisioning (Terraform) and application delivery (Argo CD/Tekton pipeline).
- Safe change velocity: forward-only, reversible migrations; progressive delivery with feature flags; automated rollbacks.
- Resilience: documented RPO/RTO, regional DR with tested restores and chaos drills.
- Governance: tenant isolation (network, identity, data), least privilege, audited changes, cost guardrails.

## Environments & tenancy

- **Dev**: ephemeral preview environments per PR using short-lived namespaces; shared sandbox data with synthetic datasets only. Deployment via pipeline trigger `just deploy env=dev service=all`.
- **Stage**: long-lived, production-like; mirrors prod topology, uses masked datasets; smoke + performance tests run here. Deploy via release candidate pipeline gate.
- **Prod**: multi-AZ, multi-account; change window controlled by change calendar + approval in pipeline.
- **Tenant separation**:
  - **Control plane** in a shared services account; **data planes** per tenant (or per tier) using separate AWS accounts with AWS Organizations SCPs, dedicated VPCs, KMS keys, and IAM roles.
  - Network isolation: VPC peering/PrivateLink only; no cross-tenant lateral movement; per-tenant security groups and WAF rules.
  - Data isolation: separate DB instances/schemas per tenant tier, row-level security where multi-tenant unavoidable; S3 buckets with per-tenant prefixes + KMS CMKs.

## IaC (Terraform preferred; CDK optional for app stacks)

- **Structure**: root modules per environment (`infra/<env>`), reusable child modules (`modules/vpc`, `modules/eks`, `modules/rds`, `modules/redis`, `modules/queues`, `modules/secrets`, `modules/cdn`, `modules/observability`).
- **State**: remote backend in S3 with DynamoDB table for state locking; workspaces keyed by environment/tenant.
- **Key resources**:
  - Networking: VPC with private subnets, NAT gateways (2 per AZ), VPC endpoints for S3/STS/SSM, AWS WAF + CloudFront (CDN) in front of ALB/ingress.
  - Compute: EKS (managed node groups + Fargate profiles for system workloads) or ECS/Fargate if lighter weight.
  - Data: RDS PostgreSQL (Multi-AZ) with automated backups + read replicas; ElastiCache Redis (cluster mode) for caching; S3 for object storage; OpenSearch for search if needed.
  - Messaging: SQS queues + SNS topics for async workflows and fan-out; EventBridge for bus-style routing; Kinesis/Firehose for analytics pipelines.
  - Secrets: AWS Secrets Manager + SSM Parameter Store; sealed secrets for K8s; KMS CMKs per tenant + rotation.
  - Observability: CloudWatch metrics/alarms, OpenTelemetry collector (daemonset), Loki/Promtail for logs, Tempo/Jaeger for traces, Grafana dashboards; AWS Config + Security Hub for compliance.
- **Policy**: terraform fmt/validate/plan/apply gates; drift detection via `terraform plan -detailed-exitcode` nightly; policy-as-code with Open Policy Agent/Conftest.

## CI/CD pipeline (e.g., GitHub Actions + Tekton/Argo CD)

- **Stages**:
  1. Lint & static analysis: ESLint/Prettier, `cargo fmt/clippy` if Rust, `terraform fmt/validate`, `hadolint` for Dockerfiles, `checkov`/OPA policies.
  2. Tests: unit, integration, contract tests; security scans (SAST/Dependency review); sbom generation.
  3. Build: container images with SBOM labels; push to ECR; sign images (cosign) with keyless if supported.
  4. DB migrations: generated with tooling; run `migrate --plan` preview; apply inside deployment job gated by readiness checks.
  5. Deploy: Argo CD sync (K8s) or blue/green ECS via CodeDeploy; progressive rollout (canary 10% → 50% → 100%) with automated metrics-based rollback.
  6. Post-deploy: smoke tests, synthetic checks, error budget burn alerts; feature flags (LaunchDarkly/Flagsmith) for gradual exposure.
- **Rollback**: pin Argo CD app to previous image tag; database rollback via hot standby promotion or `pg_rewind` plus forward-only migrations guarded by idempotent scripts; feature flags to disable risky code paths instantly.
- **One-command**: `just deploy env=<dev|stage|prod>` triggers pipeline that executes build→test→deploy; infra bootstrap via `just infra env=<env> plan|apply` (wraps Terraform).

## Database migration policy

- **Forward-only, additive-first** migrations; zero-downtime patterns (expand/contract) with background backfills.
- Use transactional migrations where safe; for long-running DDL use `pg_repack`/`CREATE INDEX CONCURRENTLY`.
- Blue/green compatible: schema expanded in **blue**, application deploy reads/writes via compat layer, then contract old columns after validation.
- Migrations run in stage before prod; automatic drift checks; rollforward plan documented for every migration; `migrate --dry-run` required in CI.

## Backups & restore

- RDS: automated snapshots (daily, 35-day retention) + point-in-time recovery; cross-region snapshot copy daily.
- Redis: snapshot every 6 hours; AOF enabled for durability where supported.
- S3: versioning + object lock (compliance mode for regulated tenants); lifecycle to Glacier.
- Restore procedure: quarterly game-day restore to isolated "dr-verify" account; run checksum/data-integrity tests and app smoke tests; document evidence in runbook.
- Targets: **RPO ≤ 5 minutes** (via WAL shipping/streaming replica) for prod; **RTO ≤ 60 minutes** for single-region failure, **≤ 4 hours** for full region failover.

## Disaster recovery plan

- **Regional failure**: active/passive multi-region. Route53 weighted/health-checked records; standby region pre-provisioned with warm RDS replica (cross-region) and EKS cluster; failover via automated runbook (promote replica, update secrets, Argo CD sync in secondary).
- **Chaos & drills**: quarterly region-failover simulation using SSM + controlled Route53 flip; monthly pod/instance termination chaos in primary.
- **Key rotation**: KMS CMKs rotated annually (or 90 days for regulated tenants); secrets rotated automatically via Secrets Manager; deploy pipeline updates mounted secrets with zero-downtime reload.
- **Incident comms checklist**: declare severity, page on-call (PagerDuty), create incident channel/doc, name IC/commander/scribe, hourly updates, customer comms via status page, postmortem within 72 hours.

## Cost controls

- Budgets & alerts per account/tenant with Cost Explorer budgets + anomaly detection; enforce tagging (environment, tenant, owner, cost-center) via SCP/Config rules.
- Autoscaling: HPA on CPU/RAM + custom SLO signals; Karpenter/Cluster Autoscaler for nodes; scale-to-zero for dev previews; queue depth-based scaling for workers.
- Storage & logging: S3 lifecycle (30/90/365 to IA/Glacier); CloudWatch log retention 14-30 days dev/stage, 90 days prod with export to S3+Glacier; cap high-cardinality metrics.
- Optimize edge: CloudFront caching, compress assets, tiered cache; Redis TTLs; DB connection pooling (RDS Proxy); spot capacity for non-critical workloads.

## Acceptance & operational controls

- **Repeatability**: `just infra env=<env> apply` and `just deploy env=<env>` cover infra + app; state locked via Terraform + validated plans.
- **Safe migrations**: mandatory expand/contract, staged rollout, backward-compatible deploys; emergency rollback playbook relies on standby promotion + feature flags.
- **Backup validation**: scheduled restore drills with integrity checks; evidence stored in `ops/backup-verification` with timestamped reports.

## Forward-leaning enhancements

- Adopt **policy-as-code** guardrails (OPA/Gatekeeper) for cluster policies and Terraform (`conftest`) to block misconfigurations pre-merge.
- Introduce **progressive delivery metrics** (Argo Rollouts with Kayenta-style analysis) using live error budgets to automate canary promotion/rollback.
- Implement **FinOps scorecards** in CI that fail builds when unit-cost regressions exceed thresholds (leveraging `ops/cost_guard.py`).
