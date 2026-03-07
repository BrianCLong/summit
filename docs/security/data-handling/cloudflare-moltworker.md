# Data Handling Standard: Sandboxed Agent Runtime + Edge Router (Cloudflare Moltworker Reference)

## Status

Experimental. Feature-flagged, default OFF.

## Readiness Assertion

This standard inherits governance from the Summit Readiness Assertion and policy mandates.

## Data Classification

- Evidence bundles: controlled internal data.
- Runtime state: controlled internal data with retention limits.
- Audit logs: controlled internal data with strict redaction.

## Never Log

- API keys, OAuth tokens, credentials.
- Raw user message text unless explicitly enabled in debug mode.
- Browser screenshots or HTML dumps without explicit consent and redaction.
- Object store keys containing user identifiers.

## Retention Defaults

- Evidence bundles: 30 days in CI artifacts (configurable in self-hosted deployments).
- Runtime state store: 7 days default TTL for experimental adapter.

## Storage Requirements

- Namespaced per run to prevent cross-tenant bleed.
- Encryption at rest if supported by backing object store.
- Access limited to the edge router and runtime policy principals.

## Access Controls

- Authn/authz enforced on all admin/runtime APIs.
- Deny-by-default for read/write operations unless explicitly allowed by policy.

## Evidence Handling

- Evidence bundles must be deterministic.
- No timestamps unless derived from stable build inputs.
- Schema validation required before artifact emission.

## Regulatory Logic

- All compliance decisions must be expressed as policy-as-code.
- Any requirement not expressible as policy-as-code is considered incomplete and blocks release.
