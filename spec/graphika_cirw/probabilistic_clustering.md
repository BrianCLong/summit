# Probabilistic Clustering Model (CIRW)

## Model Overview

CIRW uses a Bayesian clustering model to estimate identity membership with uncertainty bounds. The
model ingests linkage features and produces posterior probabilities for each identifier pair and
cluster.

## Inputs

- Feature vectors derived from temporal co-occurrence, shared resources, string similarity,
  network proximity, behavioral similarity, and perceptual hash matches.
- Policy constraints that restrict cross-tenant clustering.
- Determinism token with snapshot ID and seed.

## Outputs

- Posterior membership probabilities.
- Confidence intervals for cluster membership.
- Cluster-level uncertainty scores and merge/split recommendations.

## Calibration

- Calibrate model outputs using held-out truth sets.
- Track calibration drift and log deviations for governance review.

## Validation

- Recompute posterior for sampled clusters during audits.
- Validate confidence intervals meet policy-defined minimums before exposing outputs.

## Auditability

All clustering runs must emit a determinism token and a witness ledger entry to enable replay and
verification.
