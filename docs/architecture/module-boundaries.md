# Module Boundaries (companyOS v1 foundation)

## Present assertion
Boundaries are authoritative and enforce deny-by-default controls. All runtime modules consume companyOS facts and policy decisions; IntelGraph is the provenance and evidence home. This document references the Summit Readiness Assertion as the precondition for rollout sequencing.

## Boundary contract table

| Boundary | Contract artifact | Writes allowed | Governance home | Enforcement home | Provenance home |
| --- | --- | --- | --- | --- | --- |
| companyOS ↔ Summit core | `docs/api/companyos.contract.md` + TS interfaces | companyOS → Summit (facts) | companyOS | Switchboard/Maestro | IntelGraph |
| Summit ↔ IntelGraph | `docs/api/intelgraph.contract.md` + evidence schemas | Summit → IntelGraph (evidence/events) | companyOS (policy) | N/A | IntelGraph |
| Summit ↔ Maestro | `docs/api/maestro.contract.md` | Maestro → IntelGraph (run logs), Maestro ↔ Switchboard | companyOS (run policy) | Maestro | IntelGraph |
| Summit ↔ Switchboard | `docs/api/switchboard.contract.md` | Switchboard executes tools/flows | companyOS (flow policy) | Switchboard | IntelGraph |

## Read/write discipline
- **companyOS is the only source of truth** for orgs, roles, entitlements, budgets, and policies.
- **Summit core is read-only** for companyOS facts and policies; it must never mutate org/tenant facts.
- **Switchboard and Maestro are enforcement planes** that must refuse execution when companyOS policy denies.
- **IntelGraph is write-only for evidence** from Summit runtime modules; evidence is deterministic and indexed.

## Determinism and evidence rules
- Decision IDs are deterministic hashes that exclude time.
- Timestamps are restricted to `stamp.json` evidence artifacts.
- Evidence bundles must include `report.json`, `metrics.json`, `stamp.json`, and `index.json`.

## Assumptions and validation steps
- **ASSUMPTION**: Boundary contracts live in `docs/api` and are referenced by runtime code.
  - **Validation step**: verify contract file paths and align to actual service modules.
- **ASSUMPTION**: companyOS policy enforcement is kill-switched in v1.
  - **Validation step**: confirm `COMPANYOS_ENFORCE` gating in Switchboard and Maestro entrypoints.

## Governance alignment
- The Living Rulebook and Meta-Governance framework govern compliance mapping and evidence handling.
- All enforcement decisions are documented as evidence artifacts and routed to IntelGraph.
- Exceptions are logged as governed exceptions; no bypasses are permitted.
