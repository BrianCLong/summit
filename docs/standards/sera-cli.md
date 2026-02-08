# SERA CLI Proxy Standards

## Scope

This standard defines the Summit-native SERA CLI-style proxy integration and its interoperability
contract. The proxy exposes an OpenAI-compatible `/v1/chat/completions` endpoint and forwards to a
configured upstream SERA-compatible vLLM endpoint with optional model override and Bearer token
injection. The proxy is deny-by-default and requires explicit host allowlisting.

## Import / Export Matrix

| Interface | Direction | Description |
| --- | --- | --- |
| OpenAI-compatible chat completions | Import | vLLM/OpenAI-compatible upstream endpoint (`/v1/chat/completions`). |
| Summit SERA proxy | Export | Local proxy endpoint for Summit tooling or Claude Code. |

## Non-Goals

- Training or fine-tuning model weights.
- Bundling or redistributing SERA models.
- Implementing Claude Code internals.

## Behavioral Guardrails

- Deny-by-default host allowlist is required.
- Authorization headers are injected via `Bearer` tokens when configured.
- Non-SERA model overrides emit a warning and require explicit user validation.
- Evidence artifacts are deterministic and omit timestamps.
