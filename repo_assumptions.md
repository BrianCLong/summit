# Repo Assumptions & Reality Check

## Path Mappings
| Plan Path | Repo Path | Status | Action |
|-----------|-----------|--------|--------|
| `packages/agents/{jules,codex,observer}/` | `packages/agents/` (Does not exist) | Missing | **CREATE** directory and TS agents. |
| `packages/graphrag/` | `packages/graph-rag/` | Exists (hyphenated) | **USE** existing path. |
| `packages/companyos-sdk/` | `packages/maestro-sdk/` | Ambiguous | **ASSUME** Maestro SDK is the technical artifact; position via docs. |
| `.github/workflows/` | `.github/workflows/` | Exists | **MODIFY** `slsa-provenance.yml`. |
| `docs/product/companyos.md` | `docs/product/companyos.md` (Does not exist) | Missing | **CREATE** file. |

## CI Check Validation
* `slsa-provenance.yml`: Exists. Currently uses `SIGSTORE_KEY`. Needs update to keyless OIDC.

## Evidence Schema
* Evidence artifacts located in `evidence/`.
* `packages/graph-rag` contains `retrieval.cypher` and `context_assembly.ts`.

## Constraints
* `AGENTS.md`: Enforces "Strangler pattern: prefer new logic in `packages/` over `server/src/services/`".
* `AGENTS.md`: "Agent tasks must conform to `agents/task-spec.schema.json`".
* `AGENTS.md`: "Agents Cannot Self-Approve".
