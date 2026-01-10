# Provenance & Integrity Gateway (PIG)

## Purpose

The Provenance & Integrity Gateway (PIG) establishes trusted communications as a
first-class capability by default. It verifies the provenance of inbound media,
signs and versions outbound truth, exposes tamper evidence, and packages
incident response bundles that are audit-ready and compliant with our
policy-as-code posture.

## Operating Principles

1. **Credential-first**: Prefer signed artifacts (C2PA, Content Credentials,
   internal signing) and treat unsigned assets as higher risk with explicit
   handling paths.
2. **Tamper-evident by design**: Every transformation records immutable
   evidence in the provenance ledger and chains hashes to detect mutation.
3. **Governed automation**: Decisions that affect authenticity or revocation
   must be driven by policies defined in the Policy Engine (OPA) with full
   auditability.
4. **Separation of duties**: Signing, validation, revocation, and campaign
   detection are decoupled services linked through event streams.
5. **Minimal blast radius**: Outbound signing always publishes a revocation
   pointer and short-lived credential to enable clean rollback.

## Target Outcomes

- **Inbound**: Verify C2PA manifests when present; flag chain breaks; note
  credential absence; propagate validation context to downstream risk scoring.
- **Outbound**: Every official release (statements, press assets, videos,
  social cards) is signed, versioned, and traceable back to a revocation
  endpoint and provenance ledger entry.
- **Tamper evidence**: Users can prove what we actually published even when
  claims are ambiguous.
- **Incident response**: Lookalike/altered re-uploads trigger an automatically
  generated bundle with originals, diffs, timestamps, distribution graph, and
  recommended comms.

## Architecture (logical)

- **Ingress Validator** (`ga-graphai/packages/c2pa-bridge` +
  `ga-graphai/packages/data-integrity`): Parses C2PA/Content Credentials,
  validates signatures, preserves chain-of-custody metadata, and emits
  `MediaValidated` events with credential presence/absence.
- **Provenance Ledger** (`ga-graphai/packages/prov-ledger`): Stores immutable
  event chains (hash-linked) for all validations, signings, revocations, and
  incident bundles. Enforces WORM semantics and policy-as-code checks.
- **Signing Service** (`ga-graphai/packages/gateway` + `services/authz-gateway`):
  Issues outbound cryptographic credentials (short-lived), embeds revocation
  pointers, stamps version IDs, and records payload hashes.
- **Revocation & Replacement Protocol** (`ga-graphai/packages/policy` +
  `ga-graphai/packages/workflow-diff-engine`): Drives revocation decisions via
  OPA policies, publishes `AssetRevoked` / `AssetReplaced` events, and updates
  distribution manifests so downstream channels can retract or swap assets.
- **Similarity & Lookalike Watcher** (`ga-graphai/packages/threat-analytics`):
  Monitors re-uploads and near-duplicates; triggers diffing and bundle
  generation.
- **Response Packet Generator** (`ga-graphai/packages/workcell-runtime`): Builds
  tamper-evident truth bundles (original signed asset, diff highlights,
  timestamps, distribution map, recommended comms), signs the bundle, and logs
  it to the ledger.
- **Governance Console** (`docs/modules`, `ops/` playbooks): Surfaces systemic
  risk dashboards (DSA-aligned), audit trails, and control attestations.

## Flows

### Inbound media verification

1. Media enters ingestion pipeline; `c2pa-bridge` attempts manifest extraction.
2. `data-integrity` validates signatures and chain continuity.
3. Validation context (signer, issuance, revocation URLs, manifest status,
   credential absence) is emitted as `MediaValidated` to the ledger and shared
   with the policy engine for downstream scoring.
4. Campaign detection (optional) can consume the enriched context later; the
   gateway remains authoritative for provenance truth.

### Outbound signing

1. Author submits an official asset (statement, video, social card) through the
   Signing Service.
2. OPA policies verify authorization and required controls (redaction,
   classification, embargo windows).
