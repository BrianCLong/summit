# WeDLM Evaluation Note

## What is WeDLM?

- **Model class:** Tencent's WeDLM (Weighted Diffusion Language Model) is a diffusion-based language model that reconstructs target tokens through iterative denoising while using **standard causal attention**. The architecture maintains KV-cache compatibility, enabling reuse of cached keys/values across steps similar to autoregressive (AR) models.
- **Parallel mask recovery:** WeDLM performs multi-step refinement over masked tokens, recovering multiple positions in parallel and reducing sequential dependence compared to AR decoding. The approach is optimized for short diffusion schedules while preserving causal ordering guarantees.
- **Reference assets:** Source implementation and Docker image are published at [github.com/Tencent/WeDLM](https://github.com/Tencent/WeDLM). Model weights (e.g., `tencent/WeDLM-8B-Instruct`) are hosted on Hugging Face with example scripts for Python CLI and a minimal web demo.

## Why it matters for Summit

- **Latency and throughput:** The diffusion-decoding path targets lower wall-clock latency versus vLLM-optimized AR baselines by denoising multiple tokens per iteration under causal attention. This could reduce **time-to-first-token (TTFT)** and improve **tokens/sec** for agentic workloads with frequent short replies.
- **Cost efficiency:** Faster generation at the same GPU footprint could lower serving cost for on-prem/local deployments where GPU-hours dominate. If cache re-use works as advertised, batching dynamics may mirror existing KV-cache heuristics.
- **Local engine option:** Summit's "local inference engines" currently emphasize AR backends. WeDLM provides a drop-in contender for fast local inference without changing higher-level agent orchestration, provided an adapter exposes an OpenAI-compatible surface.

## Practical integration constraints

- **Python HF interface is not the fast path:** The Hugging Face Transformers forward pass works for functional validation but does **not** exercise the optimized diffusion decoding and will benchmark like a standard AR transformer.
- **Optimized engine path:** The Docker image `aiweiliu/wedlm:v3` bundles the custom engine that enables faster denoising. Any Summit experiment should use this container (or build the engine locally) to measure the claimed gains.
- **CUDA and FlashAttention coupling:** The engine depends on a recent CUDA stack with FlashAttention. Hosts need GPU runtime compatibility (e.g., NVIDIA Container Toolkit with CUDA 12.x) for the container to start.
- **KV-cache claim:** Because WeDLM keeps causal attention, KV-cache semantics should remain intact. We still need to validate cache reuse across requests and across diffusion steps for determinism and throughput.

## Validation checklist (fast path)

1. **Environment**
   - GPU host with NVIDIA Container Toolkit installed.
   - Pull container: `docker pull aiweiliu/wedlm:v3`.
2. **Functional smoke**
   - Run `python example.py --model tencent/WeDLM-8B-Instruct` inside the container.
   - Compare outputs against the provided `smoke_prompts.txt` to ensure coherence and instruction following.
3. **Performance probes**
   - Measure **TTFT** and **tokens/sec** for 128-token responses on a single A100 or L40. Capture both the optimized engine and the HF fallback to quantify delta.
   - Record batch-size sensitivity: 1, 4, and 8 concurrent prompts.
4. **KV-cache behavior**
   - Verify cache hit paths by issuing multi-turn prompts and checking whether per-token latency flattens after the first turn.
5. **Quality guardrails**
   - Short-answer factual prompts and refusal prompts from `smoke_prompts.txt` to confirm instruction alignment.
6. **Stability**
   - Run 100 requests with fixed seeds to probe determinism and crash resilience.

## Benchmark plan

| Scenario                         | Metric                       | Plan                                                                           |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Single-turn chat (64–128 tokens) | TTFT, tokens/sec             | Run container demo on A100; capture wall-clock with `time` and container logs. |
| Multi-turn chat (cache reuse)    | tokens/sec, per-turn latency | Use repeated prompts with shared session to test cache benefit.                |
| Batch throughput                 | tokens/sec per GPU           | Issue 4 and 8 concurrent requests via the web demo or a simple HTTP harness.   |
| Failure/latency tails            | p95 latency, error rate      | Use repeated runs; note any CUDA/FlashAttention errors.                        |

## Risks and open questions

- **GPU requirements:** Optimizations are targeted at high-memory GPUs; unclear performance on consumer GPUs or without FlashAttention.
- **Determinism:** Diffusion decoding may introduce variability; need to validate reproducibility under fixed seeds and cache reuse.
- **Safety filters:** The reference demo does not enforce content filters; Summit must apply its own guardrails before production exposure.
- **Licensing:** Code is Apache-2.0; confirm model card terms on Hugging Face for commercial use and redistribution constraints.
- **Operational maturity:** Limited observability hooks in the demo container; productionization requires explicit metrics/tracing.

## What integration could look like

- **Minimal viable path:** Wrap the container engine with a tiny HTTP layer that mimics OpenAI ChatCompletions. Summit's existing OpenAI-compatible provider could then target that endpoint without touching core routing.
- **Observability expectations:** Emit latency, TTFT, tokens generated, prompt length, model identifier, and GPU type per request. Log diffusion-step counts to correlate speedups.
- **Rollout plan:**
  - Phase 0 (now): Local benchmarking via `docs/labs/wedlm` harness; no production changes.
  - Phase 1: Prototype HTTP wrapper + Summit provider config; shadow to compare against an existing local engine.
  - Phase 2: Hardening (auth, metrics, autoscaling) and safety filters; evaluate for standard workloads.

## References

- Official repo: <https://github.com/Tencent/WeDLM>
- Model weights: <https://huggingface.co/tencent/WeDLM-8B-Instruct>
