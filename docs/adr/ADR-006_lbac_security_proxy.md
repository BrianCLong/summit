# ADR-006: LBAC via API-Level Security Proxy for Neo4j

- **Status:** Proposed
- **Date:** 2025-12-05
- **Owner:** Security / Backend Team

## 1. Context

Summit uses Neo4j Community Edition as the primary IntelGraph store. Neo4j CE does **not** provide:

- Row-level security (RLS).
- Label-/attribute-based access control (LBAC) at the database engine level.

At the same time, Summit is positioning toward:

- Multi-user environments.
- Potential IC / enterprise deployments.
- Scenarios where only certain analysts may see specific entities/edges.

We must prevent:

- Direct client access to Neo4j.
- Bypassing authorization via custom Cypher.
- Accidental leakage of sensitive nodes/edges.

## 2. Decision

We will implement LBAC **in the API/gateway layer** with the following principles:

1. **No raw Cypher from clients**
   - All graph access must go through server-side resolvers and service methods.

2. **SecurityContext on every request**
   - Each request carries a `SecurityContext` containing:
     - `userId`
     - `clearance` (int, 0–9)
     - `compartments` (string[], e.g., `["SIGINT"]`)

3. **Graph security wrapper**
   - We introduce a `SecureGraph` abstraction around the Neo4j driver that:
     - Accepts a builder function to produce the core Cypher + params.
     - Wraps the Cypher in a subquery and applies a consistent `WHERE` clause:
       - `node.clearance <= userClearance`
       - And (when applicable) `node.compartments` intersect with `userCompartments`.

4. **GraphQL/REST use SecureGraph exclusively**
   - All resolvers and handlers must use `SecureGraph` for reads and writes.
   - Direct `session.run(...)` calls will be considered a security violation.

## 3. Rationale

- **Pragmatic**  
  This allows us to keep using Neo4j CE while enforcing clearance and compartment checks.

- **Consistent**  
  Centralizing security logic in one abstraction reduces “ad-hoc” access control scattered across resolvers.

- **Evolvable**  
  If/when we move to Neo4j Enterprise or another graph engine with LBAC, we can keep the `SecureGraph` API and adapt its internals.

## 4. Implications

### 4.1 On schema

- All nodes and edges must have:
  - `clearance: int` (0–9)
  - Optional `compartments: string[]`
- Migration scripts must:
  - Backfill default values (e.g., clearance 0, empty compartments) for existing data.

### 4.2 On code

- Introduce a `SecurityContext` type and inject it into:
  - GraphQL context.
  - REST handlers.
- Introduce a `SecureGraph` class/module wrapping the Neo4j driver.
- Refactor existing code:
  - Replace `session.run()` calls with `secureGraph.runRead()` / `runWrite()` methods.

### 4.3 On performance

- Each query will be wrapped in an outer call that applies filters; this adds some overhead.
- Good query planning and indexing (e.g., on `clearance`, `compartments`) will be important.
- The impact is acceptable given the security requirements.

## 5. Alternatives Considered

1. **Neo4j Enterprise LBAC**
   - Pros: native engine support, fine-grained access control.
   - Cons: licensing costs, not a short-term move for the project.
   - We may still move here later; this ADR keeps that path open.

2. **Multiple graph instances per tenant/security level**
   - Pros: very strong isolation.
   - Cons: operational complexity, data duplication, cross-tenant analytics become harder.

3. **No LBAC / app-level coarse RBAC only**
   - Too risky for the target market; would block serious deployments.

## 6. Rollout Plan

- Phase 1:
  - Define `SecurityContext` struct and `SecureGraph` interface.
  - Implement wrapper and apply to a subset of queries.
- Phase 2:
  - Refactor all resolvers and handlers to use `SecureGraph`.
  - Migrate schema to include `clearance` and `compartments`.
- Phase 3:
  - Add tests for access control (>= 1 per major resolver).
  - Add automated checks to prevent direct `session.run()` usage in CI (lint rule or grep-based gate).

## 7. Open Questions

- How do we set `clearance` and `compartments` on data from different sources by default?
- Do we need a separate policy mechanism for _writes_ (who can create/modify which nodes/edges)?
- How does this interact with future multi-tenant deployments (org-level vs user-level security)?
