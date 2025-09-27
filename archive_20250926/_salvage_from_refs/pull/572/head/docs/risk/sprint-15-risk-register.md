# Sprint 15 Risk Register

| Threat | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Playbook misconfig performs unwanted changes | Medium | High | Dry-run default, approvals, safelist actions, egress allowlists |
| Evidence tampering undetected | Low | High | SHA-256 hashing, append-only audit, hash in exports |
| Alert noise overloads cases | Medium | Medium | Grouping rules, cooldowns, manual split/merge |
| Token leakage to 3p systems | Low | High | Scoped tokens, KMS, short TTL, audit redaction |
| Cost spikes from action storms | Medium | Medium | Rate limits, budgets, dashboards |
