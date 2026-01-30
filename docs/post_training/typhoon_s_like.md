# Typhoon-S-like Post-Training

## Rationale
This implementation re-derives the "Minimal Open Post-Training" concepts from Typhoon-S (arXiv:2601.18129) for Sovereign LLMs.

### Key Concepts
1. **On-Policy Distillation (OPD)**: Alternating student rollouts with teacher token-probability supervision. We support both full-logits (robustness) and top-K modes.
2. **InK-GRPO**: Incorporating knowledge via stochastic Next-Token Prediction loss on domain data within the RL/GRPO loop.
3. **Agentic RFT**: Minimal tool sandbox for "Sovereign" tasks.

## Governance
- All datasets must have a manifest.
- Evidence bundles are deterministic (sorted keys, no timestamps in reports).
- Tool use is deny-by-default.
