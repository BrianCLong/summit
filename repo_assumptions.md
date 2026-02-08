# Repo Assumptions & Validation (CogWar MWS)

## Verified vs Assumed Paths / Modules / Checks

### ✅ Verified (observed in-repo)

| Area | Verified Path / Name | Evidence |
| --- | --- | --- |
| CI workflows | `.github/workflows/*` includes `pr-quality-gate.yml`, `ci-core.yml`, `ci-security.yml`, `ci-pr.yml`, `ci.yml`, and many additional gates | `.github/workflows/` directory listing | 
| Workspace root | `package.json` defines `intelgraph-platform` scripts and Node/Pnpm versions | `package.json` | 
| Pnpm workspace | `pnpm-workspace.yaml` defines workspaces including `apps/*`, `packages/*`, `services/*`, `client`, `server`, `cli` | `pnpm-workspace.yaml` |
| Evidence schemas | `schemas/evidence_*.schema.json`, `schemas/evidence/*.schema.json`, and `schemas/cogwar/campaign.v1.schema.json` | `schemas/` + evidence ID search | 
| Evidence artifacts | `report.json`, `metrics.json`, `stamp.json` patterns are enforced in multiple standards and examples | `docs/standards/*`, `docs/evidence/*`, `examples/cogwar/*` |
| Examples | `examples/cogwar/ru-ua/*.campaign.json` exists | `examples/cogwar/ru-ua/` |

### ❓ Deferred (pending targeted verification)

| Area | Planned / Assumed | Status |
| --- | --- | --- |
| Required status checks | Exact GitHub branch protection required checks | **Deferred pending branch protection policy export** |
| Evidence bundle schema location | Canonical evidence bundle schema for new CogWar artifacts | **Deferred pending evidence contract decision** |
| Primary CogWar implementation path | Whether `src/cogwar/` is the canonical module path | **Deferred pending maintainers’ module boundary decision** |

## Must-Not-Touch Files / Areas (verified via CODEOWNERS)

Use human-owner review for any changes to the following ownership-controlled areas:

- `/policy/`, `/opa/`, `/server/src/middleware/auth.ts`, `/server/src/lib/permissions/` (policy owners)
- `/security/`, `/server/src/provenance/`, `/server/src/security/` (security owners)
- `/server/src/db/`, `/migrations/`, `/schema/` (data owners)
- `/server/src/agents/`, `/server/src/services/`, `/tools/ultra-agent/`, `/agents/` (platform core)
- `/client/`, `/apps/web/`, `/conductor-ui/` (frontend owners)
- `/services/*` specific service owners (see `CODEOWNERS` for exact scopes)

## Validation Checklist (executed)

1. ✅ Listed `.github/workflows/` to confirm workflow names.
2. ✅ Read `package.json` and `pnpm-workspace.yaml` to confirm workspace layout and scripts.
3. ✅ Searched for evidence artifacts/schema patterns (`evidence_id`, `report.json`, `stamp.json`).
4. ✅ Confirmed primary pipeline code locations via workspace config and top-level directories (`apps/`, `packages/`, `services/`, `client/`, `server/`, `cli`).

## Notes for CogWar MWS alignment

- Evidence artifacts must remain deterministic: `report.json` and `metrics.json` should exclude unstable timestamps; `stamp.json` is the approved metadata container.
- Existing CogWar schemas and example campaigns are already present under `schemas/cogwar/` and `examples/cogwar/`, indicating a precedent for CogWar-specific schema evolution.

