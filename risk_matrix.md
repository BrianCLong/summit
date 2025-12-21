# Risk Matrix

| Threat/Abuse Case | Severity | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Prompt-injection / jailbreaks | High | Medium | Adversarial prompt tests, OPA guardrails around model actions, rationale/citation display with audit of prompts and outputs. |
| Data poisoning / sensor drift | High | Medium | Telemetry sanity checks, quarantine windows, honeypot source tags, provenance manifests on ingest. |
| Selector misuse / over-broad queries | High | High | ABAC/OPA compiler with policy-by-default denies, justification prompts, governance appeal workflow. |
| Unsafe exports / license breach | High | Medium | License/TOS engine, selective disclosure tiers, export manifests with authority binding, immutable audit. |
| Cost/SLO regressions | Medium | High | Cost guard budgets and slow-query killer, SLO dashboards with burn-rate alerts, autoscaling + load shedding. |
| Manifest tampering | High | Low | Hash tree with signatures, verifier CLI in CI, cross-check against ledger checkpoints. |
| Chaos drill fallout | Medium | Low | Controlled blast radius, rollback steps, health verification, change tickets. |
