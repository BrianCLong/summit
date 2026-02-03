# Federated Campaign Radar

## Purpose

A privacy-preserving collaboration layer that lets participating organizations share campaign signals (narratives, media, actors, and diffusion patterns) without exposing sensitive first-party content. The system produces cross-tenant early warnings and response playbooks to defend against coordinated influence and information warfare campaigns.

## Goals and Non-Goals

- **Goals**: fast cross-organization campaign detection, privacy-preserving indicator exchange, provenance-aware scoring, and auditable action routing aligned to governance frameworks (e.g., NIST AI RMF, C2PA outcomes).
- **Non-Goals**: content moderation decisions, end-user PII storage, or replacing existing SOC/IR tooling.

## Threat Model (high-level)

- **Adversaries**: coordinated influence operators, botnets, covert media farms, insider data leakers attempting to reveal private tenant content.
- **Assets**: tenant content, campaign indicators, federation reputations, audit logs, cryptographic material.
- **Risks**: membership inference across tenants, poisoning of shared indicators, false attribution, enclave escape, differential privacy budget exhaustion, and tampering with provenance assertions.

## Shared Signal Schema (normalized)

Structured as a multi-entity graph:

- **Claim/Narrative**: canonical text, normalized language, embedding vectors, stance tags, corroboration strength, language/locale.
- **Media Artifact**: perceptual hashes (pHash/aHash/dHash), mime type, length, thumbnail hash, optional C2PA verification outcome (pass/fail/error, signer, assertion set hash).
- **Actor**: account handle, platform, role (originator/amplifier/bridge), reputation score, bot/sockpuppet likelihood, org trust tier.
- **Transmission Event**: timestamp, channel (platform/community), geosignal (region/country), coordination features (burstiness, synchrony, URL reuse, template reuse), visibility (public/limited).
- **Linkage**: URL or content-addressable identifier to public artifacts only; private blobs never leave tenant.
- **Confidence**: local model score + provenance weight + cross-tenant agreement score.

## Privacy-Preserving Federation

- **Input**: tenants contribute only hashed or embedded indicators (no raw content) plus aggregate stats.
- **Execution**: matching + clustering executed in secure enclaves; optionally backed by MPC-style blinded joins. Differential privacy knobs cap per-tenant contribution and noisy counts for cross-tenant signals.
- **Outputs**: cross-tenant narrative clusters with public artifact pointers, confidence, and participating-tenant cardinality buckets (e.g., 3–5 orgs, 6–10 orgs) to avoid deanonymization.

## Core Protocol Flow

1. **Ingest & Normalize**: tenant pipeline maps local signals to the shared schema; attaches C2PA outcomes when available and signs indicator bundle.
2. **Privacy Transform**: generate embeddings, perceptual hashes, and salted keyed hashes; apply DP noise to counts; register privacy budget in ledger.
3. **Secure Match & Cluster**: enclave service performs similarity search over narrative/media/actor graphs; MPC options for high-sensitivity verticals.
4. **Confidence Propagation**: combine (a) local score, (b) provenance multiplier (C2PA success boosts, failures reduce), (c) cross-tenant agreement; produce auditable confidence trace.
5. **Early-Warning Thresholding**: trigger when cross-tenant growth rate crosses optimized threshold (time-to-detect vs. false attribution); thresholds auto-tuned via replay logs.
6. **Response Pack Emission**: narrative summary, top spreaders (public handles only), channel diffusion map, recommended comms playbook, and regulatory-safe audit bundle.
7. **Audit & Governance**: immutable ledger captures inputs, transforms, thresholds, responders, and privacy budget usage; aligns with org risk controls.

## Deployment & Components

- **Tenant Edge Collector**: normalizes local signals, strips PII, computes embeddings/perceptual hashes, and enforces per-tenant DP budgets.
- **Federated Match Service (enclave)**: secure enclave or MPC coordinator performing cluster formation, privacy-budget tracking, and confidence propagation.
- **Credential-Aware Scorer**: incorporates C2PA validation outcomes into indicator weights and downstream action policies.
- **Early-Warning Engine**: monitors cross-tenant cluster velocity; produces alerts with tunable sensitivity and replayable decisions.
- **Response Pack Generator**: builds communication playbooks and incident briefs; exports to tenant ticketing/SOAR without sharing private payloads.
- **Governance & Ledger**: policy-as-code guardrails, audit logs, DP budget accounting, and incident review workflows.

## Data Protection Controls

- Differential privacy budgets per tenant and per indicator type; noisy counts for shared statistics.
- Enclave attestations and hardware-rooted keys; periodic remote attestation verification.
- Poisoning resistance via reputation weighting, anomaly detection on submitted hashes, and quarantine for low-trust tenants.
- Strict separation between public artifact pointers and any tenant-private identifiers.

## Evaluation KPIs

- **Time-to-Detect (TTD)**: median time from first indicator to alert across tenants.
- **False Attribution Rate**: incorrect cross-tenant linkage frequency; tracked per narrative cluster.
- **Containment Delta**: reduction in cross-channel spread vs. baseline without federation.
- **Privacy Budget Health**: % of tenants within budget; budget exhaustion alarms.
- **Provenance Utilization**: share of clusters influenced by C2PA signals; correlation between provenance strength and alert accuracy.

## Forward-Looking Enhancements

- Adaptive clustering using causal diffusion graphs to better differentiate organic vs. coordinated spread.
- Optional homomorphic encryption for specific hash-join steps where enclave deployment is constrained.
- Counterfactual replay to stress-test thresholds against historical disinformation incidents and tune TTD/false-attribution tradeoffs.
- Open standard proposal: align schema + protocol with existing threat intel formats (STIX/TAXII) plus C2PA assertions for credential-aware exchanges.

## API Summary

Base path: `/api/fcr`

- `POST /fcr/budget`: Configure per-tenant differential privacy budgets.
- `POST /fcr/ingest`: Validate and ingest normalized signals.
- `POST /fcr/run`: Execute ingest + cluster + alert pipeline.

## Operations

- Enforce privacy budgets and verify C2PA signer reputation before alert propagation.
- Export audit evidence from the provenance ledger for incident review.
