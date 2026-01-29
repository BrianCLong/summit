# LLM Training Change Subsumption

**Date:** Jan 2026
**Status:** In Progress

## Overview

Researchers at major AI labs (OpenAI, Thinking Machines, Amazon) are shifting focus from pretraining scaling to post-training techniques like **continual learning** and **modular merging** to solve issues like the "split-brain" problem.

## Subsumption into Summit

Summit is adopting these patterns under strict governance:

1.  **Split-Brain Problem**: Addressed via `summit.evals.split_brain` which measures prompt sensitivity.
2.  **Continual Learning**: Supported via `summit.training.continual` (Flagged OFF) using LoRA adapters.
3.  **Modular Merging**: Supported via `summit.training.merge` (Flagged OFF).
4.  **Governance**: All new capabilities are gated by `summit.policy.gates` requiring evidence before enablement.

## References

- [The Information: AI Agenda](https://www.theinformation.com/features/ai-agenda)
- [Thinking Machines: LoRA Without Regret](https://thinkingmachines.ai/blog/lora/)
- [Amazon Science: Efficient Training](https://www.amazon.science/blog/training-large-language-models-more-efficiently)
