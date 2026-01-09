# Summit GA Cut & Launch Playbook

**Version:** 1.0
**Owner:** Release Engineering / Stewardship
**Last Updated:** 2026-01-09

## 1. Overview

This playbook defines the standard operating procedure for cutting a General Availability (GA) release of the Summit platform. It utilizes the **GA Cut Plan** automation to ensure strict consistency between rehearsals (dry-runs) and the actual launch.

### Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Release Captain** | Triggers the workflow, monitors execution, ensures approvals. |
| **SRE / Ops** | Monitors deployment health, risk envelope validation, and rollback readiness. |
| **Risk / Compliance** | Reviews evidence bundle and approves the `ga-release` environment gate. |
| **Product / Exec** | Provides final "Go" decision based on feature verification. |

## 2. Pre-Cut Checklist

Before triggering the cut, verify the following:

- [ ] **Stabilization:** The `rc` branch or candidate SHA has passed the Stabilization Period (typically 48h).
- [ ] **Dry Run:** A dry-run has been executed successfully against the target SHA within the last 24h.
- [ ] **Blockers:** No open P0/P1 incidents or blocking bugs.
- [ ] **Governance:** `decision.json` (or equivalent approval) is drafted.
- [ ] **Incident Readiness:** No active incidents; on-call rotation is confirmed.

## 3. Execution Steps

### Step 3.1: Dry Run (Rehearsal)

Run this to generate the plan and verify artifacts without mutations.

1.  **Trigger Workflow:** Go to GitHub Actions -> **GA Cut & Launch**.
2.  **Inputs:**
    *   `target_sha`: `<SHA>` (or leave empty for HEAD)
    *   `channel`: `ga`
    *   `tag_name`: `vX.Y.Z` (Draft tag)
    *   `confirm_apply`: `false` (Unchecked)
3.  **Verify:**
    *   Check the "Plan GA Cut" job summary.
    *   Download `ga-cut-plan` artifact.
    *   Verify the `PLAN_<SHA>_dry-run.md` matches expectations.

### Step 3.2: Real GA Cut (Apply)

⚠️ **Warning:** This step creates tags and triggers deployments.

1.  **Trigger Workflow:** Go to GitHub Actions -> **GA Cut & Launch**.
2.  **Inputs:**
    *   `target_sha`: `<SHA>` (Must match dry-run)
    *   `channel`: `ga`
    *   `tag_name`: `vX.Y.Z` (Approved tag)
    *   `confirm_apply`: `true` (Checked)
3.  **Monitor Stages:**
    *   **0️⃣ Plan:** Confirms the plan (Apply mode).
    *   **1️⃣ Guardrails:** Validates Risk Envelope and Incident Readiness. *Fails here if risk is too high.*
    *   **2️⃣ Apply Cut:**
        *   **Approval Gate:** The workflow will pause for approval in the `ga-release` environment.
        *   **Action:** Release Captain requests approval from Risk/Compliance.
        *   **Execution:** Once approved, tags are pushed and deployment pipelines triggered.

## 4. Post-Cut Activities

1.  **Evidence:** Download the `ga-cut-summary` artifact containing `GA_CUT_<SHA>.md` and the final Evidence Bundle.
2.  **Announcement:** Post the release announcement using the generated `github_release.md` content.
3.  **Monitoring:** Monitor `apps/slo-exporter` and System HUD for regression signals (Error Budget burn).

## 5. Contingencies

### Rollback
If critical issues are detected immediately post-cut:
1.  **Stop Promotion:** Cancel any pending `release-ga-pipeline` jobs.
2.  **Revert:** Execute the [Emergency Rollback Playbook](docs/runbooks/ROLLBACK_PLAYBOOK.md).
3.  **Mark as Bad:** Tag the failed release as `vX.Y.Z-void` to prevent accidental usage.

### Abortion
If the workflow fails at the **Guardrails** stage:
1.  **Do not force apply.**
2.  Address the risk violation or incident readiness gap.
3.  Restart the process from Step 3.1.
