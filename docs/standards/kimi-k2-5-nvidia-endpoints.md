# Kimi K2.5 on NVIDIA Integrate Endpoints (Standards)

## Status

**Intentionally constrained** to text-first support with optional tool calling until Summit
message-part encoding is validated for images and video.

## Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance Constitution: `docs/governance/CONSTITUTION.md`
- MAESTRO Threat Modeling: `docs/security/threat-modeling-framework.md`

## Scope

This standard defines how Summit integrates with NVIDIA-hosted Kimi K2.5 using the
GPU-accelerated chat-completions endpoint. It covers payload structure, tool calling
passthrough, and streaming response handling. It does not cover self-hosted vLLM or
fine-tuning workflows.

## Grounded Facts (Source: NVIDIA Developer Blog)

- Kimi K2.5 is an open multimodal VLM with text/image/video modalities and a MoE
  architecture.
- NVIDIA’s hosted endpoint uses OpenAI-style `chat/completions` payloads.
- The model identifier is `moonshotai/kimi-k2.5`.
- The API supports OpenAI-compatible tool calling via the `tools` parameter.
- A `chat_template_kwargs.thinking` flag is supported.

## Feature Flags (Default OFF)

- `FEATURE_NVIDIA_INTEGRATE=0`
- `FEATURE_KIMI_THINKING=0`

## Endpoint Contract

- **Base URL**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Authorization**: `Bearer $NVIDIA_API_KEY`
- **Model**: `moonshotai/kimi-k2.5`

### Required Request Fields

- `model`
- `messages`
- `stream` (for streaming usage)

### Optional Request Fields

- `chat_template_kwargs: { thinking: true }` (guarded by `FEATURE_KIMI_THINKING`)
- `tools` (OpenAI-compatible tool schema)

## Summit Message Mapping

- **Text**: Always supported.
- **Image/Video**: Deferred pending confirmation of Summit’s message-part encoding
  contract. Enable only when the schema is verified and feature-flagged.

## Tool Calling Rules

- Tool schemas must be validated against Summit’s internal allowlist before egress.
- Tool names must be deterministic and immutable in logs.
- Tool calls are passed through as OpenAI-compatible `tools`.

## Streaming Rules

- Streaming must be parsed into Summit’s stream event model.
- Streaming output must be deterministic for tests; no wall-clock timestamps.

## Observability & Budgets

- Record latency, token usage, and cost estimates in deterministic artifacts.
- Enforce concurrency and `max_tokens` caps upstream of the NVIDIA endpoint.

## MAESTRO Threat Modeling Summary

- **MAESTRO Layers**: Data, Tools, Observability, Security
- **Threats Considered**: prompt/tool injection, secret leakage, cost abuse
- **Mitigations**: tool allowlists, header redaction, budgets and limits

## References

- NVIDIA Developer Blog: “Build with Kimi K2.5 Multimodal VLM Using NVIDIA
  GPU-Accelerated Endpoints” (Feb 04, 2026)
