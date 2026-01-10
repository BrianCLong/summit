# Recorded Future — IDCP: Indicator Deconfliction with Collision Proofs

## Overview

IDCP canonicalizes indicators from multiple feeds by detecting collisions and
aliases. It emits collision proofs and safe action envelopes to prevent
incorrect automation.

## Architecture

- **Ingestion**: collect indicator records with context and provenance.
- **Equivalence Builder**: compute candidate equivalence relations.
- **Collision Detector**: identify same-value/different-object cases.
- **Canonicalizer**: build canonical indicator objects with annotations.
- **Proof Generator**: emit minimal support sets and commitments.
- **Policy Envelope**: derive safe action constraints based on risk.

## Data Contracts

- **Indicator record**: indicator_value, context attributes, provenance.
- **Deconfliction artifact**: canonical indicator, collision proof, replay token.

## Policy & Compliance

- Automated actions must use the safe action envelope.
- Collision proofs and policy decisions are logged in transparency log.

## Metrics

- Collision detection precision/recall.
- Reduction in false block rate.
- Proof verification latency.
