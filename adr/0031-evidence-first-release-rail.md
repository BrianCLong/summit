# ADR-0031: Evidence-First Release Rail

## Status
Accepted

## Context
The Summit platform requires a repeatable, policy-gated, and auditable delivery path. Previous deployment processes lacked automated provenance tracking and standardized supply chain security artifacts.

## Decision
We are implementing the "Evidence-First Release Rail" which consists of:
1. **API Versioning**: Standardizing on `/v1` namespace for core intelligence APIs.
2. **Provenance Headers**: Including `provenance_ref` in all high-traffic API responses, linked to OpenTelemetry trace IDs.
3. **Automated Supply Chain**: Mandatory generation of CycloneDX SBOMs and artifact signing (via `cosign`) in the build pipeline.
4. **Policy-as-Code**: Enforcing baseline security and governance rules using Open Policy Agent (OPA) before merge and deployment.

## Consequences
- All new API endpoints must be added to the `/v1` router.
- Responses must maintain compatibility with the new `provenance_ref` field.
- CI/CD will block on SBOM generation failures or policy violations.
- Developer workflow includes mandatory preflight checks to ensure deterministic environments.
