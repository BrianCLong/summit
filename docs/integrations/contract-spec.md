# Integration & Extension Contracts

**Status:** Draft
**Version:** 1.0
**Owner:** Ecosystem Team

## Goal

To enable safe, scalable ecosystem growth by formalizing the contracts between Summit and external integrations (partners, community agents, customer systems). Contracts must be explicit, versioned, and testable.

## Contract Types

### 1. API Contracts

- **Definition:** OpenAPI (Swagger) Specification v3.1.
- **Guarantee:** Semantic Versioning (SemVer). No breaking changes within a major version.
- **Validation:** Contract tests run against the specification on every build.
- **Location:** `api/spec/v1/openapi.yaml`.

### 2. Webhook Contracts

- **Definition:** JSON Schema for event payloads.
- **Guarantee:** At-least-once delivery, retry policy, signature verification (HMAC).
- **Events:** `run.completed`, `alert.triggered`, `evidence.collected`.
- **Location:** `api/webhooks/schemas/`.

### 3. Agent Extension Points

- **Definition:** TypeScript Interfaces / Protocol Buffers for agent-to-core communication.
- **Scope:** Tools, Memory Providers, Reasoners.
- **Guarantee:** Stability of the `AgentContext` and `ToolRegistry` interfaces.
- **Location:** `packages/agent-sdk/src/types.ts`.

## Deprecation Policy

1.  **Notice Period:** Minimum 6 months notice for breaking changes (deprecation of a major version).
2.  **Communication:** Deprecation notices published in:
    - Release notes.
    - `X-API-Deprecation` header in API responses.
    - Developer newsletter.
3.  **Support:** N-1 major version supported for critical security patches.

## Compatibility Guarantees

- **Forward Compatibility:** Clients built against version `N` should not crash when talking to server version `N+1` (additive changes only).
- **Backward Compatibility:** Server version `N` must accept requests valid in version `N-1` (unless deprecated).

## Contract Testing Strategy

- **Consumer-Driven Contracts (Pact):** Use Pact to verify that changes to the provider (Summit) do not break consumers.
- **Schema Validation:** All API responses are validated against the OpenAPI schema in CI.
- **Breaking Change Detection:** `openapi-diff` (or similar tool) runs in CI to detect unintentional breaking changes.

## Development Workflow

1.  **Design:** Propose schema change in a PR.
2.  **Review:** API Governance review required.
3.  **Implement:** Update code to match schema.
4.  **Verify:** CI runs contract tests.
5.  **Publish:** On merge, publish new schema and SDKs.
