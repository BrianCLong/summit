# Federated Campaign Radar (FCR) v1 Architecture & Protocol Spec

## 1. Purpose and outcomes

- **Mission:** Provide a privacy-preserving federation layer that surfaces emerging influence/narrative campaigns across organizations without exchanging sensitive content.
- **Key outcomes:**
  - Cross-tenant early-warning on coordinated narratives and media artifacts.
  - Actionable response packs with provenance-aware confidence.
  - Auditable controls aligned to NIST AI RMF and DSA-style systemic-risk expectations.

## 2. Design principles

- **Privacy-first:** No raw private content leaves a tenant; only hashed, embedded, or DP-noised indicators and aggregate stats are shared.
- **Verifiable provenance:** Prefer Content Credentials (C2PA) signals where available; all scoring is provenance-aware.
- **Federation-safe defaults:** Secure enclaves/MPC for matching; tunable differential privacy budgets with policy-as-code guardrails.
- **Operationally actionable:** Outputs must be routable to playbooks, with replayable audit trails and time-to-detect SLAs.

## 3. Reference architecture

- **Tenant Sensor Plane** (per org/B.U.):
  - Ingest pipelines normalize claims, narratives, media hashes, URLs, accounts, timestamps, channel metadata, and coordination features.
  - Provenance attestor validates C2PA credentials and signs local assertions.
  - Local feature encoders produce hashes/embeddings plus DP-safe aggregate stats.
- **Federated Coordination Plane:**
  - **Privacy-preserving matcher:** Secure enclave or MPC workflow clusters cross-tenant indicators; supports k-anon and ε-differential privacy knobs.
  - **Credential-aware scorer:** Boosts or discounts clusters based on provenance confidence and attestation quality.
  - **Confidence propagator:** Spreads confidence across claim/media/actor graph edges with decay tuned by privacy budgets.
- **Alerting & Response Plane:**
  - Early-warning thresholds trigger when cross-tenant coordination spikes or narrative velocity exceeds baselines.
  - Response pack generator compiles narrative summaries, public artifacts, spread graphs, and recommended comms playbooks.
  - Audit and governance service stores replayable logs mapped to AI risk controls (controls, measurements, incident handling).

## 4. Data model (normalized indicator schema)

| Field                   | Type           | Notes                                                                             |
| ----------------------- | -------------- | --------------------------------------------------------------------------------- |
| `claim_id`              | UUID           | Deterministic per canonicalized claim text.                                       |
| `narrative_id`          | UUID           | Clusters related claims.                                                          |
| `media_hash`            | SHA-256/SSDEEP | Per-asset; supports perceptual hashing.                                           |
| `url`                   | URI            | Normalized & scheme-validated.                                                    |
| `account_handle`        | String         | Platform-qualified (e.g., `x:@handle`).                                           |
| `timestamp`             | ISO-8601       | UTC; precision to seconds.                                                        |
| `channel_metadata`      | JSON           | Platform, locale, region, language.                                               |
| `coordination_features` | JSON           | E.g., burstiness, co-posting, bot scores.                                         |
| `provenance_assertions` | JSON           | C2PA validation outcome, signing chain, tamper status.                            |
| `embedding`             | Vector         | Dimensionality per model card; stored locally; only cross-tenant via enclave/MPC. |
| `dp_noise_budget`       | Float          | ε budget consumed for DP releases.                                                |

## 5. Federation protocol (v1)

1. **Local preparation:** Tenants run normalization and hashing/embedding; attach provenance assertions; compute DP-safe aggregates (counts, rates, velocity).
2. **Privacy envelope selection:** Policy-as-code defines which indicator classes use enclaves vs. MPC vs. DP aggregates, plus ε/k thresholds and redaction rules.
3. **Secure submission:** Tenants transmit encrypted envelopes to the coordination plane; attestations include software bill-of-materials hash and enclave attestation.
4. **Cross-tenant matching:**
   - Deterministic hashes for exact artifacts (URLs/media) in enclaves.
   - Approximate nearest-neighbor on embeddings inside enclaves with DP clipping.
   - Graph clustering over claim/media/account triples with confidence propagation.
