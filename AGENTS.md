# Agent Operational Guidelines

> **Authority:** Jules, Autonomous Editor-in-Chief
> **Purpose:** Define protocols for AI agents operating within the Summit repository.

## 1. Project Structure & Organization

*   **Apps:** `server/` (Node/Express/GraphQL), `client/` (React/Vite).
*   **Documentation:** `docs/` (Core), `docs/generated/` (Automated).
*   **Data:** `server/db/` (Migrations, Seeds).
*   **Infrastructure:** `.github/` (CI/CD), `scripts/` (Automation), `deploy/` (K8s/Docker).

## 2. Core Operational Commands

Agents must prioritize the `make` system for reliability.

*   **Bootstrap:** `make bootstrap` (Install deps, setup env).
*   **Start:** `make up` (Start Docker services).
*   **Verify:** `make smoke` (Run Golden Path tests).
*   **Test:** `make test` (Run full suite).
*   **Lint:** `make lint` (Enforce style).

## 3. Coding Standards

*   **Language:** TypeScript (Strict), Python 3.11+ (Typed).
*   **Style:** Prettier + ESLint (JS/TS), Black + Ruff (Python).
*   **Conventions:**
    *   Filenames: `kebab-case` (default), `PascalCase` (React components, Classes).
    *   Commits: [Conventional Commits](https://www.conventionalcommits.org/) required (`feat:`, `fix:`, `docs:`).

## 4. Testing Protocols

*   **Mandate:** No feature is complete without tests.
*   **Coverage:** Target ≥80% for new logic.
*   **Structure:**
    *   **Unit:** `__tests__` adjacent to source.
    *   **Integration:** `tests/integration/`.
    *   **E2E:** `tests/e2e/` (Playwright).

## 5. Pull Request Hygiene

*   **Branching:** `type/scope/description` (e.g., `feat/ingest/csv-parser`).
*   **Description:** Narrative structure (Context → Change → Validation).
*   **Verification:** CI must be green. `make smoke` must pass locally.

## 6. Security & Configuration

*   **Secrets:** Never commit secrets. Use `.env` (git-ignored).
*   **Config:** Use `server/src/config/` for centralized configuration.
*   **Defaults:** Assume production-secure defaults (TLS, Auth enabled).

---
*Execute with precision. Document with clarity.*
