# Policy Enforcement Map

This document summarizes the current policy enforcement surfaces and how they interact with OPA inputs/bundles. It is intended for contributors hardening ABAC/residency enforcement without touching unrelated layers.

## Enforcement entrypoints
- **`PolicyEnforcer.enforce(context)`** (`server/src/policy/enforcer.ts`)
  - Primary ABAC entrypoint; wraps evaluation in an OpenTelemetry span and emits Prometheus counters/histograms.
  - Performs Redis-backed decision caching via `buildCacheKey` (tenant/user/action/resource/purpose tuple).
  - On cache miss, delegates to `evaluatePolicy` (local logic today) and records provenance + security event.
  - Fail-closed on errors with an audit-required deny decision.
- **`PolicyEnforcer.requirePurpose(purpose, context)`**
  - Guard to block writes/ingest without the required purpose before invoking `enforce`.
- **`PolicyEnforcer.ensureQuerySelectorMinimization(context, maxExpansionRatio?)`**
  - Pre-check for selector expansion thresholds; emits `selector_expansion_violations_total` and falls back to `enforce` when within limits.
- **`ResidencyPolicyEnforcer.enforceResidencyPolicy(context, tenantContext)`** (`server/src/policy/residencyEnforcer.ts`)
  - Residency/export-specific entrypoint with OTEL span and detailed Prometheus metrics.
  - Uses Redis caching keyed by tenant/user/operation/region/targetRegion/purpose/export token flags.
  - Delegates to `evaluateResidencyPolicy` for allow/deny and emits provenance plus violation counters.
- **`checkResidency(meta)`** (`server/src/policy/opaClient.ts`)
  - Thin helper that posts to OPA path `maestro/residency` using `opaAllow`.
- **`Tenant policy simulation`** (`server/src/policy/tenantBundle.ts`)
  - `materializeProfile` + `simulate` functions shape tenant bundles and overlays for “what-if” evaluations.

## OPA bundle loading
- **`loadSignedPolicy(bundlePath, sigPath?)`** (`server/src/policy/loader.ts`)
  - Accepts a local bundle tarball path and optional `.sig`; rejects unsigned bundles unless `ALLOW_UNSIGNED_POLICY=true`.
  - Verifies signatures via `cosign verify-blob --signature <sig> <bundle>` and rejects empty bundles.
  - Returns `{ ok: true }` once the bundle is readable; caller is responsible for pushing to OPA via existing deployment tooling (no direct OPA upload in this module).

## OPA decision calls
- **`opaAllow(path, input)`** (`server/src/policy/opaClient.ts`)
  - POSTs `{ input }` to `${OPA_URL}/${path}` where `OPA_URL` defaults to `http://opa:8181/v1/data`.
  - Treats `result.allow` (or bare `result === true`) as allow; returns `{ allow, reason }`.
  - Honors `OPA_FAIL_OPEN=true` to allow on transport errors; otherwise fail-closed.
- **`opa` stub** (`server/src/policy/opa.ts`)
  - Placeholder client exposing `enforce(policy, data)` for local logging only (non-production).

## Input schemas (shaping policy data)
- **ABAC context (`PolicyContext` in `enforcer.ts`)**
  - Fields: `tenantId` (required), optional `userId`, `action` (`read|write|update|delete|ingest`), `resource`, `purpose`, `reasonForAccess`, `clientIP`, `userAgent`, `timestamp`, `queryMetadata` (selector counts).
  - Decisions (`PolicyDecision`): `allow`, optional `reason`, `requiredPurpose`, `redactionRules`, `auditRequired`, `ttlSeconds` (used for cache).
- **Residency context (`ResidencyPolicyContext` in `residencyEnforcer.ts`)**
  - Fields include `tenantId`, `userId`, `operation` (`read|write|export`), `purpose`, `region`, `targetRegion?`, classifications, export token metadata, resource info, and arbitrary metadata.
  - Decisions (`ResidencyPolicyDecision`): `allow`, `reason`, optional `conditions`, `auditRequired`, `denialReasons`, `requiresExportToken`, `allowedOperations`, `regionRestrictions`.
- **OPA input (`OpaInput` in `opaClient.ts`)**
  - `{ action, tenant?, user?: { id?, roles? }, meta?: { region?, residency? }, labels?: string[] }` used for generic OPA calls.
- **Tenant policy bundles (`tenantPolicyBundleSchema` in `tenantBundle.ts`)**
  - Structured as `{ tenantId, bundleId?, metadata, baseProfile { regoPackage, entrypoints[], guardrails, crossTenant, rules[] }, overlays[] }` with overlay selectors (environment/region/labels) and patch operations (`set|remove|append|merge`).
  - Simulation input schema (`policySimulationInputSchema`) requires `subjectTenantId`, `resourceTenantId`, `action`, optional `purpose`/`justification`.

## Decision points & caching
- **Cache layers**
  - ABAC: Redis prefix `policy_cache`, TTL defaults to 300s; key material includes tenant/user/action/resource/purpose.
  - Residency: Redis prefix `residency_cache`, TTL 300s; key adds region/targetRegion/export token flags.
- **Fail-safe behavior**
  - ABAC enforcement denies on runtime errors; residency enforcer logs violations and returns computed decision (fail-closed semantics in evaluation helper).
- **Provenance & auditing**
  - ABAC: `recordProvenance` pushes an in-memory log and emits `SecurityEvent` to audit bus.
  - Residency: `recordProvenance` emits metrics + structured record with export token and region info.

## How to trace a decision end-to-end
1. **Bundle verification**: `loadSignedPolicy` validates the tarball before publishing to OPA (external deployment step).
2. **Request handling**: caller constructs `PolicyContext` or `ResidencyPolicyContext` and calls the corresponding enforcer method.
3. **Cache check**: enforcer attempts Redis lookup using the derived cache key; histograms label cache hits.
4. **Evaluation**: on miss, `evaluatePolicy`/`evaluateResidencyPolicy` executes local logic (future: OPA via `opaAllow`/`checkResidency`).
5. **Decision emission**: provenance records + Prometheus counters/histograms updated; OTEL span annotated with decision and latency.
6. **Response**: caller receives `{ allow, reason?, ... }` along with any audit flags or TTL guidance for caching.
