# ADR-002: LBAC via Security Proxy

**Status:** Proposed / Sprint 1 target

## Context

To safely expose graph capabilities, every request must honor clearance and compartment constraints. A security proxy at the API layer can consistently enforce policy without changing client contracts while preparing for future fine-grained controls.

## Decisions

- Route all graph access through a dedicated **security proxy** in the API layer; direct driver access is banned and linted out.
- Introduce `clearance` (0–9) and `compartments` (string[]) attributes on graph nodes and edges with migrations and backfill scripts to encode access requirements.
- Enforce clearance and compartment filters on every query via a request-scoped `SecurityContext` that injects predicates into generated Cypher/GraphQL resolvers.
- Add **deny-by-default** behavior for missing context and ensure exports additionally check `export_allowed` flags plus compartment overlap.
- Emit **audit logs** for allow/deny decisions, including attempted bypass patterns (e.g., alternative query shapes), and attach request correlation IDs.

## Status Justification

- Implementation is scheduled for Sprint 1 with early prototypes available for security testing before week 4.

## Consequences

- Centralizes enforcement, auditability, and future enhancements (e.g., per-tenant policies) without rewriting clients.
- Requires schema migrations and request-scoped security context to be in place before expanding exposure; legacy direct driver calls must be refactored or blocked.
- Audit artifacts become sufficient for incident response, export control attestations, and regression detection of policy gaps.
