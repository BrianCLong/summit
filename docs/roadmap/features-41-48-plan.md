# Enterprise Feature Bundle 41–48 Implementation Plan

## Overview

This document outlines a cohesive implementation strategy for features 41–48. Each initiative remains modular and feature-flagged to ensure clean mergeability and tenant-by-tenant enablement.

## 41) SSO via SAML/OIDC

- **Scope:** Backend-only, pluggable provider abstraction supporting SAML 2.0 and OIDC.
- **Key endpoints:** `POST /tenants/:id/sso`, `GET /auth/sso/:tenantId/login`, callback handler.
- **Data:** Tenant SSO config with IdP metadata, signing certs/keys, ACS/redirect URIs, group-to-role mapping rules (safe defaults map to least-privilege viewer role).
- **Flows:** Auth request -> IdP -> callback -> assertion/token validation -> session issuance with secure/httpOnly cookies; fall back to non-SSO tenants unchanged.
- **Safety:** Reject unsigned/expired assertions, enforce audience/ACS URLs, replay protection via nonce/state, clock skew limits; logout clears sessions.
- **Testing:** Mock IdP assertions/tokens, role mapping matrix, session persistence/expiry regression.

## 42) SCIM 2.0 Provisioning

- **Scope:** `/scim/v2/Users` and `/scim/v2/Groups` with create/update/patch/delete + idempotency and tenant scoping.
- **Data:** Immutable external IDs, soft-delete flags, audit trail, rate limiting.
- **Behaviors:** Idempotent PUT/PATCH via externalId + ETag; deprovision immediately revokes access and sessions; emit audit events.
- **Testing:** SCIM conformance-like fixtures including PATCH ops; replay/idempotency checks; tenant isolation.

## 43) Delegated Admin + Org Hierarchy

- **Scope:** Org -> teams -> memberships with delegated admin controls and scoped roles.
- **Endpoints:** `POST/GET/PATCH /orgs`, `/teams`, `/memberships`; role assignment validation; legacy roles mapped forward via compatibility layer.
- **Enforcement:** RBAC/ABAC hooks applied to 2–3 existing endpoints; no escalation without org-admin.
- **Testing:** Permission matrix, tenant isolation, cross-tenant access denial.

## 44) Compliance Report Generator

- **Scope:** `POST /compliance/report` to build SOC2-style evidence pack.
- **Content:** Hash-chained audit log slices, access review snapshots, config snapshots (SSO, retention, encryption), verification metadata; secrets redacted.
- **Behavior:** Deterministic ordering; manifest verification; export bundle with tamper-evident metadata.
- **Testing:** Golden report fixtures, redaction tests, determinism check.

## 45) DLP Rules Engine for Exports & Shares

- **Scope:** Backend export/share pipeline only; pattern-based detection (SSN, passport, etc.) producing block/quarantine/redact actions.
- **Controls:** Policy overrides restricted to tenant admins; integrates with disclosure packet builder; audit trail for all actions.
- **Testing:** Fixtures triggering each action; deterministic redaction results; override guardrails.

## 46) Data Residency & Region Pinning

- **Scope:** Tenant-level `region` attribute enforced by storage adapters and middleware.
- **Behavior:** Region-aware storage interface; fails-closed reads/writes outside region; clear error codes; migration defaults and operational docs.
- **Testing:** Cross-region access failure, correct-region success, tenant isolation.

## 47) Model Evaluation Harness for NLQ/ER

- **Scope:** Tooling-only harness with `pnpm eval:nlq` and `pnpm eval:er` commands; offline fixtures; deterministic metrics (accuracy, safety violations, latency/cost estimates where applicable).
- **CI:** Gate on regressions beyond thresholds; easy fixture add path.
- **Testing:** Harness unit tests; deterministic seeds and metric outputs.

## 48) Share Links with Expiry & Watermarking

- **Scope:** `POST /shares` to create signed links with expiry, optional password, view-only scope, watermarking metadata (viewer + timestamp).
- **Behavior:** Revocation and expiry checks; access logs once per view; no open redirects; rate limited; tamper-evident auditing.
- **Testing:** Expiry and revocation, watermark metadata presence, single access log per view.

## Cross-Cutting Architecture

- **Feature flags:** One flag per initiative; default off for safety; tenant-level toggles stored alongside config.
- **Isolation:** Dedicated modules/services with bounded contexts to avoid cross-cutting refactors; shared contracts via versioned interfaces.
- **Security/Compliance:** Strong audit events for all state changes; secrets isolated; cookie/session hardening; region-aware storage defaults to deny.
- **Observability:** Emit traces/metrics for SSO auth flows, SCIM operations, DLP decisions, report generation latency, share-link access counts.

## Forward-Looking Enhancements

- Introduce policy-as-code (OPA/Rego) bundles for DLP and delegated admin enforcement to tighten verification and improve portability.
- Add structured verifiable credentials (VCs) for compliance reports to enable cryptographic attestation across tenants and regions.
- Explore WebAuthn-compatible step-up auth after SSO to protect high-value operations (exports, share generation).
