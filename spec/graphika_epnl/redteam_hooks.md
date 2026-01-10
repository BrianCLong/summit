# EPNL Red-Team Hooks

Red-team hooks enable adversarial testing and robustness reporting.

## Hook types

- Input perturbations (lexical swaps, actor obfuscation, time-shifted narratives).
- Graph rewiring and edge-weight perturbations under budget limits.
- Policy/redaction profile toggles for counterfactual runs.

## Metrics

- Robustness scores per stage and aggregate coordination-score stability.
- Delta reports comparing baseline and counterfactual manifests.
- Resource budget adherence logs.

## Evaluator flow

- Hooks are exposed through versioned interfaces and executed inside evaluator containers.
- Results are logged with Merkle commitments and appended to the evaluator bundle.
