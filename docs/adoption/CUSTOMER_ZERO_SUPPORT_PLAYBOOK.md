# Customer Zero Support Playbook

**Objective:** To provide a structured, safe, and effective support process for the duration of the Customer Zero evaluation.

---

## How to File Issues

All issues, questions, or feedback should be filed in the designated private issue tracker. Please do not send support requests via email or direct message, as this prevents proper tracking and triage.

**When filing an issue, you must include the following information.** Issues without this information will be de-prioritized until the required fields are provided.

### Required Reproduction Fields

1.  **Summary:** A brief, one-sentence summary of the issue.
2.  **Steps to Reproduce:** A numbered list of the exact steps needed to reproduce the issue.
3.  **Expected Behavior:** What you expected to happen.
4.  **Actual Behavior:** What actually happened, including any error messages.
5.  **System Environment:**
    *   Cloud Provider / On-Premise
    *   Kubernetes Distribution (if applicable)
    *   Summit Platform Version (from `git rev-parse HEAD`)
6.  **Logs:** Relevant, anonymized logs from the affected service(s). **DO NOT INCLUDE ANY SENSITIVE DATA, SECRETS, OR PII IN LOGS.**

---

## Triage & Prioritization

Issues will be triaged and prioritized according to the following categories.

*   **P0 (Blocker):** An issue that completely prevents further evaluation.
    *   *Example: The `make smoke` command fails, preventing any further progress.*
    *   **SLA:** Best effort, target initial response within 4 business hours.

*   **P1 (High):** An issue that significantly impairs the evaluation but has a potential workaround.
    *   *Example: A core workflow verification step fails, but other parts of the evaluation can continue.*
    *   **SLA:** Best effort, target initial response within 1 business day.

*   **P2 (Medium):** A minor issue, question, or piece of feedback that does not block the evaluation.
    *   *Example: A minor UI glitch, a question about documentation, or a feature request.*
    *   **SLA:** Best effort, will be reviewed and addressed as resources permit.

---

## How Hotfixes are Handled

This evaluation is based on the official General Availability (GA) version of the Summit Platform. Our primary goal is to maintain a stable and secure baseline.

*   **No Custom Builds:** We will not provide custom one-off builds or patches.
*   **Official Releases:** If a P0 or P1 issue is determined to be a bug in the platform, the fix will be incorporated into the next official release. You will be instructed to upgrade to the new version.
*   **GA Hotfix Policy:** Any hotfixes will follow the official GA hotfix policy, which requires a full regression test and security scan before release. We will not bypass our standard release process to expedite a fix.

This process ensures that you are always evaluating a version of the platform that meets our production-readiness standards.
