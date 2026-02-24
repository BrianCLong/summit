# Qwen3-ASR 0.6B Integration Scaffold

This scaffold aligns with the Summit Readiness Assertion and records a governed, deny-by-default
path for ASR integration while preserving current release readiness. It is intentionally
constrained pending fixture-backed evals and governance sign-off.

## Scope

- Clean-room ASR interface, provider stub, and CLI wiring.
- Evidence runner that emits deterministic artifacts (timestamps only in `stamp.json`).
- Security redaction gate to prevent logging audio/context payloads.

## Enablement Flags

All capability is disabled by default and requires explicit opt-in:

- `SUMMIT_ASR_ENABLED=1` to allow provider execution.
- `ASR_CLI_ENABLED=1` to use the CLI wrapper.
- `EVAL_ASR_RUNNER=1` to run the evidence runner.

## Evidence Artifacts

The eval runner writes:

- `report.json`
- `metrics.json`
- `stamp.json`
- `index.json`

Only `stamp.json` includes timestamps.

## Data Handling Defaults

- Audio and transcript inputs are sensitive by default.
- The redaction gate masks `audio` and `context` fields in logs.
- Evidence artifacts store metadata only (no raw audio payloads).

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection via contextual ASR inputs, sensitive data leakage via
  logs, and tool abuse through enablement flags.
- **Mitigations:** deny-by-default flags, redaction of sensitive fields, and deterministic evidence
  outputs to support auditability.

## Roadmap Notes

- Streaming/vLLM backends remain intentionally constrained.
- Timestamp alignment and context policies remain gated behind additional approvals.
