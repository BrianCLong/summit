# MHLA Attention Lab

## Purpose

The attention lab provides a deterministic, reproducible harness for evaluating long-context
attention alternatives under Summit workloads (agent transcripts, GraphRAG retrieval packs, and
mixed causal/chunkwise patterns). It is intentionally scoped for experimentation and evidence
collection rather than production defaults.

## What We Implemented

### MHLA Reference Operator

`libs/attn_lab/mhla.py` contains a reference MHLA-style linear attention implementation that
applies token-level multi-head partitioning while preserving linear-time aggregation. The
implementation supports:

- `attn_type: {softmax, linear, mhla}`
- `mhla.num_token_heads`
- `mhla.feature_map` (`elu+1`, `relu`, `exp-approx`)
- `mhla.chunkwise` + `mhla.causal`

### Summit-Specific Innovations (Moat Work)

1. **Adaptive Token-Head Assignment (ATHA)**: optional routing that assigns tokens to head groups
   using a lightweight gating projection with top-k enforcement, plus a static fallback for
   MHLA-compatible ablations.
2. **Diversity Preservation Regularizer (DPR)**: computes collapse metrics (entropy, effective
   rank) and exposes a simple regularization loss for future fine-tuning or governance signals.
3. **Hybrid Attention Router (HAR)**: schedules a mix of linear and softmax layers and emits a
   schedule summary aligned to latency/VRAM budgets.

### Benchmark Harness

`libs/attn_lab/bench.py` generates JSON, markdown, and SVG artifacts in
`artifacts/attn-lab/<timestamp>/<attn_type>/` for the three baseline suites:

- `agent_transcript` (long, causal)
- `rag_retrieval_pack` (long, chunkwise, non-causal)
- `mixed_chunkwise` (mixed causal + chunkwise)

The benchmark report includes an “imputed intention” score at the 23rd order
(`imputed_intention_order_23`), which raises agreement to a high power to
emphasize stable long-context alignment.

## Usage

```bash
python -m libs.attn_lab.bench --attn mhla --device cpu
```

Artifacts are written to `artifacts/attn-lab/` with deterministic seeding. Adjust `--device`,
`--dim`, and `--batch-size` for local capacity.

## References

- MHLA paper: "MHLA: Restoring Expressivity of Linear Attention via Token-Level Multi-Head" (arXiv
  2601.07832). https://arxiv.org/abs/2601.07832
- MHLA project repository (research reference): https://github.com/ziplab/MHLA
