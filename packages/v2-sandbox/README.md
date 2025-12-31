# V2 Experimental Sandbox

**Status:** EXPERIMENTAL
**Access:** RESTRICTED (No Production Data)

## Purpose

This directory (`packages/v2-sandbox/`) is a "Safe Zone" for V2 innovation. Code here is explicitly authorized to deviate from standard V1 patterns **ONLY IF** it adheres to the isolation rules.

## Isolation Rules

1.  **No Production Access:** Sandbox code must NOT possess credentials or connectivity to production databases or services.
2.  **Separate State:** Sandbox components must use ephemeral or separate storage (e.g., in-memory, local SQLite, or dedicated sandbox databases).
3.  **No Critical Path:** Core V1 flows (Auth, Provenance, Payments) must NOT depend on Sandbox code.
4.  **Feature Flagged:** Any integration points with Core must be behind a disabled-by-default feature flag.

## Graduation Criteria

To move code from `packages/v2-sandbox/` to `packages/core/` (or equivalent):

1.  **Stability:** Proven stable execution in test environments.
2.  **Compliance:** Must adopt all V1 Governance, Security, and Provenance requirements.
3.  **Review:** Must pass a **Class B** or **Class A** review.
4.  **Cleanup:** Remove "Sandbox" hacks or mocks.
