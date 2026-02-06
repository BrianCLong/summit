# Repo Assumptions — Evidence-First AI Governance

## Verified (from canonical map)

| Verified | Notes |
| --- | --- |
| CI workflows under `.github/workflows/` | Canonical map entry. |
| Helper scripts under `.github/scripts/` | Canonical map entry. |
| Policies under `.github/policies/` | Canonical map entry. |
| GA artifacts under `.github/MILESTONES/` | Canonical map entry. |
| Source roots: `src/api/*`, `src/agents/*`, `src/connectors/*`, `src/graphrag/*` | Canonical map entry. |
| Docs roots: `docs/architecture`, `docs/api`, `docs/security`, `docs/governance`, `docs/operations`, `docs/ga` | Canonical map entry. |

## Assumed (to validate before merge)

| Assumed | Validation target |
| --- | --- |
| Agent execution events emit in a single entrypoint | Locate emitters in `src/agents/**`. |
| Audit persistence datastore already present | Confirm Postgres/Neo4j/Redis/Qdrant usage. |
| Deterministic CI check naming for governance gates | Confirm workflows and check names. |
| Policy definitions live in OPA/YAML or policy engine | Confirm policy source-of-truth. |

## Must-not-touch (until verified)

| Path | Constraint |
| --- | --- |
| `.github/workflows/ci-*.yml` | Additive only; no edits. |
| `.github/policies/**` | Extend only; no rewrites. |
| `src/api/graphql/**` and `src/api/rest/**` | Additive only. |

## Validation checklist

- Locate agent execution entrypoints in `src/agents/**`.
- Identify logging facility and request IDs.
- Confirm policy source-of-truth and enforcement location.
