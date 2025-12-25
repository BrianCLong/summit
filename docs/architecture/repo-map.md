# Repository Map: Production vs. Labs

This map defines the boundaries between Production-critical paths and experimental "Labs" code within the monorepo.

## 🟥 Production Critical (Strict Gates)
*Modifications here require Code Owner approval and full CI pass.*

*   `server/src/` - Core API logic.
*   `server/src/auth/` - Authentication & Authorization.
*   `server/src/graphql/` - Public Schema & Resolvers.
*   `apps/web/` - Customer-facing Frontend.
*   `server/src/provenance/` - Ledger & Audit integrity.
*   `.github/workflows/` - CI/CD Pipelines.
*   `deploy/` - Infrastructure as Code.

## 🟨 Shared Infrastructure (Library)
*Modifications here affect multiple zones.*

*   `server/src/lib/` - Shared utilities.
*   `prompts/` - LLM Prompts (Production & Experimental mixed).
*   `docs/` - Documentation.

## 🟩 Labs / Experimental (Quarantined)
*Code here is not guaranteed to be stable or secure for production use.*

*   `server/src/black-projects/` - Experimental modules (Aurora, Oracle).
*   `tools/ultra-agent/` - Autonomous agent prototypes.
*   `experiments/` - Data science scripts.
*   `intelgraph-mvp/` - Legacy/MVP code (to be migrated).
*   `policy-fuzzer/` - Testing tools.

## Boundary Enforcement
*   **CI**: Production paths enforce blocking SAST/SCA checks.
*   **Runtime**: "Labs" features must be behind Feature Flags (`ENABLE_LABS_MODE`).
*   **Dependencies**: Production code cannot import from `black-projects` or `experiments`.
