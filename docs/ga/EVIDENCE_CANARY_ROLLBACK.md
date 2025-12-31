# Summit GA - Canary and Rollback Evidence Pack

> **Version**: 1.0
> **Last Updated**: 2026-01-15
> **Status**: GA-Ready
> **Audience**: On-Call Engineers, SRE, Incident Commanders

---

## 1. Executive Summary

This document is an operational playbook for managing canary releases and rollbacks for the Summit platform at General Availability (GA). It provides on-call engineers with the exact commands and procedures needed to act decisively during a release, without requiring tribal knowledge.

**Core Principle**: "When the alert fires, the answer is in this document."

---

## 2. Canary Release Operations

### 2.1 How to Initiate a Canary

A canary release is **automatically initiated** by the `post-release-canary.yml` GitHub Actions workflow when a new GA release is published. No manual intervention is required to start the process.

### 2.2 How to Monitor a Canary

*   **Grafana Dashboard**: The primary monitoring tool is the **Canary Release Dashboard** in Grafana. This dashboard provides a real-time comparison of the stable and canary versions across key metrics (error rate, latency, etc.).
    *   **URL**: `https://grafana.summit.internal/d/canary`
*   **Slack Channel**: The `#summit-releases` Slack channel provides automated updates on the canary's progress, including stage promotions and any alerts.

### 2.3 How to Promote or Abort a Canary

*   **Automatic Promotion**: The canary will be promoted to the next stage automatically if all SLOs are met.
*   **Automatic Abort**: The canary will be **automatically aborted and rolled back** if it breaches any of the critical SLOs defined in the `CANARY_STRATEGY.md`.
*   **Manual Abort (Emergency)**: If you need to manually abort a canary, do not interact with the CI workflow. Instead, initiate a manual rollback.

---

## 3. Rollback Operations

### 3.1 How to Rollback a Release

A rollback can be triggered manually from the GitHub Actions UI.

**Steps:**

1.  Navigate to the **Actions** tab of the Summit repository.
2.  In the left sidebar, click on the **Manual Release Rollback** workflow.
3.  Click the **Run workflow** dropdown on the right.
4.  Fill in the required inputs:
    *   **Version**: The GA version to roll back to (e.g., `v2026.01.14-ga`). This should be the last known good version.
    *   **Reason**: A clear and concise reason for the rollback (e.g., "Critical authentication bug discovered").
5.  Click the **Run workflow** button.

**Expected Output:**

*   The workflow will execute the `scripts/rollback-release.sh` script.
*   A notification will be sent to the `#summit-releases` Slack channel announcing the rollback.
*   The application will be rolled back to the specified version, including all associated configurations and policies.
*   A final notification will be sent to Slack upon successful completion.

**Sample Command (for local execution, if necessary):**

```bash
./scripts/rollback-release.sh --version "v2026.01.14-ga" --reason "P0 incident - data corruption" --notify
```

---

## 4. Drift Detection and Reporting

### 4.1 How Drift is Detected

*   Drift detection is performed **automatically** by the `scheduled-drift-detection.yml` GitHub Actions workflow.
*   This workflow runs daily and executes the `scripts/detect-drift.sh` script.
*   The script compares the current state of the repository (dependencies, configs, policies, and CI workflows) against a set of blessed baselines.

### 4.2 How Drift is Reported

*   **No Drift**: If no drift is detected, the workflow will complete successfully with no notifications.
*   **Drift Detected**:
    1.  The workflow will fail.
    2.  The workflow logs will contain a detailed `diff` of the detected drift.
    3.  A **P1 incident** will be automatically created in PagerDuty and assigned to the on-call SRE.
    4.  A notification will be sent to the `#summit-security` Slack channel with a summary of the drift.

**Sample Output of a Drift Report:**

```
[ERROR] Drift detected!
--- a/baselines/config.baseline
+++ b/baselines/current_config.tmp
@@ -1,2 +1,2 @@
- 2a3b...  helm/summit/values.production.yaml
+ 9f8e...  helm/summit/values.production.yaml
```

This output indicates that the `values.production.yaml` file has been modified. The on-call engineer is responsible for investigating this change immediately.
