# Repo Assumptions & Reality Check

## Verified Facts
*   **Infrastructure**: Node.js 18+, pnpm, Docker Compose.
*   **Backend**: `server/` directory contains a Node.js/TypeScript application.
*   **Database**: Postgres (managed migrations) and Neo4j.
*   **Migrations**: Located in `server/db/managed-migrations/`. System expects `.up.sql` and `.down.sql` files.
*   **GraphQL**:
    *   Main schema definition: `server/src/graphql/schema.ts` (exports `typeDefs`).
    *   Resolvers aggregation: `server/src/graphql/resolvers/index.ts`.
    *   Directives: `authDirective.ts` implements `@scope` and `@auth`.
*   **Modules**: `server/src/modules/` is the location for domain modules.
*   **Testing**: Jest is used for testing (`server/__tests__`).

## CogOps Intake (PR-17701)
### Verified vs Assumed
| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Monorepo uses pnpm workspaces | Verified | `pnpm-workspace.yaml` | Package manager scope confirmed. |
| Makefile as task runner | Verified | `Makefile` | Golden path target exists. |
| Docs CI policies exist | Verified | `docs/ci/REQUIRED_CHECKS_POLICY.yml` | Required checks policy file present. |
| Schema directory for JSON artifacts | Verified | `schemas/` | Existing schema registry directory. |
| Governance sources of truth | Verified | `docs/governance/CONSTITUTION.md` + `docs/governance/META_GOVERNANCE.md` | Must align changes to these authorities. |
| Evidence bundle conventions | Verified | `docs/evidence/evidence-map.yml` + `docs/governance/evidence-required.json` | Evidence catalog present. |
| Summit Readiness Assertion | Verified | `docs/SUMMIT_READINESS_ASSERTION.md` | Required escalation reference. |
| CI standard reference | Verified | `docs/CI_STANDARDS.md` | PR validation source of truth. |
| Runtime language mix | Deferred pending verification | N/A | Confirm which modules own new `cogops` code paths. |
| Evidence bundle hashing rules | Deferred pending verification | N/A | Confirm deterministic hash/ID practices in existing evidence tooling. |
| Required checks enforcement mechanism | Deferred pending verification | N/A | Confirm if policy is enforced via workflow or branch protection sync. |

## CogOps Subsumption (PR-17704)
### Verified vs Assumed
| Item | Status | Evidence |
| --- | --- | --- |
| Workspace uses pnpm with Node 18+ | Verified | `package.json` lists `packageManager: pnpm@9.12.0` and Node engine `>=18.18`. |
| Primary schema registry lives under `schemas/` | Verified | `schemas/` contains evidence and governance schemas. |
| Evidence bundle artifacts use `report/metrics/stamp` JSON naming | Verified | `evidence/report.json`, `evidence/metrics.json`, `evidence/stamp.json`. |
| Required checks policy is governed under `docs/ci/REQUIRED_CHECKS_POLICY.yml` | Verified | File present under `docs/ci/`. |
| Roadmap status is tracked in `docs/roadmap/STATUS.json` | Verified | File is present and validated by `scripts/validate-roadmap-status.cjs`. |
| CogOps implementation module location | Deferred pending repo alignment | No in-repo `cogops` module currently defined. |

## Cognitive Ops (CogOps) (PR-17706)
### Verified
- Repository is a pnpm workspace (`pnpm-workspace.yaml` present).
- Schemas live in `schemas/` directory.
- Required checks policy file exists (`docs/ci/REQUIRED_CHECKS_POLICY.yml`).
- Evidence schemas exist (report/metrics/stamp).
- Primary docs tree is `docs/`.

## CogSec Radar (PR-17708)
### CogSec Verified
1.  **Required Checks Source**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` is authoritative for required checks.
2.  **Audit & RBAC Surfaces**: `audit/` and `rbac/` directories exist.
3.  **Docs Baselines**: `docs/security/CIS_CONTROLS_CHECKLIST.md` exists.

## NATO Cognitive Alerts (PR-17709)
### Verified
- MIT license present at repo root.
- Key top-level directories present: `alerting/`, `active-measures-module/`, `adversarial-misinfo-defense-platform/`, `api/`, `api-schemas/`, `apps/`, `RUNBOOKS/`, `SECURITY/`.

## Narrative Intelligence Subsumption (PR-17713)
### Verified (Local Inspection)
- `docs/security/` and `docs/ops/runbooks/` exist.
- Feature flags are documented under `docs/FEATURE_FLAGS.md`.
- Playwright configuration exists in the repo root (`playwright.config.ts`).

## Assumptions
*   The `server/db/managed-migrations` path is correctly configured.
*   The `MigrationManager` is robust enough to handle new tables.
*   The `@scope` directive is fully functional.

## "Do Not Touch" List
*   `.pnpm-store/`, `.qwen-cache/`, `.archive/`, `GOLDEN/datasets/`.
*   Existing migration files in `server/db/managed-migrations/`.
*   `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/*`, `docs/ga/*`.
*   `agent-contract.json`, `CODEOWNERS`, `THIRD_PARTY_NOTICES/`.
*   `.github/workflows/`: Do not edit existing workflows.
*   `docs/ci/REQUIRED_CHECKS_POLICY.*`: Update only with explicit gate requirements.
*   `schemas/evidence*`: Do not change shared evidence schemas without governance.
*   `scripts/ci/*`: Avoid modifying CI gate scripts.
*   `docs/governance/CONSTITUTION.md`: Governance authority.
*   `docs/governance/META_GOVERNANCE.md`: Governance authority.
*   `.github/branch-protection-rules.md`: Branch protection contract.

## Validation Plan
1. Confirm `cogops` target module location and ownership boundaries.
2. Confirm evidence ID format in existing schema/tooling to avoid conflict.
3. Map evidence ID conventions against `scripts/ci/verify_evidence_id_consistency.mjs`.
4. Align CogOps schema naming with `schemas/index_catalog.yaml`.
5. Confirm required checks enforcement path for new CI jobs.
