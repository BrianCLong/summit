# PGTT: Policy-Graph Test Generation

PGTT compiles policies and ontology constraints into synthetic graph fixtures and regression tests
that detect governance drift before policy rollout.

## Inputs

- Policy specification and ontology specification.
- Seed values and execution budget.
- Reference outcomes from prior policy version.

## Outputs

- Governance test report with regression classification.
- Explanation artifact identifying triggering policy rules.
- Replay token binding policy and ontology versions.
