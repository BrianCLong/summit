# Attribution: ATP-Latent

This module implements concepts from the paper:

**Title**: Beyond Imitation: Reinforcement Learning for Active Latent Planning
**arXiv ID**: 2601.21598
**Authors**: Zhi Zheng, Wee Sun Lee

## Concepts Implemented
1.  **Conditional VAE Supervision**: Modeling latent-token supervision as a conditional VAE to create a smoother latent space for planning.
2.  **Coherence Reward**: Using Reinforcement Learning with an auxiliary reward based on the consistency between VAE-decoded contents of latent tokens.

## Implementation Notes
*   This implementation is a clean-room derivation based on the public description and Hugging Face summary.
*   No code was copied from the original repository.
