# Adversarial Threat Model for Truth Operations

This model frames Summit as a **truth-resilience platform** operating in hostile information environments. It defines adversarial classes, their objectives, and detection/mitigation hooks that downstream controls can bind to.

## Canonical Threat Classes

| Class             | Primary Goal                                    | Typical Tactics                                                       | Early Indicators                                                                   | Defensive Hooks                                                          |
| ----------------- | ----------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Noise Attacks     | Dilute analyst attention and telemetry fidelity | Alert flooding, spam connectors, low-quality scrapes                  | Sudden volume spikes without semantic novelty; entropy drop across sources         | Rate-limiting, entropy-based throttling, integrity-score dampening       |
| Poisoning Attacks | Corrupt model priors or live inference          | Data poisoning, label flipping, prompt injection                      | Divergence between trusted baseline and fresh samples; unexplained embedding drift | Dataset fingerprinting, staged quarantine, human-in-the-loop re-labeling |
| Narrative Attacks | Install coherent but false explanatory frames   | Coordinated messaging, bot amplification, synthetic consensus         | Rapid convergence of narratives; suppression of alternate hypotheses               | Narrative collision detection, dissent-preservation thresholding         |
| Timing Attacks    | Deliver truth too late to be actionable         | Delayed disclosure, slow-roll corrections, asynchronous drops         | Truth appears after decision window closes; latency anomalies                      | Temporal relevance curves, escalation of partial signals                 |
| Authority Attacks | Abuse or forge legitimacy                       | Impersonation, sudden elevation of unvetted sources, compromised keys | Authority continuity breaks; mismatched signing chains; anomalous provenance       | Authority continuity ledger, multi-factor source validation              |

## Attack Surface & Control Points

1. **Ingress Layer** – connectors, webhooks, batch uploads, and human inputs.
   - Controls: source fingerprints, connector health scoring, schema conformance checks.
2. **Processing Layer** – enrichment, entity extraction, graph linking, summarization.
   - Controls: poisoning guards (schema and statistical), narrative divergence alarms, content sandboxing for LLM calls.
3. **Decision Layer** – analyst workflows, automations, alert routing.
   - Controls: temporal relevance gates, authority validation, blast-radius containment with quarantine queues.
4. **Propagation Layer** – report generation, API exports, downstream system syncs.
   - Controls: provenance preservation, decision replay, revocation propagation.

## Detection-to-Response Flow

1. **Detect**: anomaly detectors and integrity scoring emit a structured event with class hypothesis and confidence.
2. **Assess**: policy-as-code evaluates blast radius, authority continuity, and time-to-decision risk.
3. **Contain**: quarantine compromised inputs, freeze dependent decisions, and suppress automated propagation.
4. **Recover**: solicit alternate sources, reconstruct narrative diversity, and trigger human adjudication.
5. **Learn**: update adversarial priors, refresh integrity baselines, and emit post-incident fingerprints.

## Metrics & Telemetry

- **Adversarial detection MTTD** per class
- **Containment MTTR** per decision category
- **Narrative diversity index** over time
- **Authority continuity score** (rolling) for high-impact sources
- **Temporal degradation delta**: how much utility is lost to delays

## Governance & Evidence

- All detected adversarial events must be recorded in the **Authority Continuity Ledger** and the **Truth Impact Containment Protocol** audit stream.
- Policy decisions must be enforceable via `policies/truth-defense.rego` to satisfy the canonical rule: _if a regulatory requirement cannot be expressed as policy-as-code, the implementation is incomplete_.
