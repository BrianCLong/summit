# SIPL: Sequence-Improving Pretraining Loop

Clean-room implementation of the Self-Improving Pretraining method described in arXiv:2601.21343.

## Overview

SIPL replaces or augments next-token pretraining with sequence-level RL over the next K tokens.
It uses a strong post-trained model as a rewriter and judge over candidates to improve quality, safety, and factuality.

## Components

- **Candidate Pool**: Generates rollouts, original suffixes, and rewritten suffixes.
- **Judge**: Scores candidates for quality, safety, and factuality.
- **Rewriter**: Provides high-quality reference rewrites.
- **Update Rules**: Online DPO and Reward-Filtered NLL (RF-NLL).

## Governance

See `docs/sipl/overview.md` and `docs/sipl/governance.md` for more details.

## Citation

Inspired by:
"Self-Improving Pretraining: using post-trained models to pretrain better models" (arXiv:2601.21343, 2026).
