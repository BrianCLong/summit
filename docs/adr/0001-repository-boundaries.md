# ADR-0001: Repository Boundaries and Module Organization

## Status
Accepted

## Context
The IntelGraph repository is a large monorepo containing multiple applications, services, and shared packages. Without clear boundaries, code ownership becomes ambiguous, and dependencies can become tangled, leading to "spaghetti code" and build instability. We needed a definitive map of where code belongs and who owns it.

## Decision
We have established a strict directory structure and ownership model defined in [Boundary Map](../architecture/boundary_map.md) and [Ownership](../ownership/README.md).

Key Decisions:
1.  **Apps (`apps/`)**: Application entrypoints only. Minimal logic.
2.  **Services (`services/`)**: Independent, domain-specific microservices.
3.  **Packages (`packages/`)**: Shared libraries.
4.  **Core (`server/`, `client/`)**: Maintained as the legacy/core platform but new features should prefer `services/` or `packages/`.
5.  **Docs (`docs/`)**: Centralized documentation.

## Consequences
*   **Positive**:
    *   Clearer ownership for code review.
    *   Easier to split services later if needed.
    *   Reduced merge conflicts by isolating domains.
*   **Negative**:
    *   Might require moving code during refactors.
    *   "Where do I put this?" cognitive load (mitigated by Golden Path guides).
