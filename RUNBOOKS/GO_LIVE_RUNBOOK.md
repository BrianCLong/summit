# Summit Platform: Go-Live Runbook

**Version:** 1.0
**Owner:** [Release Captain Name]
**Go-Live Date:** [YYYY-MM-DD]
**Incident Commander:** [Incident Commander Name]

This runbook provides a step-by-step checklist for the production launch of the Summit platform. It is tailored to the specific services and architecture of this repository.

---

## 0. Decision & Scope Lock

- [ ] **Go-Live Window Defined:**
  - **Start:** [YYYY-MM-DD HH:mm UTC]
  - **End:** [YYYY-MM-DD HH:mm UTC]
- [ ] **Release Candidate Branch Frozen:**
  - **Branch Name:** `release/vX.Y.Z`
  - **Action:** No new features or non-critical fixes are to be merged into this branch. Only P0 stability, security, or data-integrity fixes are permitted, and they must be approved by the Incident Commander.

---

## 1. Production Readiness (Platform & Infra)

- [ ] **Infrastructure Stand-up Complete:**
  - All production environments (clusters, namespaces) are provisioned and documented.
- [ ] **Data Stores Ready & Backed Up:**
  - [ ] **PostgreSQL (`postgres`):**
    - [ ] Final pre-launch backup complete.
    - [ ] Restore drill successfully executed and documented.
  - [ ] **Neo4j (`neo4j`):**
    - [ ] Final pre-launch backup complete.
    - [ ] Restore drill successfully executed and documented.
  - [ ] **Redis (`redis`):**
    - [ ] Configuration is production-hardened.
- [ ] **Secrets & TLS Configured:**
  - All required secrets are stored securely in the production vault.
  - TLS certificates are valid and correctly configured for all public-facing endpoints.
- [ ] **SLOs Validated:**
  - Staging load tests have been completed to validate the SLOs for key service paths.
  - Test results are documented and reviewed.

---

## 2. Safety Nets: Observability, Rollback, and Guardrails

- [ ] **Observability End-to-End:**
  - [ ] Logs, metrics, and traces are confirmed to be flowing from all services to the observability platform.
  - [ ] Dashboards are in place for key SLOs (latency, error rate, etc.).
  - [ ] Critical alerts are configured and have been tested (e.g., via alert injection).
    - **Alerts to check:** Ingest failures, graph corruption, orchestrator stalls, SLO breaches.
- [ ] **Rollback Paths Tested:**
  - [ ] **Database Migrations:** `postgres` and `neo4j` migration rollback scripts have been tested in a staging environment.
  - [ ] **Application Deployments:** A blue-green or canary deployment strategy is in place and has been tested for all application services.
    - **Services:** `prov-ledger`, `policy-lac`, `nl2cypher`, `report-studio`
  - [ ] **Feature Flags:** High-risk features are confirmed to be behind feature flags, and the process for disabling them has been tested.

---

## 3. Security, Governance, and Compliance

- [ ] **RBAC & Access Locked:**
  - Least-privilege roles for all user types (operators, analysts, tenants) are in place and have been audited.
  - Access to secrets and sensitive data is restricted and logged.
  - All administrative actions are logged for auditing purposes.
- [ ] **Final Hardening Pass Complete:**
  - [ ] Dependency scans run and no new critical vulnerabilities found. (Reference: `docs/release/GA_READINESS_REPORT.md`)
  - [ ] Container image scans run and no new critical vulnerabilities found.
  - [ ] SBOM (Software Bill of Materials) has been generated. (Reference: `RUNBOOKS/GA_RELEASE.md`)
  - [ ] Secrets scanning has been run against the release candidate branch.

---

## 4. Cutover Plan & Runbook

**Communications Channel:** [Link to Slack/Teams War Room]

### Pre-Checks (T-60 minutes)

- [ ] All key personnel are present and accounted for in the war room.
- [ ] Final "go" decision is given by the Incident Commander.
- [ ] Production health checks are all green.
- [ ] All previous steps in this runbook are complete.

### Cutover Sequence (T-0)

1.  [ ] **Enable Maintenance Mode:**
    - The `report-studio` (UI) service is placed into maintenance mode.
2.  [ ] **Deploy Database Migrations:**
    - [ ] `postgres` migrations are applied.
    - [ ] `neo4j` migrations are applied.
3.  [ ] **Deploy Backend & Gateway Services:**
    - [ ] `prov-ledger` is deployed and health checks are verified.
    - [ ] `policy-lac` (gateway) is deployed and health checks are verified.
4.  [ ] **Deploy AI & Application Services:**
    - [ ] `nl2cypher` is deployed and health checks are verified.
    - [ ] `report-studio` (UI) is deployed.
5.  [ ] **Initial Validation:**
    - Automated smoke tests (`make smoke`) are run against the production environment.
    - Key user flows are manually validated by the on-call engineer.
6.  [ ] **Disable Maintenance Mode:**
    - Maintenance mode is disabled on the `report-studio` service.
7.  [ ] **Final Monitoring:**
    - The team actively monitors dashboards for any anomalies for 15 minutes.
    - If all metrics are stable, the go-live is declared a success.

### Abort/Rollback Criteria

- If a critical failure occurs at any step that cannot be resolved within 15 minutes, the Incident Commander will initiate a rollback.
- **Trigger:** Any P0 alert, failure of a critical health check, or corruption of data.
- **Rollback Plan:**
  1. Re-enable maintenance mode.
  2. Roll back application deployments to the previous version.
  3. Execute database migration rollback scripts.
  4. Verify system stability on the previous version.
  5. Disable maintenance mode.

---

## 5. Post-Go-Live Hypercare & Feedback

- [ ] **Hypercare Period Defined:**
  - **Duration:** 1-2 weeks.
  - **On-Call:** Primary and secondary on-call engineers are assigned for the duration.
- [ ] **Triage & Incident Management:**
  - A clear process is in place for triaging incoming issues (e.g., using a specific tag in the issue tracker).
  - SLAs for incident response are defined and communicated.
- [ ] **User Feedback Sessions:**
  - "Mini-sprint" training sessions for the first users are scheduled.
  - A structured process for capturing and prioritizing user feedback is in place.
