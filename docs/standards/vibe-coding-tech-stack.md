# Vibe Stack Manifest (Summit)

## Purpose

Pin tool choices so agents stop thrashing and deliver deterministic outputs that align with the
Summit Readiness Assertion and governance gates. This document maps the KDnuggets "Vibe Coding"
stack guidance into Summit conventions without claiming any unverified platform dependencies.

## Authority & Alignment

- **Primary authority**: `docs/SUMMIT_READINESS_ASSERTION.md`
- **Governance**: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- **GA guardrails**: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`

## Definitions

- **Vibe Stack Manifest**: A repo-local, allowlisted manifest that constrains tools and workflows
  to reduce agent variance.
- **Deterministic artifacts**: Evidence outputs that avoid timestamps or nondeterministic ordering.

## Required Manifest Fields

When implemented, the manifest MUST include:

- `schemaVersion`
- `stack.ui`
- `stack.api`
- `stack.data`
- `stack.auth`
- `stack.observability`
- `stack.testing`
- `stack.deployment`
- `allowlist.tools`
- `constraints.determinism`
- `constraints.security`

## Allowed Stack Knobs (Summit-aligned)

- **UI framework**: Summit UI stack as defined in repo (do not assume Next.js unless verified).
- **Testing ladder**: unit → component → e2e with deterministic evidence output.
- **Observability**: metrics, logs, traces with never-log safeguards.

## Deterministic Artifacts (Required)

All validation and drift checks MUST emit the following files with stable ordering and **no wall
clock timestamps**:

- `artifacts/vibe-stack/report.json`
- `artifacts/vibe-stack/metrics.json`
- `artifacts/vibe-stack/stamp.json` (git SHA + schema versions only)

## Scaffold & Gates (Design Constraint)

- **Scaffold**: deterministic feature skeletons with feature flags default **OFF**.
- **Evidence IDs**: required template per feature.
- **Policy stubs**: default tests for tenant isolation and entitlements as placeholders for
  policy-as-code gates.

## Design Constraints From Source Item

- **Stack pinning** reduces agent variance and choice overload.
- **Server-side mutation vs. route handling** remains a separation of concerns; Summit should
  enforce the boundary with tooling and templates rather than ad hoc patterns.
- **RLS/deny-by-default** remains the baseline for any multi-tenant policy surfaces.
- **Webhook idempotency** is mandatory for billing or entitlements.

## Summit Mapping

| ITEM principle | Summit convention |
| --- | --- |
| Pin stack choices | Manifest allowlist + drift detector |
| Server Actions / Route Handlers split | Enforce action/endpoint boundaries in scaffolds |
| RLS early | Policy tests + deny-by-default contracts |
| Webhook idempotency | Processed event ID store + tests |
| Toolchain ladder | Unit/component/e2e + observability checks |

## How to Add Tools

1. Update the manifest allowlist.
2. Add deterministic validation tests.
3. Document data handling impacts.
4. Record rollout plan and rollback triggers.

## Evidence-First Output

Every enforcement step must output raw evidence artifacts before narrative summaries. Evidence is
mandatory for policy review and CI gating.
