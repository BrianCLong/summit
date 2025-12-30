# Graphika — Confidence-Interval Identity Resolution with Witnesses (CIRW)

CIRW resolves cross-platform identifiers into probabilistic clusters with explicit uncertainty bounds and witnessed evidence for each merge/split decision.

## Objectives

- Represent identity as probabilistic clusters, not binary merges.
- Attach confidence intervals to membership probabilities and expose them to downstream query workflows.
- Produce a witness for every cluster decision with minimal, replayable evidence.
- Enforce policy scopes (tenant isolation, export authorization) at clustering and query time.

## Workflow Overview

1. **Ingest Identifiers:** Handles, emails, domains, wallets, device fingerprints.
2. **Feature Extraction:** Temporal co-occurrence, shared resources, string similarity, network proximity, behavioral similarity, and perceptual hash matches.
3. **Probabilistic Clustering:** Bayesian/posterior model yields cluster assignments with uncertainty intervals.
4. **Decision Layer:** Merge/split operations based on confidence thresholds; emit determinism tokens.
5. **Witnessing:** Generate cluster witnesses with commitments to identifiers and minimal support features; store in witness ledger and transparency log.
6. **Query Serving:** Respond to queries with candidate clusters filtered by requested confidence bounds and policy scopes.

## Governance Hooks

- Federation token required for cross-tenant joins.
- Replay tokens capture snapshot, seed, and model versions for audit.
- Disclosure constraints applied when exporting cluster candidates.

## Innovation Edge

By delivering witnessed uncertainty-aware clustering, CIRW enables analysts to pivot safely while understanding the risk of false merges, and gives compliance teams a replayable, minimal-evidence artifact for every decision.
