# Provenance Model

This document describes the end-to-end claim and evidence provenance model for the Summit intelligence stack. The model is designed to satisfy Black-Cell guardrails by enforcing immutable, tamper-evident records and cryptographically signed exports.

## Core Concepts

### Claim
A **claim** expresses an analytic assertion about an entity (for example, a network, actor, or incident). Every claim references:

- The entity and scope to which the assertion applies.
- The analytic disposition and confidence.
- A collection of evidence links proving how the claim was produced.

### Evidence
**Evidence** captures the observable artifacts, transformations, and decision points that justify a claim. Evidence is recorded at three control points:

1. **Ingest** – raw collection as it enters the platform.
2. **Transform** – enrichment, fusion, or model inference steps that derive intermediate products.
3. **API / Delivery** – final material returned to clients or exports.

Each evidence record carries:

- Immutable content hash (`sha256` of canonicalized payload).
- Stage (`ingest`, `transform`, or `delivery`).
- Actor/process identifiers and timestamps.
- Optional transformation chain metadata (list of processors, parameters, versions).
- Ledger sequence pointer used for verification.

### Ledger
All evidence events are appended to a tamper-evident ledger. Entries are chained by hash and signed with an Ed25519 key registered in the ledger header. The ledger root hash is exported with each bundle for downstream verification.

## Lifecycle Attach Points

### 1. Ingest Pipeline
- The ingest service computes a `sha256` over canonicalized raw payloads.
- `appendLedgerEntry` is invoked with stage `ingest`, storing the hash, collection metadata, and ingestion actor.
- The claim skeleton is created with a placeholder evidence pointer referencing the ledger sequence.

### 2. Transform & Analytics
- Each transformation step (feature extraction, model inference, analyst review) records a new ledger entry referencing the upstream evidence via `prevHash` and `claimId`.
- Transformation metadata captures algorithm identifiers, model versions, and configuration digests.
- Claims accumulate evidence nodes; `transformChain` is maintained so exports can show the path of derivations.

### 3. API Response / Export
- When the API aggregates and returns an entity, the service materializes the claim with all ledger-backed evidence pointers.
- The `buildEvidenceChain` helper assembles chronological evidence with actor, timestamp, and artifact URIs for the API response.
- The export manifest is generated, hashed, and signed with the export-signing key. The manifest references the ledger root hash and every included ledger sequence, making tampering detectable.

## Data Model Summary

The JSON Schema in [`schema.json`](./schema.json) defines the canonical interchange format used across services.

Key relationships:

- `Claim` contains `evidence[]`, each linking to a `LedgerEntry` by `ledgerSequence`.
- `LedgerEntry` ensures append-only integrity via `prevHash`, `hash`, and `signature`.
- `ExportManifest` packages claims, artifacts, ledger references, and digital signatures for egress.

## API Integration

A `/provenance/:entityId` API endpoint leverages `buildEvidenceChain(entityId, manifest, ledger)` to retrieve the complete evidence chain for any entity returned by analytic APIs. The endpoint:

1. Resolves the manifest associated with the response (from cache or export pipeline).
2. Loads the immutable ledger snapshot for the bundle.
3. Returns the ordered evidence chain—including actors, timestamps, and hashes—for client inspection.

## Audit & Verification Workflow

1. **Recording** – Services call `appendLedgerEntry` whenever a claim transition occurs. The helper enforces sequencing, signs entries, and updates the ledger root hash.
2. **Manifest Generation** – `signManifest` calculates the canonical manifest hash and applies an Ed25519 signature for exports.
3. **Verification** – External auditors use `provenance-cli verify-manifest --manifest <bundle> --ledger <ledger> --public-key <export.pem>` to confirm:
   - Ledger chain integrity.
   - Ledger root hash alignment with the manifest.
   - Evidence hash parity between manifest and ledger.
   - Valid manifest signature.
4. **Tamper Detection** – Any mutation to claims, evidence hashes, or ledger entries breaks the hash chain or signature verification and is surfaced by the CLI.

## Black-Cell Guardrails

- **No Unsigned Egress** – All exports must include the signed manifest; consumers reject unsigned bundles.
- **Immutable Ledger** – Ledger files are append-only JSON structures replicated to the Black-Cell immutable store. Verification ensures sequence continuity and signature validity.
- **Verifiable Hashes** – Every artifact is referenced by content hash. API responses expose the hashes so downstream systems can validate payload integrity independently.

This model enables a consistent, cryptographically verifiable provenance story from ingestion through external delivery.
