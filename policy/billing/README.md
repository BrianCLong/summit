# Billing & FinOps Policy Bundle

This bundle governs price plans, invoices, credits, and cost-model changes so that anything affecting revenue or COGS follows the same policy + provenance model used by Security and RevOps. The bundle ships with schemas, Rego policies, fixtures, and tests to keep billing actions auditable.

## Contents

- `bundle.yaml`: bundle metadata with entrypoints and schema wiring.
- `schemas/`: JSON Schemas for inputs and decision outputs per billing action.
- `rego/`: policy logic for price plan changes, invoice actions, credits/discounts, cost model changes, and shared invariants.
- `tests/`: OPA unit tests with fixtures that mirror real billing actions and guardrails.

## Domains covered

1. **Price plans and commercial terms** — guardrails for SKU/tier changes and tenant-specific overrides.
2. **Invoice lifecycle** — generate, send, mark paid, cancel/void, adjust, and write-offs.
3. **Credits and discounts** — approvals and limits on credits, adjustments, and discounts.
4. **Cost model safety** — multi-approval and evidence requirements for COGS model changes.

## Usage

Run the bundle tests from the repo root:

```bash
opa test policy/billing/rego policy/billing/tests
```

Policy decisions return `allowed`, a `reason`, `required_approvals`, and `flags` that downstream workflows can surface inside Switchboard workspaces and evidence bundles.
