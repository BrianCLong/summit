# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
|---|---|---|---|
| `src/agents` | `src/agents` | ✅ Exists | |
| `src/ui` | `src/ui` | ✅ Exists | |
| `src/graphrag` | `src/graphrag` | ⚠️ Created | Created for CIG/PIE logic |
| `src/connectors` | `src/connectors` | ⚠️ Created | Created for TruthScan/Blackbird plugins |
| `src/api` | `src/api` | ⚠️ Created | Created for CIS routes |

## CI Gates

* `make smoke`
* `pnpm test`
* `pnpm test:unit`
* `pnpm test:integration`

## Evidence Schema Conventions

* Deterministic JSON
* No timestamps in content (use metadata/stamps)
* SHA256 hashing

## Must-not-touch Files

* `AGENTS.md` (except to read)
* `package.json` (unless necessary for deps)
