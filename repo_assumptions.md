# Repo Assumptions & Validation

## Verified vs Assumed Directory List

| Path | Status | Notes |
| --- | --- | --- |
| `.github/workflows/` | ✅ Verified | Present at repo root. |
| `docs/` | ✅ Verified | Present at repo root. |
| `scripts/` | ✅ Verified | Present at repo root. |
| `tests/` | ✅ Verified | Present at repo root. |
| `src/` | ✅ Verified | Present at repo root. |
| `server/` | ✅ Verified | Present at repo root. |
| `client/` | ✅ Verified | Present at repo root. |
| `packages/` | ✅ Verified | Present at repo root. |
| `docs/operations/` | Deferred pending validation | Validate before adding new trees. |
| `docs/governance/` | ✅ Verified | Present at repo root. |

## CI Check Names (Exact)

Deferred pending validation against `.github/workflows/*` and branch protection.

## Evidence Schema Conventions (Exact)

Deferred pending validation against `docs/governance/*` and `evidence/` schemas.

## Must-Not-Touch List (Guardrails)

Deferred pending validation. Baseline expectations:

- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`)
- Production compose files (`docker-compose*.yml`)
- Secrets or `.env` files

## Validation Checklist

1. Confirm Node version + package manager in `package.json` and workflows.
2. Confirm workflows and required checks in branch protection.
3. Confirm evidence/telemetry conventions (schemas, naming, and locations).
4. Confirm whether `docs/operations/` and `docs/governance/` already exist.
5. Confirm graph stores in configs (Neo4j/Qdrant/etc).
