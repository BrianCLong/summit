```markdown
<!--
Thank you for submitting a support request. To help us resolve your issue as quickly as possible, please provide the information requested below. Incomplete submissions may be returned, delaying the resolution.
-->

## 1. GA Baseline Commit

<!--
Please provide the full Git commit hash of the Summit version you are running. You can typically find this in the footer of the UI or by running `git rev-parse HEAD` in your deployment environment.
-->

**Commit Hash**: `[INSERT COMMIT HASH HERE]`

---

## 2. Issue Summary

<!--
Provide a brief, one-sentence summary of the problem.
-->

**Summary**: `[BRIEF SUMMARY OF THE ISSUE]`

---

## 3. Reproduction Steps

<!--
Provide a detailed, step-by-step guide to reproduce the issue. Be as specific as possible. Assume we are starting from a clean, standard GA deployment.
-->

1.  `[First step]`
2.  `[Second step]`
3.  `[Third step]`
4.  ...

---

## 4. Expected vs. Actual Behavior

<!--
- **Expected**: Clearly describe what you expected to happen when you performed the steps above.
- **Actual**: Clearly describe what actually happened.
-->

**Expected Behavior**:
`[DESCRIPTION OF EXPECTED BEHAVIOR]`

**Actual Behavior**:
`[DESCRIPTION OF ACTUAL BEHAVIOR]`

---

## 5. Scope & Severity Classification

<!--
Please classify the issue based on the definitions in our support documentation. This helps us with initial triage.
-->

-   **Scope Classification** (select one):
    -   [ ] **Supported**: This issue affects a core GA feature as defined in `PRODUCT_BOUNDARIES.md`.
    -   [ ] **Best-Effort**: This issue affects a feature in the "Best-Effort" category or relates to a non-standard environment.
    -   [ ] **Unsupported / Question**: This issue is out of scope, or I am asking a question.

-   **Proposed Severity** (select one):
    -   [ ] **P0 - Critical**: Platform-wide failure, data loss, or security breach.
    -   [ ] **P1 - High**: Material loss of a core feature with no workaround.
    -   [ ] **P2 - Normal**: Partial impact on a feature, or a workaround exists.
    -   [ ] **P3 - Low**: Cosmetic issue, minor documentation error, or question.

---

## 6. Evidence Attached

<!--
Attach all relevant evidence to this request. This is the most critical part of the submission. Redact any sensitive information.
-->

-   [ ] **Logs**: Attached relevant, time-stamped logs from all affected services (e.g., `gateway`, `server`).
-   [ ] **Configuration**: Attached `.env` file or Helm `values.yaml` (with secrets redacted).
-   [ ] **Health Check Output**: Attached the JSON output of the `/health/detailed` endpoint.
-   [ ] **Screenshots / Recordings**: Attached a visual recording of the issue (if applicable).
-   [ ] **API Payloads**: Attached the exact GraphQL query/mutation and variables used (if applicable).
```
