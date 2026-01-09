# GA Readiness Index

This document is the canonical starting point for assessing the General Availability (GA) readiness of the Summit platform.

## Current Status: ELIGIBLE

The Summit platform currently meets all documented criteria for a GA release. The official, auditable decision is captured in the `decision.json` artifact of the latest release evidence bundle.

## GA Eligibility Criteria

A release is considered eligible for GA when the following criteria are met:

*   All automated CI checks in the `ga-release.yml` workflow must pass.
*   A valid, non-expired `decision.json` with a "GO" decision must be present.
*   There are no outstanding P0/P1 blockers in the [Operational Readiness Pack](../../docs/ops/P0P1_BLOCKERS.md).
*   All security exceptions are documented and approved in the `SECURITY_EXCEPTIONS.yml` registry.

---

## External Reviewers

**Start here if you are not a Summit developer.**

This section provides a curated path for external assessors, compliance officers, and executive stakeholders.

*   **[Assessor Quick Start](../review-pack/ASSESSOR_QUICK_START.md):** A guided, 60-minute review plan to assess GA readiness.
*   **[Assessor Walkthrough Script](../review-pack/ASSESSOR_WALKTHROUGH_SCRIPT.md):** A text-only script for a 5-minute screencast that walks through the evidence bundle.
*   **[Executive Summary](../review-pack/EXEC_SUMMARY_GA_READINESS.md):** A single-page summary of the current readiness posture, strengths, and residual risks, tuned for non-technical leaders.

---

## Key Workflows & Runbooks

*   **GA Verification Workflow:** `/.github/workflows/ga-release.yml`
*   **Release Cut Process:** `/docs/releases/runbook.md`
*   **Rollback Procedure:** `/docs/ops/runbook-rollback.md`
*   **Incident Response:** `/docs/ops/runbook-incident-response.md`

## Governance & Controls

*   **Control Registry:** `/docs/governance/CONTROL_REGISTRY.md`
*   **Security Policy:** `/SECURITY.md`
*   **Release Policy:** `/policy/release.rego`
