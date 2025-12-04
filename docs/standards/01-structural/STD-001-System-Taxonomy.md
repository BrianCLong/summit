# STD-001: System Taxonomy & Nomenclature

**Identifier**: STD-001
**Title**: System Taxonomy & Nomenclature
**Author**: Jules (Deep Spec Writer & Standards Author)
**Status**: ACTIVE
**Version**: 1.0.0
**Last Updated**: 2025-05-18

## 1. Purpose

To establish a rigorous, unified naming convention and directory structure for the IntelGraph ecosystem, ensuring consistent discoverability and cognitive alignment across human and agent developers.

## 2. Scope

This standard covers:
- Directory structure and organization.
- File naming conventions.
- Code identifiers (classes, variables, constants).
- Service and component naming.
- Documentation file locations.

## 3. Directory Structure Standards

### 3.1. Root Level
The repository root MUST strictly follow this high-level organization:
- `apps/`: Deployable user-facing applications (e.g., `web/`, `mobile/`).
- `client/`: (Legacy) The 'Summit' web client. *Target for migration to `apps/web`.*
- `server/`: The core backend monolith/services.
- `packages/`: Shared libraries and internal dependencies.
- `docs/`: Documentation and Standards.
    - `standards/`: The single source of truth for specs (this repository).
- `prompts/`: AI agent prompt definitions and schemas.
- `tools/`: CLI tools, scripts, and auxiliary utilities.
- `scripts/`: Operational and CI/CD scripts.

### 3.2. Service Modules (`server/src/`)
Backend services MUST use a modular architecture within `server/src/`:
- `server/src/{module-name}/`: Dedicated directory for the module.
    - `index.ts`: Public API export.
    - `types.ts` or `{module}.types.ts`: Type definitions.
    - `services/` or `*{Service|Manager}.ts`: Business logic (typically Singletons).
    - `routes/` (or centralized in `server/src/routes/`): API endpoints.
    - `models/` or `schema/`: Data models.

## 4. Naming Conventions

### 4.1. Files and Directories
- **Directories**: `kebab-case` (e.g., `user-management`, `data-processing`).
- **Source Files (TS/JS)**:
    - Classes/Components: `PascalCase` (e.g., `UserService.ts`, `GraphNode.tsx`).
    - Utilities/Functions: `camelCase` (e.g., `formatDate.ts`, `apiClient.ts`) OR `kebab-case` (legacy support).
    - *Constraint*: New files SHOULD use `PascalCase` for files exporting a primary class/component, and `camelCase` for functional modules.
- **Documentation**: `UPPER_SNAKE_CASE` for major root docs (e.g., `README.md`, `ARCHITECTURE.md`), `kebab-case` for nested docs.

### 4.2. Code Identifiers
- **Classes**: `PascalCase` (e.g., `AuditLogger`).
- **Interfaces/Types**: `PascalCase` (e.g., `UserAttributes`).
- **Variables/Functions**: `camelCase` (e.g., `fetchUserData`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`).
- **Environment Variables**: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`).

### 4.3. Prompt IDs
Prompts defined in `prompts/` MUST follow the schema: `^[a-z0-9-]+\.[a-z0-9-]+@v[0-9]+$`
- Example: `domain.action@v1` (e.g., `code.review@v2`).

## 5. Architectural Invariants

1.  **Strict Separation**: `server/` code MUST NOT import from `client/` or `apps/`, and vice-versa. Shared code MUST reside in `packages/`.
2.  **Singleton Pattern**: Major services (e.g., `PrivacyService`, `BatchJobService`) MUST implement the Singleton pattern with a static `getInstance()` or exported instance, ensuring state consistency.
3.  **Type Safety**: All new code MUST be strictly typed (TypeScript). `any` is PROHIBITED unless strictly necessary for boundary interoperability.

## 6. Deprecation & Migration
- Legacy files that violate these standards (e.g., mixed naming styles) are permitted but MUST be marked for refactoring.
- New contributions MUST strictly adhere to this standard.
