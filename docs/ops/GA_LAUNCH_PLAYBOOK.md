# GA Launch Playbook

This playbook outlines the steps required for a successful General Availability (GA) launch of Summit.

## 1. Preparation

Before launching, ensure all pre-requisites are met according to the GA Evidence Profile.

*   **Evidence Profile:** [docs/security/GA_EVIDENCE_PROFILE.md](../../docs/security/GA_EVIDENCE_PROFILE.md)
*   **Runbook Checklists:** [docs/runbooks/GA_RUNBOOK.md](../../docs/runbooks/GA_RUNBOOK.md)

## 2. Launch Execution

Follow the **GA Cut** checklist in the [GA Runbook](../../docs/runbooks/GA_RUNBOOK.md#2-ga-cut-release-day).

### Key Commands

*   **Verify Evidence:**
    ```bash
    opa eval -i report.json -d .github/policies/ga-evidence.rego "data.ga_evidence.allow"
    ```

*   **Check Runtime Health:**
    ```bash
    curl -f https://api.summit.com/health
    ```

## 3. Incident Management during Launch

If issues arise, refer to the **P1 Incident Response** section in the [GA Runbook](../../docs/runbooks/GA_RUNBOOK.md#p1-incident-response).

*   **Rollback:** See [Rollback Procedure](../../docs/runbooks/GA_RUNBOOK.md#rollback-procedure).
