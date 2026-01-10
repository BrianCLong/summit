# Integrity Scoring Model (Adversarial-Aware)

**Trust is contextual; integrity is adversarial.** This model complements probabilistic confidence by evaluating how resistant a claim is to manipulation across source, time, and narrative dimensions.

## Design Principles

- Orthogonal to model confidence; integrity can be low even when confidence is high.
- Penalize coordination anomalies and sudden narrative convergence.
- Escalate **scrutiny**, not automated action, when integrity is uncertain.
- Preserve dissenting signals to avoid premature consensus.

## Signal Inputs

- **Source Volatility**: historical variance in source reliability and topical drift.
- **Correlation & Clustering**: overlap of embeddings, URLs, network identifiers, and publication timing.
- **Historical Adversarial Behavior**: prior containment events, revoked assertions, signed key history.
- **Narrative Shift Rate**: speed and magnitude of framing changes compared to baselines.
- **Temporal Freshness**: alignment with relevance windows for the decision class.
- **Authority Continuity**: cryptographic provenance and chain-of-custody integrity.

## Scoring Pipeline

1. **Ingest** integrity signals from connectors and enrichment services.
2. **Normalize** signals into 0-1 scales with per-signal confidence bands.
3. **Weight** signals dynamically based on threat posture (e.g., elevated weighting for authority continuity during impersonation alerts).
4. **Fuse** into an **Integrity Score** (0-100) with subcomponent breakdowns.
5. **Emit** integrity annotations alongside provenance metadata for every datum and narrative cluster.

### Pseudo-Formula

```
Integrity = 100 * (w_s * S_volatility + w_c * Corr + w_h * History + w_n * Narrative + w_t * Temporal + w_a * Authority)
```

- Weights `w_*` are policy-driven and tunable via `policies/truth-defense.rego`.
- Any component breach (e.g., revoked key) can **cap** the score regardless of aggregate.

## Guardrails

- **Floor Integrity**: automatically set to <30 when authority continuity is broken or poisoning is detected.
- **Consensus Trap Avoidance**: hard cap when narrative convergence exceeds the diversity threshold without independent corroboration.
- **Blast-Radius Flag**: integrity <40 triggers decision quarantine until reviewed.

## Outputs & Actions

- Integrity annotations flow into the **Narrative Collision Graph**, **Temporal Relevance Curves**, and the **Truth Impact Containment Protocol**.
- Scores are persisted with full feature vectors for post-incident forensics and model retraining safeguards.
- Downstream automations must check integrity thresholds before executing high-impact actions.

## Telemetry

- Integrity score distribution per source class
- Rate of integrity drops correlated with connector/version changes
- Number of quarantined decisions by integrity bucket
- False-positive and false-negative review outcomes (for weight tuning)
