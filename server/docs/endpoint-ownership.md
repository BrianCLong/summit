# Endpoint ownership & policy touchpoints

This map is derived from `server/src/app.ts` and the route modules it wires up. It highlights who owns the surface area and which policy/safety middleware guard each path. All routes inherit the global chain of `correlationIdMiddleware` → `safetyModeMiddleware` → `auditLogger` → `auditFirstMiddleware` → `httpCacheMiddleware` and the rate limiters defined in `app.ts`, unless noted otherwise.

| Endpoint | Owner (by route module) | Implementation | Policy / safety touchpoints |
| --- | --- | --- | --- |
| `POST /api/actions/preflight` | Security & Policy | `server/src/routes/actions.ts` | Auth (`ensureAuthenticated`), correlation IDs, OPA evaluation via `ActionPolicyService`, persisted to `policy_decisions_log`, obligations returned for dual-control. |
| `POST /api/actions/execute` | Security & Policy | `server/src/routes/actions.ts` | Auth, correlation IDs, enforces `preflight_id`, request-hash validation, obligation checks before executing downstream handlers. |
| `GET /api/actions/hash` | Security & Policy | `server/src/routes/actions.ts` | Auth, correlation IDs; exposes deterministic request-hash helper used by the execute guard. |
| `POST /graphql` | Graph Platform | `server/src/index.ts` / `app.ts` | Per-request rate limits, audit-first logging; OPA/ABAC middleware is available via `middleware/opa-enforcer.ts` for mutations. |
| `POST /api/ai/*` | AI Platform | `server/src/routes/ai.ts` | Auth, rate limits, audit-first logging; action-level checks through `requirePermission` in the route. |
| `POST /api/maestro/*` | Automation / Maestro | `server/src/routes/maestro_routes.ts` and `routes/maestro.ts` | Auth, rate limits, audit-first logging; uses Maestro’s internal guardrails plus optional approval workflows (`routes/approvals.ts`). |
| `POST /api/osint/*` | OSINT | `server/src/routes/osint.ts` | Auth, rate limits, audit-first logging; inherits tenant & correlation context. |
| `POST /api/edge/*` | Edge Ops | `server/src/routes/edge-ops.ts` | Auth, rate limits, audit-first logging; inherits tenant & correlation context. |

Notes:
- Dual-control eligibility is encoded in `server/policies/actions.rego`, which marks `DELETE_*`, `EXPORT_*`, `ROTATE_KEYS`, and `CHANGE_POLICY` operations as hazardous and requires two distinct approvers.
- The policy decision store for action preflights is `policy_decisions_log`, written through `ActionPolicyService`. Downstream services can re-use the stored `decisionId` and `requestHash` for execution-time verification.
