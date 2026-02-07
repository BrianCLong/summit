# Summit Architecture Brief (companyOS v1 foundation)

## What Summit is
Summit/IntelGraph is an intelligence analysis platform that unifies ingestion, enrichment, graph analytics, and evidence-backed outcomes. It is designed to operate under governance-first constraints where every action is policy-evaluated, evidence-captured, and attributable to an org/tenant boundary. The platform uses **companyOS** as the authoritative tenant/org layer and delegates enforcement to Switchboard and Maestro while IntelGraph preserves provenance. This posture aligns to the Summit Readiness Assertion as the baseline governance anchor.

## Who it is for
Summit is built for security, intelligence, and operations teams who require deterministic governance, auditability, and strict tenant separation while operating high-throughput analytics and orchestration workflows.

## Module boundaries (authoritative layer ownership)
- **companyOS**: Source of truth for orgs, accounts, roles, entitlements, budgets, and policies.
- **Summit core**: Product workflows that consume companyOS facts and emit evidence to IntelGraph.
- **Switchboard**: Runtime flow/tool execution; enforces companyOS policy decisions.
- **Maestro**: Job scheduling/execution; enforces companyOS run policy decisions.
- **IntelGraph**: Provenance and evidence storage; schema contracts for events.
- **Edge/Gateway**: External ingress, auth, and session boundaries.

## End-to-end data flow (governed)
1. **Ingress**: Edge/Gateway authenticates and attaches org/actor context.
2. **Policy gate**: Switchboard/Maestro consult companyOS to allow/deny flow/job/tool execution.
3. **Execution**: Approved actions execute in Summit core services.
4. **Evidence emission**: All policy decisions and workflow steps emit deterministic evidence artifacts.
5. **Provenance storage**: IntelGraph stores evidence index + artifacts for audit and replay.

## v1.0 acceptance criteria (foundation lane)
- **Single source of truth** for orgs, roles, entitlements, budgets, and policies via companyOS.
- **Deny-by-default** enforcement in Switchboard and Maestro when companyOS policy denies.
- **Deterministic evidence artifacts** with timestamps only in `stamp.json`.
- **Golden path bootstrap** via compose stack for a seeded first org.

## Assumptions (intentionally constrained)
- Summit core, IntelGraph, Maestro, and Switchboard may be co-located today but are treated as separate modules for boundary contracts.
- Graph/relational stores exist but are optional per deployment profile.

## Validation steps (deferred pending repo confirmation)
- Identify actual flow/job entrypoints for Switchboard/Maestro to anchor enforcement hooks.
- Confirm IntelGraph evidence ingestion schemas and align contracts accordingly.
- Validate compose/helm service topology against actual service boundaries.

## MAESTRO threat model alignment
- **MAESTRO layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats considered**: Cross-tenant access, tool misuse, policy bypass, evidence tampering.
- **Mitigations**: Required org context for all actions, deny-by-default policy, deterministic evidence artifacts, policy enforcement at runtime boundaries.
