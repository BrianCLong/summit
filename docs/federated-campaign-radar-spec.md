# Federated Campaign Radar (FCR) Specification

## 0. Authority & Alignment

This specification is governed by the Summit Readiness Assertion and the
Meta-Governance framework. All terms and controls defined here are aligned to
the repository authority files and must remain consistent with them:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`

## 1. Purpose and Scope

Federated Campaign Radar (FCR) enables multiple organizations to exchange actionable influence-campaign intelligence without disclosing sensitive underlying content. It provides a common signal ontology, privacy-preserving federation protocol, and operational workflows for early warning, investigation, and response routing.

## 2. Design Goals

- **Privacy-first federation:** Share hashed or embedded indicators plus aggregate statistics; never exchange tenant-proprietary content.
- **Early warning:** Detect coordinated narrative lift across tenants and regions with auditable confidence propagation.
- **Actionability:** Deliver narrative summaries, spreader insights, diffusion maps, and recommended playbooks tailored to governance controls.
- **Credential-aware scoring:** Fold in provenance assertions (e.g., C2PA validation) to raise or lower confidence in shared indicators.
- **Policy-as-code alignment:** Emit structured evidence compatible with NIST AI RMF controls and internal incident/risk workflows.

## 3. Reference Architecture

- **Signal Ingestion Adapters:** Per-tenant adapters normalize streams (social, messaging, web, dark web, paid media, takedown feeds) into the shared schema.
- **Signal Normalizer:** Validates schema conformance; attaches provenance results (e.g., C2PA verification outcome, signature chain, timestamp).
- **Privacy Guardrail Layer:** Applies hashing/embedding, PII scrubbing, and differential-privacy noise for counts before federation.
- **Federated Matching & Clustering:** Secure enclave or MPC workflow that performs cross-tenant similarity on narratives, media hashes, URL graphs, and actor coordination features.
- **Confidence Propagation Engine:** Propagates cross-tenant confidence using credential-aware weights and privacy budgets; maintains replayable logs.
- **Early Warning Service:** Detects cross-tenant spikes and triggers campaign start alerts with threshold tuning for time-to-detect vs false attribution.
- **Response Pack Generator:** Assembles narrative summary, top spreaders, channel diffusion, mitigation options, and recommended comms playbook.
- **Audit & Governance Layer:** Immutable logs, retention policies, and linkage to incident management; exports for compliance evidence.

## 4. Shared Signal Schema

Minimal fields (extendable via versioned schema):

- **entity_id**: Stable UUID for deduplication.
- **tenant_id**: Logical tenant identifier (pseudonymous in federation).
- **observed_at**: Timestamp (ISO8601) when signal observed.
- **signal_type**: `claim` | `media` | `url` | `account` | `coordination_feature`.
- **narrative_claim**: Canonicalized text claim or short description (hashed/embedded for federation).
- **media_hashes**: Perceptual hash (pHash/aHash/dHash), cryptographic hash, and optional CLIP embedding reference.
- **url**: Normalized URL (registered domain, path, UTM scrubbed) plus public archive URL when available.
- **account_handle**: Platform + handle (pseudonymized when required).
- **channel_metadata**: Platform, geo/locale (coarse), language, reach metrics (with DP noise if needed).
- **coordination_features**: Temporal burstiness, repost similarity, synchronized posting windows, repeated hashtag sets, shared creatives.
- **provenance_assertions**: C2PA verification result, signer identity (if public), binding to media hash, timestamp, signature chain status.
- **confidence_local**: Local model confidence for the indicator (0–1) and explanation pointer.
- **privacy_budget_cost**: DP budget consumed for the contribution (epsilon/delta attribution).
- **labels**: Campaign hypothesis tags, threat actor hypotheses, or playbook IDs.
- **version**: Schema version for forward compatibility.

### 4.1 Schema Invariants

- All federation-bound fields must be explicitly tagged as `public`, `pseudonymous`,
  or `tenant_private`.
- `provenance_assertions.c2pa_status` must be one of `valid`, `invalid`, or
  `missing`. Any other value is rejected at schema validation time.
- `privacy_budget_cost` is mandatory for all shared indicators to ensure auditable
  privacy accounting.

### 4.2 Federation Payload Example (redacted)

```json
{
  "entity_id": "4fc31a8b-8a7a-4ea6-8f3c-8d40a8fca5c9",
  "tenant_id": "tenant_hash_9b33",
  "observed_at": "2026-01-10T10:15:34Z",
  "signal_type": "media",
  "narrative_claim": "sha256:cf91e5...",
  "media_hashes": ["phash:ab13d4..."],
  "url": "sha256:8e0f7f...",
  "channel_metadata": { "platform": "video", "language": "en", "reach": "bucket_4" },
  "coordination_features": { "burstiness": "bucket_3", "co_post_window_s": 900 },
  "provenance_assertions": { "c2pa_status": "valid", "signature_chain": "sha256:4f2..." },
  "confidence_local": 0.82,
  "privacy_budget_cost": { "epsilon": 0.4, "delta": 1e-6 },
  "version": "1.0.0"
}
```

## 5. Privacy-Preserving Federation Protocol

1. **Preparation:**
   - Normalize signals to schema; compute embeddings/hashes; remove tenant-sensitive fields.
   - Attach provenance_assertions when available; sign payload with tenant key.
   - Apply DP noise to counts/metrics according to tenant policy.
2. **Submission:**
   - Send only hashed/embedded indicators, aggregate statistics, and public artifacts to the enclave/MPC coordinator.
   - Include privacy_budget_cost and per-field visibility flags.
3. **Secure Matching:**
   - Similarity search over embeddings and perceptual hashes for media/claim alignment.
   - Graph clustering over URL, actor, and coordination edges; edges weighted by provenance-aware confidence.
   - Confidence propagation blends local confidence, cross-tenant corroboration, and credential strength.
4. **Cluster Formation:**
   - Produce cluster IDs, centroid narratives, supporting public artifacts, participating tenant count, and confidence interval.
   - Track replayable computation trace for audits.
5. **Output Delivery:**
   - Tenants receive: rising clusters, shared public artifacts, anonymized tenant counts, confidence, and playbook recommendations.
   - No tenant-specific raw content or identifiers are shared.

## 6. Early-Warning & Action Routing

- **Trigger Conditions:** Cross-tenant cluster growth rate, coordination intensity, provenance-adjusted confidence, and geographic spread.
- **Alert Payload:** Narrative summary, public exemplars (URLs/media), top spreader accounts (pseudonymous where required), diffusion paths, and severity.
- **Response Pack:**
  - Recommended comms playbook, counter-narratives, channel-specific mitigations, and outreach checklist.
  - Controls mapping to NIST AI RMF functions (govern, map, measure, manage) and internal approval steps.
- **Routing:** Hooks to SOAR/ticketing (e.g., PagerDuty, JIRA) with immutable evidence links and replay logs.

## 7. Governance, Compliance, and Auditability

- **Immutable Logs:** Append-only ledger for submissions, federation runs, and alerts with cryptographic timestamps.
- **Privacy Accounting:** Per-tenant DP budget tracking with automatic refusal when budget exceeded.
- **Policy-as-Code:** Declarative rules for acceptable indicators, retention, sharing scope, and escalation paths.
- **Access Control:** Role-based access to tenant dashboards; enclave separation prevents data exfiltration.
- **Replayability:** Deterministic re-run of federation windows for post-incident review and regulator evidence.

## 8. Threat Model & Mitigations

- **Data Exfiltration Attempt:** Mitigated via enclave isolation, minimized payloads, and privacy budgets.
- **Poisoning Attacks:** Use provenance weighting, outlier detection, and cross-tenant corroboration thresholds.
- **Sybil Flooding:** Rate-limit per-tenant submissions and require cryptographic attestation for connectors.
- **Model Evasion:** Ensemble similarity (hash + embedding + graph signals) plus adaptive thresholds.
- **False Attribution Risk:** Explicit TTD/false-attribution optimization; require corroboration before high-severity alerts.
- **Credential Forgery:** Verify C2PA signatures and maintain signer reputation scores; distrust unverifiable chains.
- **Membership Inference:** Enforce k-anonymity gates and budget caps; reject low-support clusters.

## 9. Evaluation & KPIs

- **Time-to-Detect (TTD):** Median minutes from first signal to cross-tenant alert.
- **False Attribution Rate:** Share of alerts revised/withdrawn after human review.
- **Containment Delta:** Reduction in downstream reach after actioning alerts versus baseline.
- **Coverage:** Percentage of known campaign artifacts represented by clusters (by type: claims, media, URLs, actors).
- **Privacy Impact:** DP budget consumption per tenant per week; zero incidents of prohibited field leakage.
- **Confidence Calibration:** Brier score/expected calibration error for confidence propagation outputs.
- **Provenance Lift:** Delta in cluster confidence when C2PA-valid artifacts are present.

## 10. Integration & Extensibility

- **Connector SDK Hooks:** Standard ingestion contract for new channels; enforced schema validation.
- **Versioning:** Schema and protocol are versioned; backward compatibility via adapters and feature flags.
- **Deployment Modes:**
  - Single-tenant with offline federation replay for air-gapped environments.
  - Multi-tenant cloud with hardware enclaves (e.g., SEV/TDX) or MPC backends.
- **Observability:** Metrics for ingestion latency, cluster churn, alert volume, and DP budget utilization; traces for enclave runs.

## 11. State-of-the-Art Enhancements

- **Credential-aware propagation:** Elevate confidence based on verifiable C2PA credentials and signer reputation.
- **Adaptive privacy budgets:** Dynamically allocate epsilon based on campaign severity and tenant policy guardrails.
- **Replayable counterfactuals:** Simulate alternative thresholds to quantify containment delta and tune alerting.

## 12. Implementation Readiness Checklist

- Schema definitions committed (with versioning and validators).
- Enclave/MPC orchestration with attestations and automated rotations.
- DP accounting service with per-tenant budgets and refusal logic.
- Connector attestations and rate-limiting to mitigate sybil/poisoning.
- Audit replay harness and evidence export aligned to governance controls.
- Runbooks for incident response, rollback, and regulator-facing evidence bundles.
