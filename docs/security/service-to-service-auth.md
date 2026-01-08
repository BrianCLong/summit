# Service-to-Service Authentication (Phase 1)

## Objectives

- Move away from network-based trust or ad-hoc tokens toward explicit, auditable service identities.
- Provide a consistent credential format that works across gateways, batch jobs, and background services.
- Prepare for future mTLS rollout without blocking near-term hardening.

## Identity Model

- **Service principal**: stable, lowercase identifier such as `api-gateway`, `authz-gateway`, `decision-api`, `maestro`, `intelgraph-jobs`.
- **Claims** carried in service credentials:
  - `sub`: service principal (caller identity).
  - `aud`: intended target service.
  - `scp`: optional array of scopes (e.g., `auth:introspect`, `abac:decide`, `decision:write`).
  - `exp`/`iat`: issued/expiry timestamps; tokens are short-lived.
- **Trust anchor**: shared HMAC secret (`SERVICE_AUTH_SHARED_SECRET`) with rotation version marker (`SERVICE_AUTH_KEY_ID`). Future phase will replace with per-service keys and mTLS.

## Mechanism

- **Credential format**: HMAC-signed JWT (HS256) carried in `X-Service-Token` header. Alternate header `X-Service-JWT` accepted for backward compatibility.
- **Issuance**: services mint short-lived tokens (default 5 minutes) using the shared secret and set `aud` to the target. Key ID (`kid`) added to enable rotation.
- **Verification**: receivers verify signature, audience, expiry, and ensure `sub` is in their allowlist. Scoped authorization uses `scp` claims.
- **Renewal**: callers should re-mint tokens per request or at least every 5 minutes; caches must respect `exp`.

## Authentication Matrix (Phase 1)

| Caller → Target                                      | Requirement                              | Scopes                           |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| `api-gateway` → `authz-gateway` (introspection/ABAC) | X-Service-Token with `aud=authz-gateway` | `auth:introspect`, `abac:decide` |
| `maestro` → `authz-gateway` (policy checks)          | X-Service-Token with `aud=authz-gateway` | `abac:decide`                    |
| `intelgraph-jobs` → `decision-api`                   | X-Service-Token with `aud=decision-api`  | `decision:write`                 |

> Phase 1 intentionally focuses on the highest-value control points (authorization and decision provenance). Additional services (LLM orchestration, graph analytics) will be onboarded in Phase 2 once key rotation tooling is finalized.

## Validation & Logging

- Requests missing or failing service authentication return `401`/`403` with structured log entries containing `service_aud`, `service_sub`, and `service_error`.
- Successful validations annotate the request context with `servicePrincipal` for downstream policy decisions.

## Rotation & Secrets Management

- **Secret source**: `SERVICE_AUTH_SHARED_SECRET` and optional `SERVICE_AUTH_KEY_ID` (defaults: development-only values).
- **Rotation**: introduce new secret value and key ID; deploy issuers first, then verifiers with dual-acceptance if needed. Tokens carry `kid` for auditability, even though HS256 uses a single shared key in this phase.
- **Storage**: secrets must be injected via environment/secret manager; never committed to the repository.

## Future Work (Phase 2+)

- Move to asymmetric keys per service with JWKS publication and kid-based verification.
- Enforce mTLS between gateways and core APIs.
- Introduce centralized token issuer with revocation lists and service enrollment workflow.
- Expand coverage to LLM/IntelGraph data services and background orchestrators.
