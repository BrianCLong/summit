# Runbook: GA Sign-off

## 1. Purpose

This runbook outlines the formal sign-off process required before a General Availability (GA) release can be cut. The purpose is to ensure that all technical and business stakeholders have reviewed the release candidate, verified its readiness, and formally approved it for production.

The output of this process is a signed `decision.json` file, which is included in the evidence bundle as a non-repudiable record of the go/no-go decision.

## 2. Prerequisites

*   A release candidate (RC) has been successfully created and deployed to a staging or pre-production environment.
*   The dry-run for the target GA commit has completed successfully, and the resulting `evidence-bundle.tar.gz` has been downloaded and reviewed.
*   All required stakeholders are available and have been briefed on the release contents.

---

## 3. Step-by-Step Instructions

### Step 3.1: Create the Sign-off Checklist

For each GA release, a new sign-off checklist must be created as a GitHub issue.

1.  **Create a new issue** in the repository.
2.  **Title:** Use the format `GA Sign-off: vX.Y.Z`.
3.  **Body:** Copy and paste the contents of the **Sign-off Checklist Template** below into the issue body.

### Step 3.2: Complete the Checklist Items

The Release Captain is responsible for driving the sign-off meeting and ensuring each item is checked off as it is verified by the designated owner.

| #   | Item                               | Owner              | Verified (✅) |
| --- | ---------------------------------- | ------------------ | ------------- |
| 1.  | Production readiness review        | Engineering Lead   |               |
| 2.  | QA/Test results reviewed           | QA Lead            |               |
| 3.  | Rollback plan confirmed            | Operations Lead    |               |
| 4.  | Release notes approved             | Product Manager    |               |
| 5.  | Security scan results reviewed     | Security Lead      |               |
| 6.  | Documentation is complete          | Docs Lead          |               |
| 7.  | Go/No-Go decision                  | All Stakeholders   |               |

### Step 3.3: Record the Decision

Once the checklist is complete and a "Go" decision has been reached, the Release Captain will:

1.  **Create a `decision.json` file** with the following format:
    ```json
    {
      "version": "vX.Y.Z",
      "decision": "GO",
      "approved_by": [
        "brianclong",
        "other-approver"
      ],
      "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
      "checklist_issue_url": "https://github.com/BrianCLong/summit/issues/<issue_number>"
    }
    ```
2.  **Commit and push this file** to a new branch.
3.  **Create a Pull Request** to merge the `decision.json` into the `main` branch. This PR serves as the formal, auditable record of the sign-off. The PR must be approved by all individuals listed in the `approved_by` field.

---

## 4. Expected Artifacts

*   A GitHub issue with the completed sign-off checklist.
*   A `decision.json` file committed to the repository, containing the formal "GO" decision and approver details.

---

## 5. Failure Modes & Rerun Commands

| Failure Mode                        | Action                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **"No-Go" decision is made**        | The release is aborted. The Release Captain documents the reasons in the checklist issue and closes it.                |
| **Key stakeholder is unavailable**  | The sign-off meeting must be rescheduled. A release cannot proceed without approval from all required stakeholders. |
| **Checklist item cannot be verified** | The release is blocked. The owner of the failing item is responsible for remediation. Once fixed, the sign-off process can be restarted. |

---
## Sign-off Checklist Template

```markdown
# GA Sign-off Checklist: vX.Y.Z

## Instructions
This checklist must be completed and approved by all stakeholders before the GA release `vX.Y.Z` can be cut.

- [ ] **Release Candidate:** `vX.Y.Z-rc.N`
- [ ] **Target Commit SHA:** `<commit-sha>`
- [ ] **Evidence Bundle:** (Link to the downloaded bundle from the dry-run)

---

### Verification Items

| #   | Item                               | Owner              | Verified (✅) |
| --- | ---------------------------------- | ------------------ | ------------- |
| 1.  | Production readiness review        | Engineering Lead   |               |
| 2.  | QA/Test results reviewed           | QA Lead            |               |
| 3.  | Rollback plan confirmed            | Operations Lead    |               |
| 4.  | Release notes approved             | Product Manager    |               |
| 5.  | Security scan results reviewed     | Security Lead      |               |
| 6.  | Documentation is complete          | Docs Lead          |               |

---

### Final Decision

A "Go" decision from all stakeholders is required.

- [ ] Engineering: **Go/No-Go**
- [ ] QA: **Go/No-Go**
- [ ] Operations: **Go/No-Go**
- [ ] Product: **Go/No-Go**
- [ ] Security: **Go/No-Go**

**Overall Decision:** **GO / NO-GO**
```
