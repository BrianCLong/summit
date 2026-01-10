# Independent Reproduction Contract

**Version:** 1.0.0
**Status:** ACTIVE
**Authority:** INDEPENDENT VALIDATOR (Jules)

This contract defines the terms, scope, and guarantees for external verification of the Summit Platform GA Release.

## 1. Environmental Assumptions

Verification is guaranteed only on systems meeting these criteria:

*   **Operating System:** Linux (Kernel 5.x+) or macOS (13+).
*   **Architecture:** x64 or arm64.
*   **Runtime:** Node.js >= 18.18.
*   **Package Manager:** pnpm >= 10.0.0 (or Corepack enabled).
*   **Containerization:** Docker & Docker Compose (optional, for integration tests only).

## 2. In-Scope Verification

The following assertions are independently verifiable on a "clean checkout" without proprietary secrets:

*   **Artifact Integrity:** All critical GA files defined in `GA_DEFINITION.md` exist and match their checksums/schemas.
*   **Policy Compliance:** Static policy files (`.rego`) parse and pass unit tests.
*   **Code Quality:** Linting, type-checking, and unit tests pass with zero errors.
*   **Build Determinism:** The build process produces consistent outputs given the same inputs (within environment limits).
*   **Governance Traceability:** All features verify against the `verification-map.json`.

## 3. Out-of-Scope Verification

The following are **NOT** guaranteed to be reproducible by external parties without access to the Summit production environment or restricted secrets:

*   **Runtime Penetration Testing:** Requires live infrastructure and authorized tokens.
*   **Performance Benchmarking:** Results depend heavily on hardware; strictly relative comparisons only.
*   **Third-Party API Integration:** Tests requiring actual connections to closed ecosystem partners (e.g., specific LLM providers) are skipped or mocked.
*   **Historical Provenance:** Re-verification of old immutable ledger entries (requires historical keys).

## 4. Runtime Budgets

*   **Fast Verification (`node scripts/ga/verify-ga-surface.mjs`):** < 5 seconds.
*   **Full Static Verification (`pnpm ga:verify`):** < 5 minutes (excluding install).
*   **Full Build & Test:** < 15 minutes.

## 5. Non-Goals

*   We do not provide a "click-to-deploy" production replica in this pack.
*   We do not guarantee compatibility with non-LTS Node.js versions.
*   We do not support Windows environments for this verification cycle.
