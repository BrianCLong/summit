# GA Release Runbook

**Status:** Stable
**Owner:** Platform Engineering
**Last Updated:** 2026-03-04

This runbook defines the canonical process for executing and validating a General Availability (GA) release for the IntelGraph platform.

---

## 1. Preflight Checks

Before initiating a release, the following gates must be confirmed. Failure to meet any criteria constitutes an automatic "No-Go".

### 1.1 CI/CD Gates
- [ ] **RC Lineage:** The GA commit SHA must match a successful RC (Release Candidate) tag (e.g., `v1.2.3-rc.5`). Verify with `./scripts/release/verify-rc-lineage.sh`.
- [ ] **Build Status:** Latest `main` or release branch build is GREEN.
- [ ] **Security Scans:** All Trivy and Snyk scans passed with zero CRITICAL vulnerabilities.
- [ ] **Evidence Bundle:** `evidence-bundle.tar.gz` exists and contains valid SBOM and provenance data.

### 1.2 Infrastructure & Policy
- [ ] **Branch Protection:** `main` branch protection is active (no force pushes, required reviews).
- [ ] **Change Freeze:** No active global change freezes are in effect unless release is emergency-only.
- [ ] **Approvals:** Two-person approval in the `ga-release` GitHub environment is prepared.

---

## 2. Deploy Sequence

Execution must follow this specific order to maintain system integrity.

### Step 1: Create and Push GA Tag
```bash
# Verify current version in pyproject.toml matches intended GA version
git tag -a v1.2.3 -m "Release v1.2.3 GA"
git push origin v1.2.3
```

### Step 2: Monitor Release GA Pipeline
Navigate to **Actions → Release GA Pipeline** and monitor the following stages:
1. **Gate**: Validation of tag format.
2. **Lineage Check**: SHA matching against RC.
3. **Verification**: Full test suite and Antigravity governance check.
4. **Build GA Bundle**: Artifact generation and checksumming.
5. **Publish Guard**: Integrity validation of the generated bundle.

### Step 3: Executive Approval
1. Notify the `ga-release` environment approvers.
2. Review the `ga-release-bundle-{tag}` artifact manually if required.
3. Approvers must click "Approve and Deploy" in the GitHub Actions UI.

### Step 4: Asset Promotion
The pipeline will automatically:
1. Create a GitHub Release.
2. Upload signed artifacts (wheels, bundles).
3. Attach SBOM and Evidence materials.

---

## 3. Post-Deploy Validation

Perform these checks immediately after the "Assemble & Publish" stage completes.

### 3.1 Artifact Verification
- [ ] Verify artifacts are publicly accessible in the GitHub Release.
- [ ] Run local verification on a sample artifact:
  ```bash
  cosign verify-blob --certificate <artifact>.cert --signature <artifact>.sig <artifact>
  ```

### 3.2 Smoke Tests
- [ ] **Health Check:** `GET /health` returns 200 OK for all services.
- [ ] **Version Check:** `GET /version` matches the GA tag.
- [ ] **Synthetic Transactions:** Run `npm run test:smoke` against the production endpoint.

---

## 4. Rollback Procedure

If validation fails or critical regressions are detected.

### 4.1 Triggers
- Sustained error rate > 1% over 5 minutes.
- Latency (P99) > 2s for core API paths.
- Critical data corruption or security breach.

### 4.2 Steps
1. **Declare Incident:** Notify the on-call engineer and open an incident channel.
2. **Execute Rollback:**
   ```bash
   # If using Helm
   helm rollback <release-name> <previous-revision> -n <namespace>
   ```
3. **Clear Caches:** Flush CDN/Edge caches if front-end assets were modified.
4. **Verify:** Confirm system returns to "Previous Stable" health state.

---

## 5. Post-Release Monitoring (First 24h)

### 5.1 Watchlist
- **Error Rates:** Monitor `grafana_ga_core_dashboard.json` for 4xx/5xx spikes.
- **Resource Usage:** CPU/Memory saturation on new pods.
- **Queue Depth:** Monitor DLQ (Dead Letter Queues) for message processing failures.

### 5.2 Escalation Path
1. **L1:** Release Captain (On-call)
2. **L2:** Platform Engineering Lead
3. **L3:** CTO / Head of Engineering

### 5.3 Alert Thresholds
- **Critical:** 5xx rate > 5% for 2 mins (Immediate P1).
- **Warning:** 5xx rate > 2% for 10 mins (P2 investigation).

---

## 6. Roles and Responsibilities Matrix

| Role | Responsibility |
| :--- | :--- |
| **Release Captain** | Executes the sequence, monitors pipeline, coordinates smoke tests. |
| **Reviewer 1** | Primary code/integrity approver in `ga-release` environment. |
| **Reviewer 2** | Secondary governance/compliance approver in `ga-release` environment. |
| **On-call SRE** | Monitors infrastructure health, executes rollback if triggered. |

---

## 7. Go/No-Go Decision Criteria

| Criteria | Go | No-Go |
| :--- | :--- | :--- |
| CI Status | Green | Red / Yellow |
| RC Lineage | Matches | Mismatch |
| Known Bugs | Zero P0/P1 | Any open P0/P1 |
| Infrastructure | Healthy | Scaling or Connectivity issues |
| Approvals | 2/2 received | < 2 received |
| Stakeholders | All "Go" | Any "No-Go" |