3. Service signs the asset, assigns `version_id`, embeds `revocation_pointer`,
   and stores hashes + metadata in the provenance ledger.
4. Distribution manifests include the credential reference so channels can
   validate authenticity client-side.

### Revocation and replacement

1. A revocation request is opened (compromise, superseded content, policy
   violation). OPA policies evaluate justification, blast radius, and
   communication plan.
2. On approval, the Revocation Protocol emits `AssetRevoked` (and optionally
   `AssetReplaced` with new version), updates distribution manifests, and posts
   revocation proofs to the ledger.
3. Downstream channels subscribe to these events to retract/replace content.

### Impersonation / tampering incident

1. Threat watcher flags a lookalike or altered re-upload.
2. Response Packet Generator pulls the signed original from the ledger,
   computes diffs, assembles a distribution graph, and creates a tamper-evident
   bundle with recommended comms.
3. Bundle is signed and stored; comms/IR teams receive actionable packet
   aligned to governance policies.

## Governance & Compliance

- **Policy-as-code**: All issuance, validation, and revocation gates are
  expressed as OPA policies in `ga-graphai/packages/policy` with evidence
  logged to the ledger.
- **AI RMF alignment**: Risk controls map to NIST AI RMF functions (Govern,
  Map, Measure, Manage) with control IDs recorded in the ledger entries.
- **DSA/UK electoral guidance**: Systemic risk dashboard highlights narratives
  and high-risk contexts; operational playbooks live in `ops/` and
  `docs/modules`.
- **Audit readiness**: Every bundle and event includes signer, hash chain,
  timestamp, and policy decision trace.

## Delivery Plan (phased)

1. **Phase 1: Foundational signing & validation**
   - Harden `c2pa-bridge` validation paths and ensure credential-absence flags
     propagate to risk scoring.
   - Enable outbound signing for official assets with revocation pointers and
     ledger writes.
2. **Phase 2: Revocation & replacement protocol**
   - Implement OPA-backed revocation workflows; emit `AssetRevoked` events;
     publish subscriber manifest format for channel pullback.
3. **Phase 3: Tamper-evident bundles & IR automation**
   - Wire threat analytics watcher to diff engine; auto-generate signed truth
     bundles with distribution graphs and comms templates.
4. **Phase 4: Governance dashboards**
   - Surface systemic risk narratives, control coverage, and evidence summaries;
     integrate with compliance attestation flows.

## Metrics & SLOs

- **Validation coverage**: % inbound media with validated credentials vs
  unsigned; % chain-of-custody preserved.
- **Signing adoption**: % outbound official assets signed + discoverable
  revocation pointers.
- **Revocation MTTR**: Median time from request to propagated revocation across
  channels.
- **Incident readiness**: Time to generate truth bundle after detection; number
  of channels consuming bundles.
- **Audit completeness**: % events with policy decision trace attached and
  hash-chain continuity verified.

## Risks & Mitigations

- **Unsigned media ambiguity**: Maintain explicit "credential absent" handling
  paths and user-facing warnings; prioritize signing for outbound to reduce
  reliance on classification alone.
- **Key management**: Use HSM-backed keys with short-lived credentials and
  rotation playbooks; store key operations in the ledger.
- **Propagation gaps**: Distribution manifests must be subscribed by all
  channels; include dead-letter queues and retries with monitoring.
- **False positives in similarity detection**: Thresholds and reviewer-in-loop
  controls enforced via policy; evaluation datasets logged for tuning.

## Forward-looking enhancements

- **Selective disclosure credentials**: Support privacy-preserving claims
  (verifiable credentials with minimal attribute disclosure) for sensitive
  assets.
- **Client-side verification SDK**: Lightweight JS/Native SDK for downstream
  channels to verify signatures, revocations, and bundle authenticity locally.
- **Zero-knowledge tamper proofs**: Explore zkSNARK-based proofs for bundle
  integrity to harden against compelled disclosure scenarios.
