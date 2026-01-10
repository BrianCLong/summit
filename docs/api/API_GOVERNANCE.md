# API Governance (v4)

This document outlines the governance model for maintaining the stability and backward compatibility of the GA (General Availability) API surfaces for Summit v4.

---

## 1. Core Principles

*   **Stability is Paramount**: The GA API surfaces are a contract with consumers (primarily the internal test suite). This contract must not be broken silently.
*   **The Smoke Test is the Contract**: The `make smoke` command is the single source of truth for API compatibility. If it passes, the contract is considered met.
*   **Explicitness over Implicitness**: All GA API surfaces are explicitly enumerated in `docs/api/GA_API_SURFACES.md`. Anything not in that document is not covered by this governance policy.
*   **Minimalism**: The GA API surface is intentionally kept as small as possible to reduce the governance burden and allow for maximum development velocity on non-contract surfaces.

## 2. Key Documents

This governance model is defined by a collection of documents:

*   **`GA_API_SURFACES.md`**: The definitive, enumerated list of all endpoints, commands, and schemas that are part of the GA contract.
*   **`API_COMPATIBILITY_POLICY.md`**: The formal definition of what constitutes a "breaking" versus a "non-breaking" change.
*   **`API_CONTRACT_SNAPSHOTS.md`**: A human-readable reference of sample requests and responses for the GA surfaces.
*   **`API_GOVERNANCE.md`** (this document): The umbrella document describing the process and enforcement of the API contract.

## 3. Governance Process

1.  **Identification**: New API surfaces are developed without backward-compatibility constraints.
2.  **Nomination**: To be considered for the GA contract, an API surface must be added to a smoke test or other critical CI-gated verification script.
3.  **Ratification**: The inclusion of the new check in the CI `golden-path` job and the addition of the surface to `GA_API_SURFACES.md` ratifies it as part of the GA contract.
4.  **Enforcement**: The CI `golden-path` job programmatically enforces the contract on every pull request.
5.  **Deprecation**: Breaking changes to a ratified API surface must follow the deprecation process outlined in `API_COMPATIBILITY_POLICY.md`.

## 4. Guardrail and Enforcement

The primary guardrail is the `smoke` job in the CI pipeline, which executes `make smoke`.

To provide a more explicit and lightweight check, a new verification script has been added.

*   **Script**: `scripts/verify-ga-surface.mjs` (as referenced in `Makefile`)
*   **Command**: `make ga-verify`

This command is designed to be run both locally and in CI. It performs the following actions:

1.  Reads the list of HTTP endpoints from `docs/api/GA_API_SURFACES.md`.
2.  Attempts to connect to each endpoint on `localhost`, simulating the smoke test.
3.  Exits with a non-zero status code if any endpoint is unreachable or returns a non-`2xx` status code.

This provides a fast, targeted way to ensure that changes to the server or networking configuration have not inadvertently broken the GA API contract, without needing to run the full `make smoke` suite.

---
