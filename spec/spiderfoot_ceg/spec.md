# SpiderFoot CEG: Coalition Egress Guard

Scope-aware OSINT execution with classification tokens and egress receipts.

## Capabilities

- Validates classification scope token (CUI, NATO Restricted, internal) before module execution.
- Selects egress policy per scope; defaults to passive-only without authorization token.
- Monitors egress events, enforces thresholds, and generates selective-disclosure results.
- Emits egress receipts with hash chaining and replay tokens; supports counterfactual stricter policy runs.
