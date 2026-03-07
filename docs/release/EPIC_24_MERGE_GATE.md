# Epic 24 Merge Gate Checklist

**Role:** Release Captain
**Epic:** Advanced Multi-Region Deployment & DR

This checklist defines the **mandatory** conditions for merging Epic 24 artifacts into the `main` branch. All items must be checked **YES** or explicitly Waived with a rationale.

## 1. Infrastructure (Terraform)

- [ ] **Syntactically Valid:** `terraform validate` passes for `terraform/multi-region-dr/`.
- [ ] **No Hardcoded Secrets:** DB passwords use `data.aws_secretsmanager_secret_version`.
- [ ] **Encryption Enabled:** `storage_encrypted=true` (RDS), `at_rest_encryption_enabled=true` (Redis).
- [ ] **Modules Complete:** `terraform/modules/vpc` contains `main.tf`, `variables.tf`, `outputs.tf`.
- [ ] **IAM Least Privilege:** EKS roles defined (basic roles accepted for MVP).

## 2. Data Consistency (Code)

- [ ] **CRDT Implementation:** `conflict-resolver.ts` implements `GCounter`, `PNCounter`, `LWWRegister`, `ORSet` with `toJSON`/`fromJSON`.
- [ ] **Sync Service:** `CrossRegionSyncService` uses the `MessageBroker` interface.
- [ ] **Transport Layer:** `SnsMessageBroker` is implemented using `aws-sdk` (v3).
- [ ] **Unit Tests:** `cross-region-sync.test.ts` passes (mocked broker).

## 3. Disaster Recovery (Automation)

- [ ] **Drill Script:** `scripts/dr/dr_drill.ts` exists and runs successfully in CI.
- [ ] **Simulation Logic:** `simulate_failover.ts` verifies state convergence after simulated outage.
- [ ] **CI Workflow:** `.github/workflows/dr-drill.yml` is configured to run on schedule (Weekly).

## 4. Documentation (Hardening)

- [ ] **Reality Check:** `docs/architecture/EPIC_24_INFRA_REALITY_CHECK.md` exists and accurately flags EKS/Neo4j risks.
- [ ] **Limitations:** `docs/runbooks/DR_DRILL_LIMITATIONS.md` clearly states what is NOT proved by CI.
- [ ] **Sync Contract:** `docs/architecture/CROSS_REGION_SYNC_CONTRACT.md` defines ordering/failure guarantees.
- [ ] **Neo4j Analysis:** `docs/architecture/NEO4J_MULTI_REGION_ANALYSIS.md` explicitly downgrades the "Global Cluster" claim.

## 5. Deployment Readiness

- [ ] **Runbooks:** `docs/runbooks/DR_RUNBOOK.md` provides manual steps for Database Failover (which is not fully automated in Terraform).
- [ ] **Monitoring:** Grafana dashboard JSON provided in `observability/grafana/dashboards/`.

---

**Release Captain Sign-off:**
_Verify all checks above before merging._
