# TRACER: Temporal Role Attribution via Constrained Evidence Routing

TRACER assigns operational roles (originator, amplifier, bridge, recycler) in narrative operations
by routing influence credit through a temporal actor–content–resource graph under strict
constraints. Outputs include role certificates with evidence subgraphs and replay tokens for
auditing.

## Inputs

- Narrative cluster identifier and time window.
- Interaction events (authorship, reshare, link, reply).
- Topic centroid embedding and platform boundary metadata.

## Outputs

- Role scores per actor with confidence intervals.
- Role certificate containing support subgraph, commitments, and replay token.
- Counterfactual deltas for removed actors.

## Invariants

- Temporal ordering strictly enforced.
- Topic coherence constraint applied before routing.
- Explanation budget respected for support subgraph selection.
