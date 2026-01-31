# ITEM: arXiv:2601.20540 — Advancing Open-source World Models

**Source**: https://arxiv.org/abs/2601.20540

## Verified technical claims (clean-room summary)

- LingBot-World proposes a multi-stage training pipeline: pre-train a video prior, middle-train a bidirectional world model with action control, then post-train a causal variant with few-step distillation. The objective is long-horizon rollout and interactive control.
- The architecture uses block causal attention: local bidirectional attention within chunks and global causal attention across chunks, enabling KV-cached streaming.
- Distillation combines distribution matching (DMD), self-rollout training, and an adversarial head to reduce drift.
- A MoE design inherited from Wan2.2 uses two experts (high-noise vs low-noise), with one expert active per timestep.
- Reported evaluation includes VBench with a dynamic degree metric on >30s videos, showing improved dynamics compared to cited baselines.

## Limitations called out by the authors

- Emergent long-term memory can be unstable.
- High compute cost for training and inference.
- Limited action space and interaction precision.
- Drift increases with longer rollouts.
- Single-agent focus.

## Summit relevance

Summit can incorporate the above patterns through backend-agnostic interfaces, evidence formats, and policy gates without reusing any code or weights from LingBot-World.

## Clean-room contamination checklist

- Do not copy LingBot-World source code, weights, or dataset artifacts.
- Re-implement interfaces and scaffolding independently.
- Reference the paper and repository only for attribution.
