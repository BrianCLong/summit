# Risk & Incident Readiness

This document defines how Summit evaluates release risk and incident readiness. Tenant profiles
specialize these guardrails by applying policy overlays rather than modifying code.

The Summit Readiness Assertion is the authoritative readiness baseline and remains mandatory for
all profiles. Tenant overlays can only tighten or further constrain the baseline.

## Baseline Readiness

- Risk scoring relies on standardized thresholds and governance policy-as-code.
- Incident drills require evidence artifacts and structured rollbacks.
- GA readiness demands verified evidence packs before promotion.

## Tenant Profiles

Tenant profiles extend baseline readiness requirements with profile-specific thresholds and
expectations:

- **natsec_high_security**
  - Lower risk thresholds and stricter block conditions per channel.
  - Shorter RTO/RPO with more frequent drills.
  - Dual-control and compliance signoffs for GA promotion.

- **enterprise_f100**
  - Enhanced evidence and enterprise operations signoff.
  - Higher observability requirements and tighter stabilization windows.

- **newsroom_osint**
  - Public OSINT integrations and standard observability.
  - Faster stabilization window, with governance logs required for elevated risks.

## Execution Hooks

- Risk validation: `scripts/risk/validate_change_risk.mjs`
- GA cut planning: `scripts/release/plan_ga_cut.mjs`
- Incident drill harness: `scripts/ops/rollback_drill.js`

Resolved policies for each tenant profile live in `artifacts/tenants/` and should be used to
validate readiness prior to promotion or drill execution.
