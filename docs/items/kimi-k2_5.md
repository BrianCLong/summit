# Moonshot Kimi K2.5 Analysis

## Verified facts (from sources)
* 595GB weights / Hugging Face presence; model labeled “modified-mit” on HF page.
* AMA participants/usernames and AMA framing.
* “Agent swarm” marketing/tech report claims: up to 100 sub-agents + up to 1,500 tool calls + up to 4.5× speedup.
* Kimi Linear paper exists; claims KV-cache reduction and throughput gains for long context / decoding-heavy regimes.

## Harvestable patterns
* **Separate working-memory per worker**; coordinator receives *bounded* summaries/artifacts instead of full traces (prevents “context rot”).
* **Test-time scaling** via parallelism (swarm) + subsequent RL to fold improvements back (roadmap implication).
* **Token budget governance**: orchestrator assigns budgets and decides when *not* to parallelize.
* **Prompt governance as ops hygiene** (identity drift mitigation).

## Threats / failure modes
* “Open weights but unusable locally” → adoption cliff; need tiered deployment strategy and model-size registry.
* Multi-agent: coordinator bottleneck, noisy worker outputs, unbounded tool spam, replay/non-determinism, cost blowups.
* Identity drift / brand leakage → compliance and UX risk.
