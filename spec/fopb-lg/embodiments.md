# FOPB-LG Embodiments

## Edge-Cloud Split Execution

- Edge nodes handle low-latency safety filtering and context compression before forwarding partial prompts to cloud models.
- Cloud nodes return policy-scoped continuations that are recombined on the edge with provenance hashes.

## Privacy-Preserving Federated Fine-Tune

- Employs differential privacy noise injection and secure aggregation so shared improvements cannot reveal tenant data.
- Tracks per-tenant privacy budgets and halts contributions when limits are met.

## Governance Dashboard

- Displays routing decisions, cost/carbon impact, and policy enforcement outcomes for each generation request.
- Exposes audit exports with signed provenance for compliance and customer trust reports.
