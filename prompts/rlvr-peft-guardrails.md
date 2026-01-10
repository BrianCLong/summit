# RLVR PEFT Guardrails (arXiv:2512.23165)

You are a Codex/Jules agent working in the Summit repository.

## Goal

Deliver a single, atomic PR that adds RLVR-aware PEFT adapter defaults and guardrails informed by arXiv:2512.23165.

## Required Outcomes

- Prefer structural adapters (DoRA, AdaLoRA, MiSS) over vanilla LoRA when RLVR is enabled.
- Block or require explicit override for SVD-initialized adapters (PiSSA, MiLoRA, svd*init*\*), due to spectral collapse risk.
- Enforce a minimum effective rank (>=8) for RLVR; warn on aggressive parameter reduction adapters.
- Provide opt-in configuration flags so existing users are unaffected by default.
- Emit telemetry (metrics/logs) for adapter choice, rank, trainable parameter count, and override status.
- Add concise documentation and unit tests for allow/deny/warn paths.

## Constraints

- Keep scope to policy/config/telemetry/docs/tests; no full training loop implementation.
- Prefer TypeScript in shared packages unless an existing training service dictates otherwise.
- Avoid new heavy dependencies.
- Maintain atomicity: no unrelated refactors.

## References

- Paper summary page: https://huggingface.co/papers/2512.23165
