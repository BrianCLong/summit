# Summit Architecture Brief (companyOS v1 foundation)

## Present assertion
Summit is an intelligence analysis platform that unifies collection, entity resolution, graph analytics, and governed AI/automation for mission teams. This brief asserts the current v1 foundation lane to promote **companyOS** as the authoritative tenant/org layer and mandates evidence-first enforcement across runtime control planes. The Summit Readiness Assertion is the baseline authority and is referenced before any gate discussion or rollout planning.

## Intended users
- **Mission operators** who need deterministic, governed workflows for collection → enrichment → evidence → analysis.
- **Governance/security owners** who require deny-by-default controls, audit trails, and evidence bundles for every enforcement decision.
- **Platform engineers** who need clear module boundaries and typed contracts to scale services safely.

## Module boundaries (v1 scope)
- **companyOS**: source of truth for orgs, roles, entitlements, budgets, and policy decisions.
- **Summit core**: workflow orchestration and UI/UX that consumes companyOS facts and enforces policy gates.
- **Switchboard**: flow/tool execution plane that must consult companyOS before any action.
- **Maestro**: job scheduler/executor that must consult companyOS before any job run.
- **IntelGraph**: provenance and evidence storage, deterministic schema contracts for enforcement decisions.
- **Edge/Gateway**: entrypoint for auth, routing, and tenant selection.

## End-to-end data flow (governed, deny-by-default)
1. **Edge** authenticates and identifies `orgId` and `actorId`.
2. **Summit core** requests org facts and policies from **companyOS**.
3. **Switchboard/Maestro** call policy evaluation for each flow/tool/job action.
4. **companyOS** returns a deterministic decision (allow/deny + policy IDs).
5. **IntelGraph** records evidence artifacts (`report.json`, `metrics.json`, `stamp.json`, `index.json`).
6. **Summit UI** surfaces outcomes and evidence trails.

## v1.0 acceptance criteria
- A single authoritative source for orgs, roles, entitlements, budgets, and policies (companyOS).
- Switchboard and Maestro refuse runs/flows/tools when companyOS policy denies.
- Every enforcement decision emits deterministic evidence artifacts with timestamps confined to `stamp.json`.
- A golden-path workflow runs locally via compose with a seeded first org.

## MAESTRO threat-model alignment
- **MAESTRO layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats considered**: cross-tenant access, tool misuse, budget bypass, prompt/tool drift, evidence tampering.
- **Mitigations**: orgId required in all policy contexts; deny-by-default policy checks; budget caps enforced via token estimates; versioned prompts/tools (deferred pending Lane 2); deterministic evidence artifacts with index mapping.

## Assumptions and validation steps
- **ASSUMPTION**: IntelGraph, Maestro, and Switchboard may be separate services even if co-located.
  - **Validation step**: confirm service boundaries and entrypoints in current repo map and runtime configs.
- **ASSUMPTION**: Neo4j/Postgres/Redis/Qdrant are available per deployment profile.
  - **Validation step**: confirm compose/helm service dependencies and environment contracts.
- **ASSUMPTION**: Policy enforcement will be kill-switched by `COMPANYOS_ENFORCE` in v1.
  - **Validation step**: confirm env wiring and default-off behavior in policy integration points.

## Next actions (dictated)
- Freeze interface contracts for companyOS policy context and decisions.
- Enforce deny-by-default at Switchboard and Maestro entrypoints.
- Emit evidence bundles for all policy decisions to IntelGraph.
- Keep the golden path green; compress feedback loops via deterministic CI gates.
