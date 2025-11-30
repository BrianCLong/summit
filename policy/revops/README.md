# RevOps Policy Bundle

This bundle packages the lead routing, discount approval, and contract activation policies so they can be versioned, shipped, and simulated consistently across tenants.

## Layout

```
policy/
  revops/
    bundle.yaml                 # bundle manifest
    schemas/                    # JSON Schemas for inputs/decisions
      input/
      decision/
    rego/                       # policy code grouped by capability
    tests/                      # Rego tests plus JSON fixtures
      fixtures/
    harness/                    # CLI/API simulation scenarios
```

Key modules:

- **segments.rego** – centralized SMB/Mid/Enterprise classification.
- **tenant_overrides.rego** – tenant-specific overrides applied before evaluation.
- **invariants.rego** – non-negotiable guardrails tenants cannot bypass.
- **lead_routing.rego**, **discount_approvals.rego**, **contract_activation.rego** – capability-specific decisions built on shared config and guardrails.

## Schemas

Input and decision schemas live under `schemas/`. They are validated in CI to ensure simulation clients and the Switchboard UI have stable contracts.

## Simulation harness

The harness uses HCL and JSONL scenarios to drive consistent simulations from the CLI, CI, or the Policy Simulation UI. Each JSONL record links a scenario ID, tenant, input payload, and expected decision assertions for golden coverage.

## Tenant configuration

Per-tenant configuration is sourced from `config/tenants/<tenant-id>/revops/*.yaml`, converted to JSON at bundle build time, and exposed to Rego as `data.revops.config.tenant[<id>]`. Global limits (e.g., `global_max_discount`) live under `data.revops.limits`.

## Promotion flow

1. Author policy or tenant config changes.
2. Validate JSON Schemas, run `opa test`, and execute harness simulations.
3. Build the bundle (see `bundle.yaml`) and deploy to staging.
4. Run recorded scenarios, diff decisions, and generate change reports.
5. Promote the bundle with traceable `policy_bundle_version` metadata on every decision.

## Simulation API

`POST /policy/revops/simulate` accepts a policy `type`, `tenant_id`, and the appropriate schema-validated `input`, and returns the decision along with `policy_bundle_version`, `evaluation_trace_id`, and a list of fired rules for debugging.
