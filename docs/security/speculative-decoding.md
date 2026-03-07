# Security Posture: Speculative Decoding

## Threat Model

- **T1: Silent quality regressions** from misconfigured speculative routing.
- **T2: Sensitive data leakage** through logging prompts/completions/target features.
- **T3: Supply-chain drift** from ungoverned speculative backend dependencies.
- **T4: Unsafe enablement** without evidence thresholds.

## Controls

- Deny-by-default parser (`enabled=false` baseline).
- Tenant allowlist required for request-level access.
- Evidence ID + acceptance/speed thresholds required when enabled.
- CI gate `verify/speculative-off-by-default` blocks unsafe configuration drift.

## Never-Log Fields

- Raw prompts
- Raw completions
- Target feature payloads
- Per-token probabilities

## Operational Guardrail

Use global kill switch: `SUMMIT_SPECULATIVE_ENABLED=false`.
