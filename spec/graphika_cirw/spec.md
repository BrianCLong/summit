# Graphika — Confidence-Interval Identity Resolution with Witnesses (CIRW)

CIRW resolves cross-platform identifiers into probabilistic clusters with explicit uncertainty
bounds and witnessed evidence for each merge/split decision.

## Objectives

- Represent identity as probabilistic clusters, not binary merges.
- Attach confidence intervals to membership probabilities and expose them to downstream queries.
- Produce a witness for every cluster decision with minimal, replayable evidence.
- Enforce policy scopes (tenant isolation, export authorization) at clustering and query time.

## Architecture

1. **Ingestion Layer:** Normalizes identifiers (handles, emails, domains, wallets, devices).
2. **Feature Engine:** Computes linkage features and caches feature hashes.
3. **Probabilistic Clustering:** Bayesian model outputs posterior membership and uncertainty bounds.
4. **Decision Layer:** Applies merge/split policies with confidence thresholds.
5. **Witness Generator:** Emits minimal support sets and commitments.
6. **Ledger + Transparency:** Stores artifacts and decision logs.

## Workflow Overview

1. **Ingest Identifiers:** Handles, emails, domains, wallets, device fingerprints.
2. **Feature Extraction:** Temporal co-occurrence, shared resources, string similarity,
   network proximity, behavioral similarity, perceptual hash matches.
3. **Probabilistic Clustering:** Posterior model yields cluster assignments with uncertainty.
4. **Decision Layer:** Merge/split operations based on confidence thresholds; emit determinism tokens.
5. **Witnessing:** Generate cluster witnesses with commitments to identifiers and minimal support
   features; store in witness ledger and transparency log.
6. **Query Serving:** Respond to queries with candidate clusters filtered by requested confidence
   bounds and policy scopes.

## Data Model

- **IdentityCluster:** `cluster_id`, `member_hashes`, `posterior`, `confidence_interval`.
- **ClusterWitness:** `witness_id`, `support_set`, `policy_ref`, `proof_budget`.
- **ResolutionArtifact:** Commitment envelope binding cluster + witness + determinism token.

## Policy-as-Code Hooks

- Policy engine enforces tenant scope, export permissions, and minimum confidence thresholds.
- All decision outcomes emit compliance decision logs with policy references.

## Failure Modes & Safeguards

- **Low confidence:** Trigger split recommendation with witness updates.
- **Cross-tenant attempt:** Hard deny unless federation token present.
- **Replay mismatch:** Log integrity alert and quarantine cluster output.

## Innovation Edge

By delivering witnessed uncertainty-aware clustering, CIRW enables analysts to pivot safely while
understanding risk of false merges, and gives compliance teams a replayable minimal-evidence
artifact for every decision.
