# IP & Licensing Inventory

## 1. Introduction

This document serves as the central inventory for Intellectual Property (IP) management, licensing compliance, and third-party dependency tracking. It provides a decision matrix for license approval and defines the provenance of all code contributions.

**Goal:** Ensure clear IP posture, mitigate legal risks, and maintain a "clean" codebase for enterprise deployment and potential due diligence events.

## 2. Third-Party Dependencies Inventory

We track third-party dependencies across the following categories:

| Category           | Ecosystem            | Key Manifest Files                   | Risk Profile                                           |
| :----------------- | :------------------- | :----------------------------------- | :----------------------------------------------------- |
| **Backend**        | Node.js / TypeScript | `package.json`, `pnpm-lock.yaml`     | Moderate (Transitive deps)                             |
| **Backend**        | Python               | `requirements.txt`, `pyproject.toml` | Moderate (Scientific libs often have complex licenses) |
| **Backend**        | Go                   | `go.mod`, `go.sum`                   | Low (Mostly permissive)                                |
| **Frontend**       | React / Vite         | `package.json`                       | Moderate (UI libraries)                                |
| **Infrastructure** | Docker / Kubernetes  | `Dockerfile`, `Helm Chart.yaml`      | Low (OS base images)                                   |
| **AI/ML**          | Models & Weights     | `model-card.md`, HuggingFace Hub     | **High** (OpenRAIL, proprietary usage restrictions)    |
| **Rust**           | Rust Crates          | `Cargo.toml`, `Cargo.lock`           | Low (Apache/MIT dual license common)                   |

### 2.1 Critical Dependency Audit

_A generated SBOM (Software Bill of Materials) is required for each release artifact._

## 3. Licensing Risks & Mitigation

Licenses are categorized by risk level.

### Category A: Permissive (Green)

- **Licenses:** MIT, Apache 2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0.
- **Action:** Pre-approved for use.
- **Requirement:** Preserve copyright notices.

### Category B: Weak Copyleft (Yellow)

- **Licenses:** MPL 2.0, EPL 1.0/2.0, LGPL v2.1/v3.
- **Action:** Allowed with caution.
- **Requirement:** Dynamic linking only. Modifications to the library itself must be open-sourced. **Do not statically link.**

### Category C: Strong Copyleft (Red)

- **Licenses:** GPL v2/v3, AGPL v3.
- **Action:** **PROHIBITED** without Legal/Engineering Leadership approval.
- **Risk:** Viral effect requires open-sourcing our proprietary code.

### Category D: Commercial / Proprietary (Blue)

- **Licenses:** EULAs, Commercial subscriptions.
- **Action:** Requires procurement review.
- **Requirement:** Valid license key/subscription required.

### Category E: AI/ML Specific (Purple)

- **Licenses:** OpenRAIL-M, BigScience OpenRAIL, LLaMA Community License.
- **Action:** Review specific usage restrictions (e.g., non-commercial, "do no harm" clauses).

## 4. Contribution Sources & Provenance

To ensure clear chain of title:

### 4.1 Internal Employees

- All work is "work for hire" and owned by the company.
- Employment agreements include IP assignment clauses.

### 4.2 Contractors

- Master Services Agreements (MSA) must explicitly assign IP to the company.
- Code must be committed using company-issued email addresses.

### 4.3 Open Source / Community

- **CLA (Contributor License Agreement):** Required for all external contributions.
- **DCO (Developer Certificate of Origin):** `git commit -s` required to certify the right to contribute.
- **"No Copy/Paste" Rule:** Strictly prohibit pasting code from StackOverflow or other repos without verifying license compatibility (Category A only).

## 5. License Approval Decision Matrix

| Dependency License    | Usage Context    | Decision        | Action Required                                                |
| :-------------------- | :--------------- | :-------------- | :------------------------------------------------------------- |
| **MIT / Apache 2.0**  | All              | **APPROVED**    | None                                                           |
| **BSD (2/3 Clause)**  | All              | **APPROVED**    | None                                                           |
| **MPL 2.0 / EPL**     | Library / Linked | **CONDITIONAL** | Verify no source modification; Dynamic link only.              |
| **LGPL**              | Library / Linked | **CONDITIONAL** | Verify dynamic linking; Avoid for mobile/embedded.             |
| **GPL / AGPL**        | Any              | **REJECTED**    | **Do not use.** Seek alternative or obtain commercial license. |
| **CC-BY-SA**          | Content/Assets   | **REJECTED**    | Viral content license. Avoid.                                  |
| **WTFPL / Unlicense** | Any              | **REVIEW**      | Check for patent grant ambiguity.                              |
| **Proprietary**       | Any              | **REVIEW**      | Submit to Procurement.                                         |

## 6. Audit & Enforcement

- **CI Checks:** Automated license scanning (e.g., `fossa`, `license-checker`) runs on every PR.
- **Gatekeeper:** Builds fail if a Category C (Strong Copyleft) license is detected.
- **Review:** Quarterly manual review of the IP inventory.
