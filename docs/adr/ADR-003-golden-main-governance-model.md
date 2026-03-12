# ADR-003: Golden Main Governance Model

## Status
Accepted

## Context
Summit's mission involves defensive counterintelligence abstractions, GraphRAG orchestration, and security-focused automation. Code must be rigorously reviewed, and any modifications to the core repository must leave an auditable paper trail. Directly pushing to the main branch bypasses these safety checks and introduces significant operational risk.

## Decision
We enforce a strict "Golden Main" governance model for the repository.

1.  **No Direct Pushes:** All changes must enter `main` exclusively through Pull Requests. Direct commits, even by administrators, are prohibited.
2.  **Required Checks:** Pull Requests must pass a defined set of CI checks (e.g., tests, linters, evidence generation, determinism validation) before they can be merged. These requirements are defined in `docs/governance/` and the root `GOVERNANCE.md`.
3.  **Mandatory PR Context:** All pull requests must include a 'Commander's Intent' (explaining what CI/counter-AI gap is closed) and an 'Abuse Analysis' (explaining how the design constrains misuse).
4.  **Game-Day Validation:** We regularly validate these protections using read-only governance bypass game-day drills (e.g., `scripts/game-day/run-governance-drill.sh`) to ensure that simulated force-pushes or CI-skips are correctly blocked by policy without modifying actual branch rules.

## Consequences

**Positive:**
-   **Security and Auditability:** Every commit in `main` is tied to an approved PR, a set of CI results, and an explicit abuse analysis.
-   **Stability:** Required checks ensure that regressions are caught before they reach production.
-   **Enforced Accountability:** The 'Commander's Intent' ensures all code contributes directly to the strategic goals of the system.

**Negative:**
-   **Development Friction:** The barrier to entry for even minor fixes (like typos) is high, requiring the full PR and review lifecycle.
-   **Pipeline Dependency:** The repository's availability to accept code is entirely dependent on the health of the CI infrastructure.
