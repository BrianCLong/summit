# LLM Budget Model (Phase 1)

This document defines the initial budget policy model for governing LLM usage across scopes (global, environment, feature, tenant) and units (tokens, cost, request count).

## Budget scopes

| Scope       | Identifier                          | Example            | Notes                                                                          |
| ----------- | ----------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| Global      | `global`                            | Entire platform    | Applied to every request as a backstop.                                        |
| Environment | `dev`, `sandbox`, `staging`, `prod` | `sandbox`          | Caps traffic per deployment footprint.                                         |
| Feature     | Feature slug                        | `maestro_planning` | Allows per-workload throttles without blocking unrelated calls.                |
| Tenant      | Tenant slug (internal only)         | `tenant_acme`      | Never log raw tenant IDs externally; use redaction when emitting logs/metrics. |

Policies can be attached to any combination of scopes; evaluation walks all matching scopes and applies the strictest decision (HARD > SOFT > ALLOW).

## Budget units

Budgets can be expressed with one or more units:

- **Tokens**: Primary capacity unit; measured as total input + output tokens.
- **Estimated cost (USD)**: Uses the per-provider price sheet; can be projected before a call based on token estimates.
- **Request count**: Fallback guardrail when token estimates are unavailable.

## Rolling windows

Budgets are enforced per rolling window:

- **Daily**: 24-hour sliding window.
- **Weekly**: 7-day sliding window.
- **Monthly**: 30-day sliding window.

The budget engine prunes usage outside the active window and evaluates projected usage before executing a call.

## Policy examples

- **Sandbox environment daily cap**: `environment=sandbox`, `window=day`, `limit=$5` (hard). Blocks once projected daily cost exceeds $5.
- **Feature cap**: `feature=maestro_planning`, `window=day`, `limit=50k tokens` (soft). Warns and annotates responses when the daily threshold is crossed but still allows the call.
- **Global backstop**: `scope=global`, `window=day`, `limit=250k tokens / $50` (soft). Prevents runaway usage if feature- and env-level policies are permissive.
- **Tenant default**: `scope=tenant`, `window=week`, `limit=250k tokens` (hard). Applied to all tenants unless an override is explicitly configured.

## Overrides and upgrades

- **Config override**: Set `LLM_BUDGET_OVERRIDES` to a JSON array of budget policies (same shape as the default config). Overrides replace policies with the same `scope` + `id`.
- **Per-tenant upgrades**: Add an override entry for `scope=tenant` with a higher limit and a note in the change log. Example: `{ "scope": "tenant", "id": "tenant_acme", "window": "day", "mode": "hard", "limit": { "tokens": 120000 } }`.
- **Feature rollout toggles**: Temporarily lower feature caps during new launches; raise after observability confirms safe behavior.

## Logging and safety

- Logs and metrics must redact tenant identifiers (use opaque hashes/labels only).
- HARD_LIMIT decisions should return a safe, non-verbose envelope to callers.
- All limits default to conservative values; expansion requires an explicit override and audit note.
