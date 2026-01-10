# Support Model (GA 1.0)

> **Status**: Active
> **Version**: 1.0
> **Owner**: Product Council

## 1. Purpose

This document defines the support model for the Summit General Availability (GA) product. It outlines the types of issues we support, how we classify them, our targets for response, and what we require from you to effectively diagnose and resolve issues. This model is designed to be transparent, realistic, and aligned with our operational capabilities.

---

## 2. Supported Issue Types

We provide support for the following categories of issues for all functionality within the "Supported" scope defined in `PRODUCT_BOUNDARIES.md`.

- **Bugs**: A defect where the product does not perform as documented in the official GA materials.
- **Security Findings**: A potential vulnerability in the "Supported" components of the GA product.
- **Documentation Errors**: Inaccurate or misleading information in the official GA documentation set.
- **GA Feature Questions**: Clarification questions regarding the functionality or configuration of supported GA features.

---

## 3. Severity Definitions & Response Targets

Our severity levels are aligned with our internal incident response framework (`docs/ops/INCIDENT_SEVERITY.md`). Response targets are goals, not guarantees, and represent our intent for initial acknowledgment and engagement during standard business hours.

| Severity | Definition                                                                                             | Target Initial Response |
| :--- | :--- | :--- |
| **P0 - Critical** | A critical, platform-wide failure, security breach, or data integrity event with no workaround. This corresponds to our internal **SEV0/SEV1** incidents. | **≤ 1 Hour** |
| **P1 - High** | Material loss of a core GA feature or a serious security finding with no workaround. This corresponds to our internal **SEV1/SEV2** incidents. | **≤ 4 Business Hours** |
| **P2 - Normal** | A partial impact on a GA feature with a documented workaround, or a non-critical documentation error. This corresponds to our internal **SEV2/SEV3** incidents. | **≤ 8 Business Hours** |
| **P3 - Low** | A cosmetic issue, a question about a GA feature, or a minor documentation error. | **≤ 24 Business Hours** |

**Note on Business Hours**: Standard business hours are defined as 9:00 AM to 5:00 PM in the U.S. Pacific time zone, Monday through Friday, excluding holidays.

---

## 4. Required Reproduction Artifacts

To provide effective support, we require a complete set of artifacts to reproduce the issue. All support requests **must** include the information detailed in the `SUPPORT_INTAKE_TEMPLATE.md`. Incomplete requests will be returned with a request for more information.

### Minimum Viable Information:

1.  **GA Baseline Commit Hash**: The exact `git` commit hash of the Summit version you are running.
2.  **Reproduction Steps**: A deterministic, step-by-step guide to reproduce the issue, starting from a clean deployment if possible. This should be a sequence of commands, API calls, or UI interactions.
3.  **Expected vs. Actual Behavior**: A clear statement of what you expected to happen versus what actually occurred.
4.  **Evidence**:
    *   **Relevant Logs**: Structured logs from all relevant services (`gateway`, `server`, etc.) covering the time of the incident.
    *   **Configuration**: The contents of your `.env` file or Helm `values.yaml` (with secrets redacted).
    *   **Health Status**: The output of the `/health/detailed` endpoint during the incident.
    *   **Screenshots/Recordings**: If the issue is UI-related, a visual recording is highly encouraged.

**Why we require this**: High-quality, reproducible bug reports are the fastest way to a resolution. This information allows us to bypass lengthy back-and-forth and begin diagnostic work immediately.

---

## 5. When an Issue May Be Declined or Redirected

Our goal is to resolve all valid support requests. However, we may decline or redirect an issue under the following circumstances:

- **Out of Scope**: The issue relates to functionality explicitly defined as "Best-Effort" or "Unsupported" in `PRODUCT_BOUNDARIES.md`. In this case, we will close the issue with an explanation.
- **Insufficient Information**: The support request does not include the minimum required artifacts, and the submitter is unresponsive to requests for more information after two business days.
- **Non-Reproducible Issue**: Our team cannot reproduce the issue after three good-faith attempts using the provided information. We will close the issue but may reopen it if new information becomes available.
- **Feature Request**: The issue is not a bug but a request for new functionality. We will redirect you to our official feature request process.
- **Third-Party Issue**: The root cause is determined to be within a third-party system (e.g., a cloud provider outage, a bug in an external identity provider). We will provide our findings and close the issue.
- **Security Finding**: If a security finding is confirmed, the support ticket will be closed and the issue will be moved to our private security remediation tracker. Public updates will be provided according to our security disclosure policy.
