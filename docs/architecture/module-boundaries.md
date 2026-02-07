# Module Boundaries (companyOS v1 foundation)

## Boundary contract table

| Boundary | Contract artifact | Writes allowed | Governance home | Enforcement home | Provenance home |
| --- | --- | ---: | --- | --- | --- |
| companyOS ↔ Summit core | `docs/api/companyos.contract.md` + TS interfaces | companyOS → Summit (facts) | companyOS | Switchboard/Maestro | IntelGraph |
| Summit ↔ IntelGraph | `docs/api/intelgraph.contract.md` + evidence schemas | Summit → IntelGraph (evidence/events) | companyOS (policy) | N/A | IntelGraph |
| Summit ↔ Maestro | `docs/api/maestro.contract.md` | Maestro → IntelGraph (run logs), Maestro ↔ Switchboard | companyOS (run policy) | Maestro | IntelGraph |
| Summit ↔ Switchboard | `docs/api/switchboard.contract.md` | Switchboard executes tools/flows | companyOS (flow policy) | Switchboard | IntelGraph |

## Write directions (authoritative ownership)
- **companyOS** is the source of truth for orgs, accounts, roles, entitlements, budgets, and policies.
- **Summit core** consumes companyOS facts, emits evidence events, and maintains product workflow state.
- **Switchboard** executes flows/tools and enforces policy decisions before runtime execution.
- **Maestro** schedules jobs and enforces run policy before execution.
- **IntelGraph** stores evidence/provenance and exposes schema contracts for evidence ingest.

## Evidence policy alignment
- All enforcement decisions must emit evidence artifacts and an index entry.
- Timestamps are restricted to `stamp.json` to preserve determinism.

## Assumptions (intentionally constrained)
- Service boundaries are treated as explicit contracts even if co-located.
- IntelGraph serves as the canonical evidence/provenance store for policy decisions.

## Validation steps (deferred pending repo confirmation)
- Confirm actual contract file locations and align naming to current docs layout.
- Verify flow/job entrypoints for Switchboard and Maestro for enforcement hooks.
