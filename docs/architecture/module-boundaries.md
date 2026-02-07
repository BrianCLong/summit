# Module Boundaries: companyOS ↔ Summit Core ↔ IntelGraph ↔ Maestro ↔ Switchboard ↔ Edge

This document defines the authoritative boundary contracts for the companyOS-first tenancy layer. It asserts the present and dictates the future; it does not defend legacy behavior. Governance authority and evidence custody are explicit and enforced by default.

## Boundary Contract Table

| Boundary | Contract Artifact | Writes Allowed | Governance Home | Enforcement Home | Provenance Home |
| --- | --- | --- | --- | --- | --- |
| companyOS ↔ Summit Core | `docs/api/companyos.contract.md` + TS interfaces | companyOS → Summit (facts) | companyOS | Switchboard/Maestro | IntelGraph |
| Summit ↔ IntelGraph | `docs/api/intelgraph.contract.md` + evidence schemas | Summit → IntelGraph (evidence/events) | companyOS (policy) | N/A | IntelGraph |
| Summit ↔ Maestro | `docs/api/maestro.contract.md` | Maestro → IntelGraph (run logs), Maestro ↔ Switchboard | companyOS (run policy) | Maestro | IntelGraph |
| Summit ↔ Switchboard | `docs/api/switchboard.contract.md` | Switchboard executes tools/flows | companyOS (flow policy) | Switchboard | IntelGraph |
| Edge ↔ Summit Core | `docs/api/edge.contract.md` (to be authored) | Edge → Summit (auth + org context) | companyOS | Edge | IntelGraph |

## Write Direction Rules
- **companyOS is source-of-truth** for orgs, roles, entitlements, budgets, and policies.
- **Summit Core is a policy consumer**; it does not mint org facts.
- **Switchboard and Maestro are enforcement points**; they do not override policy.
- **IntelGraph is evidence custody**; all enforcement decisions are recorded there.

## Evidence and Determinism Rules
- Evidence artifacts are deterministic: no timestamps outside `stamp.json`.
- Decision IDs are deterministic hashes of policy inputs.
- Evidence index is the canonical export list for audit and compliance.

## Assumptions and Validation Plan
- **Assumption (Deferred pending validation)**: Contract artifacts exist or will be created in `docs/api/` as specified.
- **Assumption (Deferred pending validation)**: Edge can consistently inject `orgId` and actor context at ingress.
- **Validation Plan**: Identify actual entrypoints in runtime services, align contract files and enforcement hooks, and confirm evidence index ingestion in IntelGraph.

## Finality
This boundary map is the authoritative v1 foundation. Any exceptions must be governed, recorded, and aligned with the Summit Readiness Assertion and governance constitution.
