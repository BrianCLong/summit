# VibeTensor Subsumption Claims

## Source Claims (Atomic)

- **ITEM:CLAIM-01** — “Reverse-mode autograd graph objects; CUDA tensors record/wait on CUDA events; experimental multi-device autograd.”
- **ITEM:CLAIM-02** — “CUDA streams/events wrappers with caching allocator diagnostics (snapshots, stats, caps, GC ladders); CUDA graph capture/replay.”
- **ITEM:CLAIM-03** — “Experimental multi-GPU fabric via CUDA P2P/UVA; observability primitives; optional CUTLASS ring allreduce; not NCCL replacement.”
- **ITEM:CLAIM-04** — “Interop: DLPack import/export; safetensors loader/saver; versioned C plugin ABI; Python overrides; Triton/CUTLASS hooks.”
- **ITEM:CLAIM-05** — “Built by LLM coding agents; validated via CTest/pytest/differential checks; longer-horizon regressions and diagnostics.”
- **ITEM:CLAIM-06** — “Kernel microbench speedups exist, but end-to-end training slower; composition can be globally suboptimal.”
- **ITEM:CLAIM-07** — “Apache-2.0; explicit research-only warning (‘do not use in production’).”

## Summit Claim Registry Mapping

| Summit Artifact | Claim IDs | Notes |
| --- | --- | --- |
| Agentic tool-gated workflow spec | ITEM:CLAIM-05 | Tool-enforced correctness over manual review. |
| Differential-check harness contract | ITEM:CLAIM-05, ITEM:CLAIM-04 | Framework-agnostic reference comparisons. |
| Diagnostic artifact schemas | ITEM:CLAIM-02, ITEM:CLAIM-03 | Allocator/event snapshots and observability-first artifacts. |
| Composition-risk guardrails | ITEM:CLAIM-06 | Detect regression patterns without runtime claims. |
| Governance banner + research-only posture | ITEM:CLAIM-07 | Explicit experimental warning. |
| Drift detector | Summit original | Clean-room methodology to track upstream claim drift. |
