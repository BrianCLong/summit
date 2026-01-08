# Runbook: War Room Script

## 1. Purpose

This document provides a script and agenda for the GA Release "War Room" meeting. Its purpose is to provide a structured format for the final go/no-go decision, ensuring that all readiness data is reviewed, and all stakeholders are aligned before a release is cut.

## 2. Prerequisites

*   The [Sign-off](SIGNOFF.md) checklist has been completed, and the resulting `decision.json` has been approved and merged.
*   All key stakeholders (Engineering, QA, Operations, Product, Security) are present.
*   The dry-run of the release pipeline has completed successfully, and the evidence bundle is available for review.

---

## 3. Agenda & Script

**Meeting Lead:** Release Captain

---

### (5 min) 1. Roll Call & Meeting Objective

**Release Captain:** "Welcome, everyone, to the War Room for the `vX.Y.Z` GA release. The objective of this meeting is to make the final go/no-go decision. We will review the readiness checklist, confirm the deployment plan, and align on the decision. Let's do a quick roll call."

*   (Release Captain confirms all required stakeholders are present)

---

### (10 min) 2. Review of Release Candidate

**Release Captain:** "We will now review the key details of the release candidate."

*   **Release Version:** `vX.Y.Z`
*   **Target Commit SHA:** `<commit-sha>`
*   **Link to Release Notes:** (Paste link)
*   **Link to Sign-off Checklist:** (Paste link to GitHub issue)

**Release Captain:** "I can confirm that the `decision.json` for this release was approved and merged. The dry-run workflow completed successfully. Does anyone have any final questions or concerns about the contents of this release?"

---

### (10 min) 3. Departmental Go/No-Go

**Release Captain:** "We will now go around for a final go/no-go from each department lead. Please state your name, your department, and your decision: 'Go' or 'No-Go'."

*   **Engineering Lead:** "This is [Name] from Engineering. We are a **Go**."
*   **QA Lead:** "This is [Name] from QA. We are a **Go**."
*   **Operations Lead:** "This is [Name] from Operations. We are a **Go**."
*   **Product Manager:** "This is [Name] from Product. We are a **Go**."
*   **Security Lead:** "This is [Name] from Security. We are a **Go**."

---

### (5 min) 4. Final Decision & Action

**Release Captain:** "We have a unanimous 'Go' from all departments. The final decision is **GO** for release `vX.Y.Z`."

"I will now trigger the live release workflow. The estimated deployment time is [X] minutes. We will monitor the deployment from the `#releases` Slack channel. All stakeholders are expected to remain on standby until the release is confirmed stable in production."

---

## 4. Expected Artifacts

*   A verbal and recorded "Go" decision from all stakeholders during the meeting.
*   The Release Captain triggering the live release workflow as the final action of the meeting.

---

## 5. Failure Modes

| Failure Mode             | Action                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **A stakeholder says "No-Go"** | The release is immediately aborted. The stakeholder must provide the reason, which is documented by the Release Captain. The meeting is adjourned, and a new War Room is scheduled once the issue is resolved. |
| **Key stakeholder is absent** | The meeting cannot proceed. The release is blocked until the stakeholder is present or has provided a delegate with the authority to make the decision. |
| **New issue discovered during the meeting** | The meeting is paused. If the issue can be quickly assessed and is determined to be low-risk, the meeting may proceed. If not, the release is aborted. |