5. **Scoring:** Combine frequency, spread velocity, coordination features, and provenance quality into a narrative risk score with explainable feature weights.
6. **Alerting:** Emit early-warning events when (a) velocity or coordination surpasses dynamic baselines, or (b) high-risk narratives appear in ≥K tenants within T minutes.
7. **Response packaging:** Auto-generate playbooks: narrative summary, top spreaders (public only), channels, recommended comms counter-messaging, and takedown/label suggestions.
8. **Audit & replay:** Persist signed logs of inputs, decisions, and privacy budgets; enable deterministic replay for investigations and regulator requests.

## 6. Threat model & mitigations

- **Adversary: poisoning:** DP clipping, per-tenant rate limits, and trust-weighted scoring; enclave attestation required.
- **Adversary: membership inference:** ε budgets enforced per-tenant; aggregation thresholds; randomized response for low-signal regions.
- **Adversary: rollback/ghost updates:** Append-only provenance ledger; monotonically increasing federation epoch IDs.
- **Adversary: model drift/exploit:** Continuous eval on holdout signals; signed model cards; rollback-to-known-good models.
- **Data exfiltration risk:** Zero content export policy; enclave egress limited to whitelisted outbound telemetry; dual-control for policy changes.

## 7. Governance, controls, and auditability

- Map to **NIST AI RMF**: govern (policies-as-code), map (threat intel taxonomy), measure (time-to-detect, false attribution), manage (incident runbooks).
- Align to **DSA systemic-risk** posture: focus on risk intel + resilience, not moderation; maintain transparency logs for regulator queries.
- **Controls:**
  - Policy-as-code for privacy budgets, enclave enforcement, and alert thresholds.
  - Mandatory provenance scoring; low-confidence artifacts are flagged, not blocked.
  - Evidence bundles: signed replay logs, model card references, and DP budget ledgers.

## 8. Evaluation & KPIs

- **Time-to-detect (TTD):** P50/P95 minutes from first sighting to alert; target <10m P50, <30m P95 for fast narratives.
- **False attribution rate:** % of clusters later reclassified as benign; target <2% monthly; tracked by tenant feedback loop.
- **Containment delta:** Reduction in cross-tenant spread velocity post-alert vs. baseline.
- **Coverage:** % of public artifacts with provenance assertions; target >60% where C2PA is available.
- **Cost efficiency:** CPU/GPU minutes per 1k signals; monitor for regressions.

## 9. Deployment blueprint

- **Topology:**
  - Tenant Plane: sidecar collector + attestor + local feature encoder; stores raw content locally.
  - Coordination Plane: autoscaled enclave pool for matching; MPC service for cross-tenant aggregates; policy-as-code gateway (OPA/Rego) in front.
  - Observability: metrics (TTD, alert counts), traces for federation jobs, structured logs with tenant-scoped IDs.
- **Data retention:** Local raw data per-tenant policy; federated artifacts retained 30d rolling with DP constraints.
- **Reliability:**
  - SLOs: 99.9% matching availability; 95th percentile matching latency <5s under normal load.
  - Backpressure: queue-based ingestion with dead-letter and per-tenant shaping.

## 10. Implementation notes & extensions

- **Credential-aware weighting:** Treat C2PA-verified assets as high-confidence; degrade scores for unsigned/tampered assets.
- **Cold-start bootstrapping:** Allow public-open artifacts (URLs/media hashes) to seed clusters before embeddings are available.
- **Extensibility:** Modular indicator handlers (claims, media, accounts) with clear interfaces for new artifact types (e.g., LLM-generated image markers).
- **Privacy knobs:** Tenant-selectable ε and k; federation refuses envelopes exceeding budget; budgets are auditable.
- **Security hardening:** Memory-safe enclave code paths; FIPS-grade crypto; SBOM and signing for all binaries.

## 11. Future roadmap (forward-leaning enhancement)

- **Adaptive privacy-aware clustering:** Integrate streaming graph clustering that dynamically tightens or relaxes similarity thresholds based on live DP budget consumption and provenance confidence to maximize detection sensitivity while honoring privacy guarantees.
