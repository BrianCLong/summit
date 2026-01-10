# ADR-014: WeDLM as a Local Inference Option via HTTP Gateway

**Status:** Proposed
**Date:** 2025-12-30
**Author:** Summit AI Engineering

## Context

Summit relies on local inference engines to reduce latency and cost for agentic workloads. Tencent's WeDLM claims faster generation via diffusion-based decoding while maintaining causal attention and KV-cache compatibility. The official distribution ships as a Docker image with Python entrypoints but no native Summit integration. We need a path to experiment without altering core LLM routing.

## Decision

Treat WeDLM as an external **Inference Gateway** that Summit can call over HTTP. Build a thin adapter around the WeDLM engine that exposes an OpenAI ChatCompletions–compatible surface, then point Summit's existing OpenAI-compatible provider to that endpoint via configuration. No core runtime changes are required in this phase.

## Consequences

- **Positive:**
  - Enables controlled benchmarking of WeDLM without modifying production code paths.
  - Reuses Summit's existing OpenAI-compatible plumbing for retries, tracing, and safety filters.
  - Keeps the WeDLM engine isolated for upgrades or rollback.
- **Negative:**
  - Adds an extra network hop versus in-process calls.
  - Requires a small wrapper service to translate requests/responses and expose metrics.
- **Risks:**
  - Performance claims depend on GPU/FlashAttention availability; may underperform on some hosts.
  - Need to validate determinism and cache semantics under diffusion decoding.
  - Web demo lacks safety filters; wrapper must enforce Summit guardrails before exposure.

## Alternatives Considered

- **Direct integration into Summit runtime:** Rejected for now to preserve atomic PR scope and avoid coupling to Summit release cadence.
- **Using the Hugging Face Transformers path only:** Rejected because it does not exercise the optimized diffusion engine and would not demonstrate the claimed speedups.
- **Fully managed hosted endpoint:** Not chosen because the goal is a local fast-path option with controllable cost and data residency.

## Future Work (recommended)

1. Prototype an HTTP wrapper that proxies to the WeDLM container and emits observability fields: latency, time-to-first-token, tokens generated, model ID, GPU type, diffusion-step count.
2. Extend Summit's OpenAI-compatible provider configuration to target the wrapper; validate with smoke prompts and agent workflows.
3. Add safety middleware (prompt/response filters, logging redaction) and autoscaling policies if promoted beyond experimentation.
4. Capture performance baselines (TTFT, tokens/sec) versus existing local engines to inform go/no-go.
