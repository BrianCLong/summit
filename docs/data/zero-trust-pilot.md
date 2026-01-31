# Zero-Trust Data Governance Pilot

This document outlines the design for the initial Zero-Trust Data Governance pilot at Summit.

## Pilot Scope
*   **Target Asset:** `governance/registry.json` (The Data Registry itself)
*   **Classification:** `Critical` (Metadata defining the truth of all other assets)
*   **Duration:** 30 Days

## Core Principles (Zero-Trust)
1.  **No Implicit Trust:** Being on the internal network grants no access. Access requires a valid policy token.
2.  **Least Privilege:** Write access is restricted to specific CI identities and verified Admins.
3.  **Continuous Verification:** Every access attempt is logged and validated against the active policy.

## Implementation Plan

### 1. Classification & Tagging
The asset `governance/registry.json` is tagged with:
*   `sensitivity: critical`
*   `provenance_required: true`
*   `owner: governance-council`

### 2. Access Policy (Enforced by PolicyEngine)
See `governance/data-policies/sample-policy.yaml`.
*   **READ:** Allowed for `role:developer`, `role:service-account`.
*   **WRITE:** Allowed ONLY for `role:admin` OR `service:ci-runner` (during verified workflows).
*   **DELETE:** Denied for ALL (Immutable Ledger).

### 3. Metadata Enforcement
Any update to the registry must include:
*   `change_reason`
*   `author_id`
*   `schema_version`

### 4. Violation Detection
*   **Detection:** `PolicyEngine` emits `policy_decision_made` events.
*   **Alerting:** Any `allowed: false` decision on `resource:governance/registry.json` triggers a `SEV-3` security alert.
*   **Audit:** Weekly report of all write operations.

## Success Metrics
*   0 Unauthorized write attempts successful.
*   100% of write operations have complete provenance metadata.
