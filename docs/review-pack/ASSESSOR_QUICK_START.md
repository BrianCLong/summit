# Assessor Quick Start

## Who this is for

This document is for external assessors (security, compliance, risk) with limited context on the Summit repository. It provides a guided, 60-minute path to understanding the project's General Availability (GA) readiness posture.

## What you get in this review

This review pack provides a snapshot of the evidence and controls used to govern the Summit GA release process.

**In Scope:**

*   **Release Governance:** The automated and manual controls that determine if a release is eligible to proceed.
*   **Security Posture:** The current state of security controls, including static analysis, dependency scanning, and exception management.
*   **Auditability & Traceability:** The evidence trail from code change to release artifact.
*   **Operational Readiness:** The plans and procedures for rollback, incident response, and post-release validation.

**Out of Scope:**

*   Product feature functionality and performance.
*   The internal workings of the development team.
*   Detailed code-level analysis of the application logic.

A full tour of the review pack bundle can be found in the [Assessor Walkthrough Script](ASSESSOR_WALKTHROUGH_SCRIPT.md).

## Prerequisites

*   **Access:** You will need access to the Summit GitHub repository and the ability to download CI artifacts. The evidence bundle may also be provided as a standalone `.zip` archive.
*   **Tooling:** A standard Markdown viewer is sufficient. Some artifacts are in JSON format.

## Golden Path: 60-minute review plan

This plan is a series of questions designed to be answered in sequence, providing a comprehensive overview of GA readiness.

1.  **Is the GA readiness decision clear and auditable? (10 mins)**
    *   **Open:** `docs/releases/GA_READINESS_INDEX.md` and the `decision.json` file from the latest evidence bundle.
    *   **Question:** Can you determine if the project is currently "ELIGIBLE" for a GA release? Is the decision signed off?
    *   **What Good Looks Like:**
        *   The `GA_READINESS_INDEX.md` provides a clear, top-level status.
        *   The `decision.json` file contains a non-expired "GO" decision with a valid commit SHA.

2.  **Is release governance deterministic? (15 mins)**
    *   **Open:** `.github/workflows/ga-release.yml` and `docs/governance/CONTROL_REGISTRY.md`.
    *   **Question:** Can you trace the automated checks that gate a release? Are these controls documented?
    *   **What Good Looks Like:**
        *   The `ga-release.yml` workflow shows a series of required jobs (e.g., `verify-ga-readiness`, `build-release-evidence`) that must pass.
        *   The `CONTROL_REGISTRY.md` maps these CI jobs to specific, auditable controls.

3.  **How is security posture managed? (15 mins)**
    *   **Open:** The `SECURITY.md` file and any `triage-report.md` artifacts from the evidence bundle.
    *   **Question:** Is there a clear view of security findings? Is there a formal process for accepting risks?
    *   **What Good Looks Like:**
        *   `SECURITY.md` provides a summary generated from the canonical `due-diligence/index.yaml` knowledge graph.
        *   Security exceptions are documented in `docs/security/SECURITY_EXCEPTIONS.yml` with justifications and approvals.

4.  **Is there a clear path for rollback and incident response? (10 mins)**
    *   **Open:** `docs/ops/runbook-rollback.md` and `docs/ops/runbook-incident-response.md`.
    *   **Question:** Are the procedures for handling a failed release or production incident clearly defined?
    *   **What Good Looks Like:**
        *   Runbooks provide step-by-step instructions.
        *   Clear ownership and communication channels are defined for different scenarios.

5.  **Is the evidence bundle complete and verifiable? (10 mins)**
    *   **Open:** The `MANIFEST.json` and `SHA256SUMS` files from the evidence bundle.
    *   **Question:** Can you verify the integrity of the artifacts in the bundle?
    *   **What Good Looks Like:**
        *   The `MANIFEST.json` lists all included artifacts.
        *   You can verify the checksum of any artifact in the bundle against the `SHA256SUMS` file.

## How evidence is organized

*   **Governance & Release Controls:** Start with `docs/releases/GA_READINESS_INDEX.md` and `.github/workflows/ga-release.yml`.
*   **Security Posture:** See `SECURITY.md` and `docs/security/SECURITY_EXCEPTIONS.yml`.
*   **Auditability & Traceability:** The evidence bundle's `MANIFEST.json` and `provenance.json` files are the primary sources.
*   **Operational Readiness:** Key documents are located in `docs/ops/`.

## Out-of-scope and known limitations

This review does **not** cover:
*   The financial or business case for the GA release.
*   The performance or scalability of the Summit platform under load.
*   Compliance with specific regulatory regimes (e.g., FedRAMP, SOC2), as this is a readiness assessment, not a formal audit.
