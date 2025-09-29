# ADR-0002: Attribute-Based Access Control Gateway with Step-Up Authentication

## Status

Accepted

## Context

Legacy role-based enforcement in the Summit authz-gateway lacked centralized attribute aggregation, fine-grained tenant/data residency controls, and step-up assurances for sensitive operations. Distributed policies without test coverage risk regressions, and contextual attributes sourced from the IdP, organizational systems, and data catalogs routinely drift.

## Decision

We will extend the existing `services/authz-gateway` into the control point for attribute-based decisions backed by Open Policy Agent (OPA) bundles and WebAuthn-backed step-up flows.

Key elements:

- **Attribute service**: build an in-memory, read-only cache that hydrates subject attributes from IdP directory exports, organizational entitlements, and resource tag catalogs. TTL and explicit invalidation endpoints mitigate attribute drift. Service exposes REST `/subject/:id/attributes`.
- **Policy-as-code**: codify tenant isolation, residency, and least-privilege rules as Rego (`policy/abac/`). Bundle metadata ships with signed manifest. Tests live alongside policy to prevent regressions.
- **Decision API**: `/authorize` composes subject attributes, protected action metadata, and resource tags before evaluating OPA. Responses return `allow/deny`, reason, and obligations for downstream enforcement.
- **Step-up middleware**: introduce WebAuthn-style challenge/response (`/auth/webauthn/*`) that issues elevated ACR JWTs. Middleware inspects OPA obligations and enforces replay-protected challenges via nonce cache.
- **Client SDKs**: provide Go and TypeScript helpers to normalize decision requests and parse obligations (`isAllowed`).
- **Operational guardrails**: dashboards, alert routes, synthetics, and evidence artifacts ensure the new path lands production ready.

## Consequences

- Gateway owns attribute hydration and policy evaluation, simplifying dependent services.
- We must maintain data files (`src/data/*.json`) that describe IdP schema, classifications, and protected actions.
- CI now depends on `opa test policy/abac` runs; failure blocks merges until policy coverage restored.
- Step-up introduces stateful challenge cache; memory footprint must be monitored and TTL tuned as scale grows.
- Consumers adopt SDKs and follow obligations to trigger WebAuthn flows.
