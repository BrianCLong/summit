# RLVR PEFT Guardrails (arXiv:2512.23165)

**Source:** [Evaluating Parameter Efficient Methods for RLVR](https://huggingface.co/papers/2512.23165)

Key takeaways to operationalize in Summit:

- **Structural adapters first:** DoRA, AdaLoRA, and MiSS consistently outperform vanilla LoRA on RLVR reasoning tasks, so they are the preferred defaults.
- **Avoid SVD-init in RLVR:** PiSSA, MiLoRA, and other SVD-initialized variants can collapse due to spectral misalignment during RLVR updates.
- **Keep enough capacity:** Extreme reductions (Rank-1, VeRA, LN-only, IA3-only) bottleneck reasoning; maintain at least moderate ranks.

Operational guidance:

- Enable RLVR mode and let the platform default to a structural adapter (DoRA by default) with safe rank floor (>=8).
- Guardrails block SVD-initialized adapters and sub-8 ranks unless explicitly overridden for experiments.
- Low-capacity adapters are warning-tier and require explicit override in production deployments.
