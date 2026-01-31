# Qwen3-ASR Scaffold Prompt (v1)

## Objective
Scaffold a deny-by-default ASR integration for Qwen3-ASR 0.6B with clean-room interfaces,
redaction guardrails, and deterministic evidence output while preserving Summit readiness.

## Requirements
- Add `asr/` module interfaces and a stub provider gated by `SUMMIT_ASR_ENABLED`.
- Provide CLI and eval runner gated by `ASR_CLI_ENABLED` and `EVAL_ASR_RUNNER`.
- Add redaction utilities and tests to prevent logging sensitive payloads.
- Update required checks discovery documentation from branch protection rules.
- Record decision entry and update roadmap status.
- Add third-party notice for Qwen3-ASR.

## Constraints
- No upstream code reuse (clean-room implementation only).
- No dependency additions.
- Default execution paths remain disabled.
- Evidence outputs must be deterministic (timestamps only in `stamp.json`).
