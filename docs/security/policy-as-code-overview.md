# Policy-as-Code Overview

This document outlines the Policy-as-Code (PaC) strategy for the IntelGraph platform. We use **Open Policy Agent (OPA)** and **Rego** to enforce security, compliance, and operational guardrails across the development lifecycle.

## Strategy

Our PaC strategy is divided into three layers:
1.  **PR Gates:** Enforced on Pull Requests (Title format, linked issues, approvals).
2.  **Repo Structure:** Enforced on repository events (No direct pushes to main, sensitive file protection).
3.  **Infrastructure & Artifacts:** Enforced on Dockerfiles, Kubernetes manifests, and Terraform (via Conftest).

## Policy Engine: OPA

We use [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) as our primary policy engine. Policies are written in Rego and stored in the `policy/` directory.

### Current Policies

*   **Access Control:** `policy/access.rego` - Defines RBAC and ABAC rules.
*   **PR Compliance:** `policy/pr.rego` - Checks for required approvals and labels.
*   **Workflow Guardrails:** `policy/workflow.rego` - Checks for branch protection and sensitive file modification.

## Workflow Integration

Policies are enforced via GitHub Actions:

*   **`.github/workflows/policy-check.yml`**: Runs OPA against the current context (PR metadata, changed files).
*   **`.github/workflows/pr-policy-gates.yml`**: Existing specialized gates (Conventional Commits, Migration Labels).
*   **`.github/workflows/policy-gate.yml`**: Scanners (TruffleHog, License Compliance).

## Adding New Policies

1.  Create a new `.rego` file in `policy/` (e.g., `policy/my-new-policy.rego`).
2.  Define a `deny` or `violation` rule.
3.  Ensure the policy accepts the standard input schema (see `input.json` generation in `policy-check.yml`).
4.  Add unit tests in `policy/tests/`.

## Phase 1 Implementation

The initial seed includes:
*   Enforcement of "No direct pushes to main" (via Rego check on Push events).
*   Detection of changes to sensitive paths (`.github/workflows/`, `policy/`).
*   Verification of PR metadata (complementing existing actions).
