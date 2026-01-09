# Summit Tenant Programs & Profiles Overview

Summit tenant profiles make customer posture explicit without code forks. Each profile defines
risk envelopes, GA readiness overlays, incident expectations, and deployment channels. Profiles
inherit the default Summit baseline and apply governed overlays to tighten controls where needed.

The Summit Readiness Assertion remains authoritative for GA posture; tenant profiles specialize how
that readiness is enforced for each customer segment. See `docs/SUMMIT_READINESS_ASSERTION.md` for
the canonical readiness baseline.

## What a Tenant Profile Is

A tenant profile is a machine-readable configuration bundle that binds:

- Risk envelopes and change thresholds.
- GA readiness requirements and signoff criteria.
- Incident readiness expectations (drill cadence, RTO/RPO, rollback SLOs).
- Approved integrations and observability depth.
- Deployment channel defaults (e.g., preview, staging, prod, airgapped).

Profiles are resolved via tenant policy overlays in `policies/tenants/` and can be validated or
applied using tenant-aware scripts in `scripts/`.

## Ready vs Experimental

- **Ready** profiles are approved for customer rollout and have defined governance overlays.
- **Experimental** profiles are suitable for pilot deployments with explicit governance review.

## Profile Map

| Profile                | Risk level | Archetype                           | Key differences from default                                                                           |
| ---------------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `natsec_high_security` | Highest    | National security / classified-like | Stricter risk thresholds, dual-control signoff, exhaustive observability, airgapped-first deployments. |
| `enterprise_f100`      | High       | Fortune 100 enterprise              | Enhanced evidence requirements, privacy review, higher observability, enterprise signoffs.             |
| `newsroom_osint`       | Medium     | Newsroom OSINT                      | Faster stabilization window, public OSINT integrations, standard observability.                        |

## Relationship to GA, Risk, and Incident Policies

Tenant profiles only specialize existing governance systems; they do not bypass them. Risk scoring,
GA cut planning, and incident drills remain governed by the same policy-as-code artifacts, with
profile-specific overlays applied during resolution.

## Source of Truth

- Tenant catalog: `configs/tenants/TENANT_PROFILES.yaml`
- Policy overlays: `policies/tenants/*.yml`
- Resolved artifacts: `artifacts/tenants/RESOLVED_POLICIES_<profile>.json`
