Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 3: Model Risk Management (MRM) (treat models like critical systems)

1.  Define model inventory: version, purpose, owner, training data, eval results.
2.  Create model risk tiers and required controls per tier.
3.  Implement evaluation harness: accuracy, toxicity, bias, robustness, jailbreak resistance.
4.  Define guardrails: retrieval grounding, refusal logic, allowed tools/actions.
5.  Implement human-in-the-loop for high-risk outputs (review + override).
6.  Add monitoring: drift, hallucination rates, complaint rates, escalation triggers.
7.  Build rollback strategy for model changes (version pinning).
8.  Implement change management: approvals, release notes, impact analysis.
9.  Maintain audit trails for prompts, outputs (as allowed), and decisions.
10. Run quarterly red-team exercises against customer-facing AI.
11. Delete “model updates in prod” without evaluation and rollback.
