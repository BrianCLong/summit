# Embodiments and Design-Arounds — ILC-PWD

## Alternative Embodiments

- **Evidence weighting:** Provenance-weighted decay can incorporate analyst trust scores, model confidence, or feed-tier metadata while preserving distinct decay curves per evidence class.
- **Lifecycle topology:** Additional lifecycle states (e.g., QUARANTINED or WATCHLIST) can be inserted with hysteresis thresholds tuned per tenant policy.
- **Conflict analytics:** Conflict measures may include contradiction detection via NLP claim extraction or statistical disagreement across feeds, both driving lifecycle transitions.

## Design-Around Considerations

- **Support set minimization:** Transition proofs can be generated using greedy minimality, SAT-based selection, or ILP solvers to satisfy proof budgets without altering state logic.
- **Tokenization:** Replay tokens can be extended with data-source epochs or tenant identifiers to allow reproducible recalculation while isolating cross-tenant leakage.
- **Caching controls:** Cached lifecycle states can be invalidated based on policy versioning or maximum staleness windows, limiting exposure to stale evidence paths.
