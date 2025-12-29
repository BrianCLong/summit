# Federated Campaign Radar (FCR) v1 Specification

## Purpose and Scope

The Federated Campaign Radar (FCR) enables organizations to collaboratively detect and respond to coordinated information campaigns without sharing sensitive content. It standardizes signals, performs privacy-preserving matching and clustering, and routes early warnings and response packs with auditable controls aligned to NIST AI RMF practices.

## Design Principles

- **Privacy-first federation:** Exchange only hashed/embedded indicators and aggregate statistics; raw private content never leaves a tenant boundary.
- **Public-signal bias:** Prioritize verifiable public artifacts (URLs, media hashes, credentialed assets) to minimize attribution risk.
- **Defense-in-depth:** Combine enclave/MPC workflows, differential privacy (DP) budgets, and credential-aware scoring to harden cross-tenant analytics.
- **Operational trust:** Provide replayable audit trails, provenance links (C2PA), and deterministic policy-as-code thresholds for alerts and takedowns.
- **Network-effects aware:** Optimize for incremental utility as more tenants and business units participate while maintaining per-tenant privacy budgets.

## System Architecture

```
+-------------------------+       +------------------------------------+
| Tenant Ingestion Plane  |       | Federated Coordination Plane      |
| (per org / BU)          |       | (secure enclave / MPC cluster)    |
|                         |       |                                    |
| - Signal Normalizer     |  ---> | - Schema Registry & Validator      |
| - Provenance Verifier   |       | - Privacy Budget Controller        |
| - DP Hasher/Embedder    |       | - Federated Matcher & Clustering   |
| - Local Ledger & Audit  |       | - Credential-Aware Scoring Engine  |
+-------------------------+       | - Alert & Response Pack Generator  |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  | Delivery & Ops Plane              |
                                  | - Early Warning Bus (Pub/Sub)     |
                                  | - SOAR / Ticketing Connectors      |
                                  | - Playbook Library & Templates     |
                                  | - Observability & Replay           |
                                  +------------------------------------+
```

## Module Responsibilities

- **Signal Normalizer (tenant):** Map incoming artifacts to the shared ontology; enforce schema; reject unknown fields.
- **Provenance Verifier (tenant):** Validate C2PA assertions when present; attach verification status and confidence.
- **DP Hasher/Embedder (tenant):** Produce salted, privacy-budgeted hashes or embeddings for URLs, media, handles, and claims; apply k-anonymity thresholds before federation.
- **Schema Registry & Validator (federated):** Enforce versioned shared schema; publish migration and compatibility rules.
- **Privacy Budget Controller (federated):** Track per-tenant DP budgets and query costs; block over-budget operations; provide audit entries.
- **Federated Matcher & Clustering (federated):** Perform privacy-preserving approximate matching across tenants using secure enclaves or MPC; support narrative graph clustering over claims/media/actors.
- **Credential-Aware Scoring Engine (federated):** Boost or down-rank signals based on provenance (C2PA) validation outcomes and tenant trust weights.
- **Alert & Response Pack Generator (federated):** Detect cross-tenant coordination spikes; generate narrative summaries, diffusion graphs, top spreaders, and recommended comms playbooks.
- **Early Warning Bus (delivery):** Publish alerts to tenants with severity, confidence, and playbook links; support rate limiting and tenant-specific routing.
- **Local Ledger & Audit (tenant):** Immutable log of submissions, budget usage, and received alerts for replayable compliance evidence.

## Shared Signal Schema (v1)

Structured as a versioned document (`schema_version: 1.0.0`). Fields marked **P** are required in privacy-preserving exchange; **O** are optional.

- **claim** (**P**):
  - `text_fingerprint` (SHA-256 or DP embedding reference)
  - `language` (BCP47)
  - `stance` (optional: supportive/neutral/adversarial)
- **narrative** (**O**):
  - `narrative_id` (stable hash of canonical claim set)
  - `title` (DP-perturbed optional)
- **artifact** (**P**):
  - `type` (url | image | video | audio | post | doc)
  - `hash` (media perceptual hash or URL hash)
  - `content_credentials` (C2PA verification status + signer fingerprint)
  - `first_seen_ts`, `last_seen_ts` (ISO 8601)
  - `channel` (platform, forum, medium)
- **actor** (**O**):
  - `handle_hash`, `platform`, `account_age_days_bucket`
  - `actor_risk_score` (locally computed, DP bucketized)
- **coordination_features** (**P**):
  - `co_post_window_s` (bucketized), `shared_hash_count`, `burstiness_score`
  - `graph_edges` (degree buckets only)
- **provenance** (**O**):
  - `source_org_id` (pseudonymous), `ingestion_pipeline_version`
  - `c2pa_status` (valid | invalid | missing), `signature_chain`
- **metrics** (**P**):
  - `reach_bucket`, `velocity_bucket`, `geo_region_bucket`
  - `evidence_count`

## Federation Protocol (happy path)

