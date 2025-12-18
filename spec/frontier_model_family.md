# Frontier Model Family Specification (v0.1)

## Overview
The Frontier Model Family aims to establish a scalable, efficient, and capability-focused LLM lineage. The primary goal of v0.1 is to validate novel training methodologies—specifically telemetry-driven curricula and tool/graph-native pretraining—on a small scale (1.3B) before scaling up.

## Model Roadmap

| Version | Parameters | Goal | Key Features |
| :--- | :--- | :--- | :--- |
| **v0.1** | 1.3B | Validation | Base Transformer, Rotary Embeddings, Tool/Graph Heads, Telemetry-driven Curriculum |
| **v0.2** | 7B | Capability | Scale-up of v0.1 recipes, Extended Context (32k+) |
| **v1.0** | 30B–70B | Frontier | Full-scale training, MoE (optional), Long Context (128k+), System 2 CoT Integration |

## Architecture Specification (v0.1 - 1.3B)

### Backbone
- **Type:** Decoder-only Transformer
- **Hidden Size:** 2048
- **Layers:** 24
- **Attention Heads:** 16
- **Sequence Length:** 4096 (sliding window compatible for extension)
- **Positional Embeddings:** Rotary Positional Embeddings (RoPE)
- **Activation:** SwiGLU
- **Normalization:** RMSNorm (pre-norm)
- **Bias:** No bias in linear layers (efficiency/stability)

### Special Features (The "Frontier" Delta)

1.  **Tool & Function Calling Support:**
    - Dedicated vocabulary tokens for tool usage (e.g., `<tool_start>`, `<tool_end>`, `<graph_query>`).
    - Optional auxiliary head for function argument prediction.

2.  **IntelGraph Integration:**
    - Architecture supports "graph tokens" that can attend to graph embeddings.
    - (Experimental) Auxiliary loss for graph edge prediction.

3.  **Telemetry Hooks:**
    - The model forward pass exposes internal state metrics (attention entropy, gradient norms) to the training loop to drive the curriculum.

## Training Stack

### Infrastructure
- **Framework:** PyTorch
- **Parallelism:** FSDP (Fully Sharded Data Parallel) for scaling; DDP for 1.3B.
- **Precision:** BF16 (Bfloat16) mixed precision.

### Data Pipeline
- **Curriculum:** Dynamic, telemetry-driven. The data mixture changes based on loss stability and model uncertainty.
- **Sources:**
    - General Web (CommonCrawl filtered)
    - Code (GitHub, StackOverflow)
    - Tool Traces (Synthetic & Real)
    - Knowledge Graph Tuples (IntelGraph exports)

## Scaling Laws & Hypotheses
We are investigating "Frontier-Oriented Scaling Laws" (H5). We hypothesize that:
- **Curriculum Efficiency:** Telemetry-driven ordering improves loss-per-flop compared to random sampling.
- **Tool Emergence:** Tool usage capability scales differently than language modeling perplexity; we need to measure the "Tooling Break-Even Point".

## References
- LLaMA / LLaMA 2 Architecture
- Mistral 7B (GQA, Window Attention)
- DeepSeek (MoE routing strategies)
