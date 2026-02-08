# Repo Assumptions & Reality Check

## 1. Monorepo Structure (Verified)
- **Root:** Contains `package.json`, `pnpm-workspace.yaml`, `fixtures/`, `docs/`, `scripts/`.
- **Packages:** Extensive use of `packages/*` for modular functionality (e.g., `packages/disinformation-detection`, `packages/agent-identification`).
- **Server:** A dedicated `server/` directory exists, likely the monolith backend.
- **Evidence Schemas:** Located in `evidence/schemas/`.
- **CI Workflows:** Located in `.github/workflows/`.

## 2. Path Mapping for New Features
Based on the existing structure, the new "CogWar" capabilities will be implemented as follows:

| Planned Capability | Target Path | Rationale |
| :--- | :--- | :--- |
| **Detectors & Core Logic** | `packages/cogwar/src/` | Follows the granular package pattern (e.g., `packages/influence-detection`). Keeping it isolated avoids monolithic bloat in `server/`. |
| **JSON Schemas** | `evidence/schemas/cogwar-*.schema.json` | Central registry for evidence schemas is `evidence/schemas/`. |
| **Fixtures** | `fixtures/cogwar/*.jsonl` | Root `fixtures/` directory exists and is the standard location. |
| **Documentation** | `docs/standards/`, `docs/ops/runbooks/` | Matches existing documentation structure. |
| **CI Workflows** | `.github/workflows/cogwar-ci.yml` | Additive workflow to avoid modifying complex shared workflows like `ci-core.yml`. |

## 3. Verified CI Checks (for Gating)
The following checks are present in `.github/workflows/` and will be respected/utilized:
- `ci-core.yml`: Likely runs basic lint/test/build.
- `ci-security.yml`: Handles security scans.
- `evidence-check.yml`: Verifies evidence schemas.
- `governance-gate.yml`: Enforces governance policies.
- `schema-compatibility-check.yml`: Ensures schema backward compatibility.

## 4. "Must-Not-Touch" Files
- `pnpm-lock.yaml` (unless adding dependencies via pnpm).
- Existing shared schemas in `evidence/schemas/` (unless strictly necessary for bug fixes).
- `ci-core.yml` (unless absolutely required; prefer additive workflows).
- `server/src/**` (avoid modifying core monolithic logic unless integrating the new package).

## 5. Validation Checklist Status
- [x] `ls -la .github/workflows`: Confirmed existence of core and security workflows.
- [x] `cat package.json pnpm-workspace.yaml`: Confirmed pnpm workspace structure.
- [x] Locate "evidence" directory: Confirmed `evidence/schemas/`.
- [x] Confirm pipeline locations: Confirmed `packages/` as the module home.

## 6. Deviation from User Prompt
- User suggested `src/cogwar`. I am deviating to `packages/cogwar/src` to align with the monorepo structure.
- User suggested modifying `ci-verify.yml`. I will create `.github/workflows/cogwar-ci.yml` instead to ensure safe, additive changes.

