# Post-GA Baseline

> **Status:** ACTIVE | **Version:** 1.0 | **Last Updated:** 2026-01-05

This document codifies the permanent baseline for the Summit platform following the MVP-4 General Availability (GA) milestone. It defines the non-negotiable standards that future development must build upon.

## 1. The Golden Path (The Core Invariant)

The "Golden Path" is the sequence of commands that guarantees environment health. It must **always** pass on `main` and on every PR.

```bash
make bootstrap && make up && make smoke
```

*   **`make bootstrap`**: Sets up dependencies and environment variables deterministically.
*   **`make up`**: Starts the full containerized stack.
*   **`make smoke`**: Runs the end-to-end critical path integration test.

## 2. Technical Invariants

These are the technical boundaries that protect system stability.

| Category | Invariant | Enforcement |
| :--- | :--- | :--- |
| **Build** | `pnpm build` must pass without error. | CI (Blocking) |
| **Lint** | `pnpm lint` must pass (0 warnings). | CI (Blocking) |
| **Test** | Unit tests (`pnpm test`) must pass. | CI (Blocking) |
| **Security** | No committed secrets (Gitleaks). No critical CVEs. | CI (Blocking) |
| **Schema** | GraphQL/DB schema changes must be compatible (backwards). | Schema Check |
| **Release** | `main` is always in a deployable state. | Release Policy |

## 3. Architecture Zones

To maintain velocity, we enforce strict separation of concerns.

*   **Server Zone (`server/`)**: Backend services. Requires rigorous testing and type safety.
*   **Web Zone (`apps/web/`)**: Application UI. Can evolve faster but must not break API contracts.
*   **Docs Zone (`docs/`)**: Documentation. Always safe to append.
*   **Infrastructure (`infra/`, `k8s/`)**: Controlled changes only.

**Rule:** Do not import code across zones (e.g., Server cannot import Client). Use `packages/` for shared logic.

## 4. Release Standard

*   **Cadence**: We release to production every two weeks.
*   **GA Gate**: Every release candidate must pass the `make ga` readiness check, which includes deep health checks and evidence collection.
*   **Hotfixes**: Must follow the `hotfix/<issue>` branch pattern and undergo the same verification as regular features.

## 5. Contribution Contract

By contributing to this repository, you agree to:
1.  **Never Break the Build**: If you break `main`, you revert immediately.
2.  **Atomic PRs**: One feature/fix per PR.
3.  **Evidence**: Provide proof of verification (screenshots, test logs) in your PR.
