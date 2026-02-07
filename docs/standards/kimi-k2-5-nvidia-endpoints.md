# Kimi K2.5 on NVIDIA Integrate Endpoints (Summit Standard)

## Purpose
Define the Summit standard for integrating the NVIDIA-hosted Kimi K2.5 endpoint, including request
construction, tool compatibility, streaming behavior, feature flags, and governance constraints.

## Authority
This standard aligns with:

- docs/SUMMIT_READINESS_ASSERTION.md
- docs/governance/CONSTITUTION.md
- docs/governance/META_GOVERNANCE.md
- docs/governance/AGENT_MANDATES.md

## Grounding (External)
NVIDIA Developer Blog: "Build with Kimi K2.5 Multimodal VLM Using NVIDIA GPU-Accelerated Endpoints"
(Feb 04, 2026).

## Scope
- NVIDIA Integrate chat-completions endpoint usage.
- Kimi K2.5 model ID, thinking toggle, and OpenAI-compatible tools parameter.
- Summit-side governance: feature flags, allowlist, and redaction.

Non-goals:
- Self-hosted vLLM automation (document pointer only).
- Fine-tuning pipelines (document pointer only).

## API Contract Summary
- Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
- Authorization: Bearer $NVIDIA_API_KEY
- Model ID: moonshotai/kimi-k2.5
- Optional: chat_template_kwargs.thinking (boolean)
- Optional: tools[] (OpenAI-compatible tool schema)

## Feature Flags (Default Off)
- FEATURE_NVIDIA_INTEGRATE=0
- FEATURE_KIMI_THINKING=0
- FEATURE_NVIDIA_MULTIMODAL=0

## Outbound Egress Policy
- Deny by default.
- Allowlist host: integrate.api.nvidia.com
- Requests must fail closed when allowlist or NVIDIA_INTEGRATE_API_ALLOW is not set.

## Message Mapping
### Summit -> NVIDIA
- Text-only messages are the minimal supported payload.
- Image/video parts are deferred pending Summit message-part schema verification.
- When enabled, image/video content MUST be encoded via Summit-approved message-part encoding and
  validated against evidence budgeting constraints.

### NVIDIA -> Summit
- Streaming chunks are normalized into Summit stream events.
- Tool calls are mapped into Summit action events with explicit tool allowlists.

## Tool Compatibility
- The tools[] parameter is passed through using an OpenAI-compatible schema.
- Summit validates tool definitions before dispatch to prevent prompt/tool injection.
- Tool-call responses are parsed deterministically and mapped to internal action events.

## Determinism and Evidence
- Streaming parsing must be deterministic and order-preserving.
- Artifacts must be emitted without timestamps:
  - artifacts/nvidia-kimi-k2_5/metrics.json
  - artifacts/nvidia-kimi-k2_5/report.json
  - artifacts/nvidia-kimi-k2_5/stamp.json

## Monitoring and Budgets
- Latency budget: p95 <= 6s (configurable, measure before enforcement).
- Token usage must be recorded per request (aggregated only).
- Budget limits are enforced via configuration gates.

## Pointers
- vLLM recipe: documented in NVIDIA’s reference material.
- NeMo fine-tuning: NVIDIA NeMo Framework + NeMo AutoModel on HF checkpoints.

## Compliance Notes
- Never log Authorization headers, raw prompts, or raw image/video bytes.
- See docs/security/data-handling/kimi-k2-5-nvidia-endpoints.md.
