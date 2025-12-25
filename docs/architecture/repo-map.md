# Repository Architecture Map

**Scope:** `feature/sprint-lock-2025-12-29`
**Last Updated:** 2025-12-29

This map provides a high-level overview of the `summit` monorepo structure, identifying key domains and critical paths for new engineers.

## 🗺️ High-Level Geography

```mermaid
graph TD
    Root[Repo Root] --> Apps[apps/]
    Root --> Server[server/]
    Root --> Packages[packages/]
    Root --> Services[services/]
    Root --> Infra[infra/ & k8s/]
    Root --> Docs[docs/]

    Apps --> Web[web/ (Summit Client)]
    Apps --> AppsServer[server/ (v2 GraphQL Server)]

    Server --> CoreAPI[IntelGraph Core API (v1)]
    Server --> Maestro[Maestro Orchestrator]
    Server --> DB[db/ (Neo4j/PG Migrations)]

    Services --> Workers[Background Workers]
    Services --> Agents[AI Agents]
```

## 📂 Key Directories

### 1. Core Applications
*   **`server/`**: The primary **IntelGraph API** (Node.js/Express/Apollo).
    *   `src/index.ts`: Entry point.
    *   `src/graphql/`: Schema and Resolvers.
    *   `src/services/`: Business logic (Singleton services).
    *   `src/maestro/`: Orchestration engine.
    *   `src/provenance/`: Ledger and Audit logic.
*   **`apps/web/`**: The **Summit Analyst Interface** (React/Vite).
    *   `src/`: Frontend source code.
    *   `src/components/`: Reusable UI components.
    *   `src/graphql/`: Apollo Client queries/mutations.

### 2. Services & Agents
*   **`services/`**: Independent microservices (Node.js/Python).
*   **`rust/psc-runner`**: High-performance sidecar/runner.
*   **`tools/ultra-agent`**: Autonomous development agent framework.

### 3. Shared Resources
*   **`packages/`**: Shared libraries (contracts, utils) used by multiple apps.
*   **`prompts/`**: Centralized LLM prompts (YAML) managed by `PromptRegistry`.

### 4. Infrastructure & Config
*   **`deploy/`**: Deployment configurations (Docker Compose profiles).
*   **`k8s/`, `helm/`**: Kubernetes manifests for production.
*   **`.github/workflows/`**: CI/CD pipelines (`pr-quality-gate.yml` is the source of truth).
*   **`AGENTS.md`**: Master instruction file for AI agents.

## 🚦 Critical Paths & Owners

| Domain | Path | Key Files |
| :--- | :--- | :--- |
| **Auth** | `server/src/auth` | `AuthService.ts`, `middleware/auth.ts` |
| **Graph DB** | `server/src/db` | `neo4j.ts`, `migrations/` |
| **Orchestration** | `server/src/maestro` | `MaestroOrchestrator.ts`, `runs/` |
| **Search** | `server/src/search` | `search.ts`, `search-engine/` |
| **Audit** | `server/src/provenance` | `ledger.ts`, `audit/worm.ts` |

## 🛠️ Developer Workflow

*   **Bootstrap:** `make bootstrap` (Installs deps, setups env)
*   **Start:** `make up` (Runs full stack via Docker Compose)
*   **Verify:** `make smoke` (Runs golden path tests)

## ⚠️ "Ghost" & Legacy Zones

*   `client/`: Legacy React client (prefer `apps/web`).
*   `apps/server`: Experimental v2 Server (prefer root `server/`).
*   `intelgraph-mvp/`: Initial MVP reference.

Use this map to navigate the repository safely. When in doubt, follow the **Critical Paths**.
