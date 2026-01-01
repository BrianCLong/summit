# ADR 0010: Counterfactual Context Reassembly for MCP Poisoning Detection

## Status

Accepted

## Context

Model Context Protocol (MCP) assemblies are vulnerable to context poisoning and latent manipulation that can bias downstream reasoning without violating policy, provenance, or trust-weight rules. Existing prompt-injection mitigations rely on static signatures, heuristics, or vendor-specific introspection and fail to measure structural influence exerted by individual context segments within long-horizon agent workflows. We need a deterministic, model-agnostic mechanism that can surface disproportionate influence caused by suspicious segments during context assembly and provide actionable enforcement hooks.

## Decision

Implement a Counterfactual Context Reassembly (CCR) capability that programmatically perturbs MCP contexts, measures reasoning divergence across controlled variants, and flags segments exhibiting anomalous influence. CCR will:

1. **Generate counterfactual variants** of the primary context by applying controlled modifications (segment removal, trust-weight attenuation, reordering, and invariant/capsule isolation).
2. **Execute identical model calls** against each variant without requiring model introspection or vendor-specific features.
3. **Compare outputs** using structured divergence metrics (semantic similarity deltas, tool-selection shifts, policy evaluation diffs, reasoning-path edits).
4. **Localize culprits** by correlating divergence spikes with specific context segments and their perturbation type.
5. **Respond automatically** by suppressing, quarantining, or down-weighting the implicated segments and emitting provenance evidence into the governance pipeline.

## Consequences

- Adds a deterministic, model-agnostic red-teaming loop inside MCP assembly.
- Provides measurable poisoning indicators even for deterministic model configurations.
- Integrates with existing inventions: CPG (segment targeting), IC³ (capsule isolation), and TWCA (trust attenuation).
- Requires additional execution budget for variant evaluation; introduce configurable ceilings and sampling strategies.
- Enables automated policy actions (trust score reduction, execution denial) and audit artifacts for regulators.

## Implementation Plan

- **Context Perturbation Library**: Add `context/counterfactual/` with generators for removal, attenuation, reorder, and capsule-isolation transforms; ensure deterministic seeds and manifest outputs for provenance.
- **Variant Runner**: Extend MCP execution orchestrator with a CCR mode that runs base and variant contexts, capturing outputs, reasoning traces, and tool-selection metadata.
- **Divergence Analyzer**: Implement pluggable metrics (cosine similarity, n-gram overlap, decision/path deltas, policy verdict diffs) and thresholds tuned for disproportionate influence detection.
- **Response Hooks**: Wire detections to trust score updates, quarantine queues, and policy-enforcement gates; emit signed evidence into the provenance ledger.
- **Operational Controls**: Expose configuration for variant budget, perturbation strategy, and severity thresholds; add observability (metrics and audit trails) to satisfy GA hardening.

## Alternatives Considered

- **Static prompt-injection filters**: Low coverage and brittle; rejected.
- **Model ensemble voting**: Detects model disagreement, not structural context influence; adds vendor lock-in.
- **Heuristic content checks**: Miss latent manipulation that survives semantic filters.

## Verification

- Unit tests for perturbation determinism and manifest integrity.
- Integration tests that seed benign vs. poisoned segments and assert divergence localization and response actions.
- Performance guardrails: run CCR under constrained budgets to validate latency ceilings.
- Governance evidence: ensure CCR emits provenance records consumable by the audit ledger and GA verification tooling.
