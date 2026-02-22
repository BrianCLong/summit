# Prompt: MHLA Attention Lab (v1)

You are an engineering agent operating in the Summit monorepo. Your task is to stand up an
internal attention lab that:

- Implements a reference MHLA-style linear attention operator with token-level multi-head
  partitioning and configurable feature maps.
- Adds a deterministic benchmark harness for long-context workloads (agent transcripts,
  GraphRAG retrieval packs, mixed causal/chunkwise patterns) that writes JSON, markdown, and chart
  artifacts to `artifacts/attn-lab/<timestamp>/`.
- Introduces Summit-specific innovations: Adaptive Token-Head Assignment (ATHA), Diversity
  Preservation Regularizer (DPR), and Hybrid Attention Router (HAR) with ablations/safe defaults.
- Documents usage and references to the MHLA paper and project repository.
- Updates `docs/roadmap/STATUS.json` in the same change.

Non-negotiables:

- Keep features behind safe defaults; no production behavior changes.
- Deterministic seeds and reproducible evidence artifacts.
- Follow repository governance and agent metadata requirements.