1. **Ingest & Normalize (tenant):** Validate against shared schema and local policy; generate text/media fingerprints and DP buckets.
2. **Budget Gate (tenant):** Deduct estimated DP cost for shared indicators; log in local ledger.
3. **Secure Submit:** Push indicators to enclave/MPC endpoint with tenant-scoped key; raw content never leaves boundary.
4. **Cross-Tenant Matching:** Enclave computes similarity joins on embeddings + hashes; merges into narrative clusters with confidence propagation across tenants.
5. **Credential-Aware Scoring:** Boost clusters containing valid C2PA artifacts; downgrade clusters with invalid signatures or unverifiable sources.
6. **Cluster Promotion:** When cluster confidence and coordination metrics exceed policy-as-code thresholds, promote to early-warning event.
7. **Response Pack Generation:** Summarize narrative, include top public artifacts, geo/channel diffusion, and recommended playbooks; attach audit pointers and replay token.
8. **Delivery & Feedback:** Publish to tenant topics; tenants can optionally send feedback (true/false positive, containment actions) via the same enclave channel with DP noise.

## Privacy & Security Controls

- **Differential Privacy:** Per-tenant budgets with epsilon decay; DP noise applied to counts/reach/velocity buckets before federation.
- **Secure Compute:** Default to hardware-backed enclaves; MPC fallback when enclaves unavailable. All inter-tenant joins occur inside trusted compute.
- **K-Anonymity Thresholds:** Reject indicators that do not meet minimum crowd size before cross-tenant exposure.
- **Rate Limiting & Fairness:** Per-tenant quotas to prevent dominance and reduce linkage attacks.
- **Provenance Enforcement:** C2PA validation results influence scoring and allow selective suppression of unverifiable media.
- **Replayable Audit:** Immutable logs for submissions, budget usage, cluster promotions, and alert deliveries; exportable for regulator review.

## Early-Warning Logic

- **Trigger criteria:**
  - `coordination_features.burstiness_score >= policy.thresholds.burstiness`
  - `shared_hash_count >= policy.thresholds.shared_hash_min`
  - `cross_tenant_support >= policy.thresholds.tenant_count_min`
  - `credential_score >= policy.thresholds.cred_weight`
- **Time-to-detect optimization:** Sliding-window evaluation (e.g., 15m/1h/6h) with decaying weights to favor fresh coordination.
- **False-attribution guardrails:** Require multi-signal agreement (claim + media + actor buckets) and minimum public artifact set before promotion.

## Evaluation & KPIs

- **Time-to-detect (TTD):** Median time from first tenant observation to cluster promotion; target p95 ≤ 30 minutes for high-burst campaigns.
- **False-attribution rate:** Share of alerts later marked incorrect; target <2% per quarter with audit-backed adjudication.
- **Containment delta:** Reduction in downstream spread vs. counterfactual; measure using pre/post velocity buckets.
- **Cross-tenant coverage:** Ratio of tenants contributing to promoted clusters; monitor for long-tail blind spots.
- **Privacy loss accounting:** Average epsilon consumed per alert; enforce hard ceilings and auto-cooldowns.

## Threat Model (abbreviated)

- **Adversaries:**
  - Coordinated inauthentic behavior networks attempting cross-tenant evasion.
  - Poisoning attempts injecting crafted embeddings to induce false clusters.
  - Malicious tenants attempting membership inference or budget exhaustion.
- **Controls:**
  - DP + k-anonymity + quotas against inference.
  - Robust embedding defenses (outlier rejection, spectral normalization, signed model digests).
  - Multi-tenant trust scoring to down-weight low-reputation sources.
  - Enclave attestation checks; tamper-evident logs for all federation jobs.

## Operational Workflows

- **Onboarding:** Tenant registers enclave keypair, configures policy thresholds, sets DP budget caps, and validates ledger connectivity.
- **Runbooks:**
  - **Incident triage:** Validate alert, review public artifacts, trigger comms playbook, log decision in ledger.
  - **Budget exhaustion:** Auto-throttle submissions, notify tenant security, and require manual budget top-up with approval trail.
  - **Model upgrade:** Dual-run new embeddings; compare cluster drift; cut over after p95 stability meets SLA.
- **Integrations:** Webhooks, STIX/TAXII export for public indicators, SOAR connectors, and Slack/MSTeams alerting.

## State-of-the-Art Enhancements (future-ready)

- **Adaptive privacy budgets:** Reinforcement-learning policy that reallocates epsilon to high-risk windows while respecting hard caps.
- **Causal diffusion scoring:** Use causal inference on propagation graphs to prioritize interventions with highest containment delta.
- **Credential-linked revocation:** Automatic suppression of assets whose C2PA signatures are revoked by issuers.

## Compliance & Governance Alignment

- **NIST AI RMF:** Map controls to Govern/Map/Measure/Manage functions; ensure measurement artifacts are exportable.
- **DSA/Systemic risk posture:** Frame outputs as risk intelligence (not moderation); maintain regulator-facing evidence bundles.
- **Policy-as-code:** Thresholds, budgets, and routing rules stored as versioned policies with change-control audit entries.

## Deployment Notes

- **Topology:** Regional enclaves with tenant-affinity routing; stateless federation workers backed by message queues.
- **Storage:** Partitioned indicator store (per-tenant logical separation) plus global cluster index with DP-safe aggregates.
- **Observability:** Metrics (TTD, budget burn rate), traces for federation jobs, structured logs with replay tokens.

## Evaluation Harness

- Simulated campaigns with known ground truth; inject across tenants with controlled timing.
- Measure detection latency, attribution accuracy, privacy loss, and containment impact under varying tenant counts.
- Include poisoning and Sybil scenarios to validate robustness and guardrails.
