# Summit Customer Programs & Tenant Profiles (Jules)

## Mission

Define and wire first-class tenant profiles so Summit can be configured and governed per customer
segment without forking the codebase. Focus on configuration, governance overlays, deployment
profiles, and runbooks. Default behavior must remain aligned with the generic Summit baseline.

## Hard Constraints

- No net-new product features; only configuration, governance, documentation, and light scripting.
- Tighten or specialize guardrails; never weaken security, GA, or incident requirements.
- Use a single codebase; all differences live in config, policy, or deployment overlays.
- Default tenant profile approximates current generic Summit behavior.

## Required Deliverables

1. Machine-readable catalog of tenant profiles and overlays.
2. Tenant-aware policy resolution and risk/GA/incident wiring.
3. Deployment compose overlays and Make targets.
4. Tenant onboarding and profile-change runbooks.
5. Updated GA/risk/incident readiness documentation.
6. Sample resolved policy artifacts for at least two profiles.

## Files and Surfaces

- configs/tenants/TENANT_PROFILES.yaml
- policies/tenants/\*.yml
- scripts/tenants/resolve_policies.mjs
- scripts/risk/validate_change_risk.mjs
- scripts/release/plan_ga_cut.mjs
- scripts/ops/rollback_drill.js
- compose/tenants/docker-compose.\*.yml
- Makefile
- docs/tenants/TENANT_PROGRAMS_OVERVIEW.md
- docs/releases/RISK_AND_INCIDENT_READINESS.md
- GA readiness docs
- RUNBOOKS/TENANT_ONBOARDING.md
- RUNBOOKS/TENANT_PROFILE_CHANGE.md
- artifacts/tenants/RESOLVED*POLICIES*\*.json
- docs/roadmap/STATUS.json

## Governance References

- docs/SUMMIT_READINESS_ASSERTION.md
- docs/ga/\*
- docs/governance/\*
- agent-contract.json
