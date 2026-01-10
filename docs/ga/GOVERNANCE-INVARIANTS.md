# Governance Invariants & Enforcement Map

This document defines the non-negotiable invariants for the Summit/IntelGraph repository. These rules are machine-enforced by CI.

## 1. Security

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **No Secrets in Code** | `gitleaks` scan on every commit | `[SEC-001] Secret Detected` |
| **Dependencies Pinned** | `package.json` analysis (no `^` or `~` for prod deps) | `[SEC-002] Loose Dependency` |
| **No Vulnerable Packages** | `trivy` / `npm audit` | `[SEC-003] Vulnerability Found` |
| **Container signatures** | `cosign` verification of base images | `[SEC-004] Unsigned Base Image` |

## 2. AuthN / AuthZ

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **No Implicit Public Routes** | Static analysis of route definitions. Must have `@public` or `ensureAuthenticated`. | `[AUTH-001] Unprotected Route` |
| **Mutations Require Auth** | GraphQL AST analysis. Mutation resolvers must use `authMiddleware` or equivalent. | `[AUTH-002] Unprotected Mutation` |
| **Tenant Isolation** | DB queries in multi-tenant contexts must include `tenantId` in where clause (Rego/AST). | `[AUTH-003] Missing Tenant Clause` |

## 3. Demo Mode

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **No Real PII in Demo** | Data scan of `demo/` or `seed/` directories. | `[DEMO-001] PII in Demo Data` |
| **No External Calls** | Network sandboxing or mock enforcement in demo profiles. | `[DEMO-002] External Call in Demo` |

## 4. Data Classification

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Schema PII Tagging** | GraphQL/DB schema linting. Fields like `email`, `phone` must have `@pii` directive. | `[DATA-001] Untagged PII Field` |
| **Data Flow Check** | Taint analysis (future) / Static check for PII logging. | `[DATA-002] PII Logging Detected` |

## 5. Observability

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Metrics on New Services** | Check for `metrics.ts` or `Prometheus` instantiation in new service directories. | `[OBS-001] Missing Metrics` |
| **Alert Rules Present** | If a new service is added, `alert-rules.yaml` must be updated. | `[OBS-002] Missing Alert Rules` |

## 6. Provenance

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Traceability** | All PRs must be linked to an Issue/Ticket. | `[PROV-001] Unlinked Change` |
| **Author Identity** | Commits must be signed (GPG/SSH). | `[PROV-002] Unsigned Commit` |
| **Change Reason** | PR description must not be empty. | `[PROV-003] Empty Description` |

## 7. Rate Limiting

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Limits Defined** | New public endpoints must have an entry in `rate-limits.yaml` or middleware config. | `[RATE-001] Unlimited Endpoint` |

## 8. Agent Boundaries

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Zone Containment** | Agents must not modify files outside their assigned scope (via `agent-rules.yaml`). | `[AGENT-001] Zone Violation` |
| **Config Protection** | Agents cannot modify root `tsconfig.json`, `package.json` without `human-override`. | `[AGENT-002] Protected File Modification` |

## 9. Legacy Mode

| Invariant | Enforcement Mechanism | CI Signal |
| :--- | :--- | :--- |
| **Strict Boundaries** | No imports from `src/legacy` into `src/core`. | `[LEG-001] Legacy Leak` |
| **Deprecation** | No new code added to `src/legacy` (only bug fixes). | `[LEG-002] New Legacy Code` |
