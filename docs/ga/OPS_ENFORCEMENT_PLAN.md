# Ops Enforcement Plan: Progressive Hardening

This document outlines the transition strategy for operational controls from "Warn-Only" to "Blocking" to ensure the Golden Path remains green without causing sudden disruption.

## Strategy: Warn → Monitor → Block

We introduce checks in a non-blocking "Warn" state to gather data on false positives. Once the signal-to-noise ratio is acceptable (>99% true positives), we promote the check to "Blocking".

## 1. Drift Guard

*   **Goal**: Prevent unmanaged changes to infrastructure and security configurations.
*   **Current State**: Warn-Only (Daily)
*   **Transition Trigger**: 5 consecutive days with 0 false positives.
*   **Target Date**: T+2 weeks.
*   **Blocking Mode**: Will fail `ga-gate` and `ops-release-candidate` workflows.

## 2. Evidence Verification

*   **Goal**: Ensure the `EVIDENCE_BUNDLE.manifest.json` matches the actual repository state.
*   **Current State**: Warn-Only (Weekly)
*   **Transition Trigger**: Successful generation and verification cycle in CI without timeout.
*   **Blocking Mode**: Will fail `ops-release-candidate` workflow.
*   **Note**: `ops:daily` will remain lightweight (check existence only).

## 3. Link Validator

*   **Goal**: Prevent dead links in documentation.
*   **Current State**: Warn-Only (via `check-doc-links.ts` if used).
*   **Transition Trigger**: Cleaning up existing 404s.
*   **Blocking Mode**: Will fail PR checks for documentation changes.

## Rollout Schedule

| Control | Phase 1 (Week 1) | Phase 2 (Week 2) | Phase 3 (Steady State) |
| :--- | :--- | :--- | :--- |
| **Drift Guard** | Daily Report (Warn) | PR Comment (Warn) | Block Merge |
| **Evidence** | Weekly Check (Warn) | RC Requirement | Block Release |
| **Links** | Ad-hoc (Warn) | CI Check (Warn) | Block PR |

## Exception Process

To bypass a blocking check in an emergency:
1.  Use the `release-override` workflow or `[skip ci]` if permitted.
2.  File a P1 issue to remediate the gap immediately.
