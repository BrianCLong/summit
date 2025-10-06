# Provenance Ledger Blueprint

## Objective
Deliver immutable, auditable records for every MCP session and tool invocation. Ledger entries provide provenance proofs required for compliance (SOC2, ISO 27001) and power deterministic replay attestation.

## Data Model
- `ledger_entry_id`: ULID.
- `session_id`: Correlates to MCP session trace.
- `tenant_id`: IntelGraph tenant slug (hashed for storage isolation).
- `event_type`: `session_start` | `tool_invocation` | `replay` | `rtbf_action`.
- `payload_hash`: SHA-256 of normalized payload (post-redaction).
- `recording_pointer`: Object store URI (versioned, write-once).
- `sbom_digest`: SHA-256 from signed tool bundle manifest.
- `retention_tier`: `standard-365d` | `pii-30d` | `legal-hold`.
- `policy_decision_id`: OPA decision trace identifier.
- `capability_token_id`: Reference to scoped token used.
- `signature`: Ed25519 signature issued by Ledger KMS key (per-tenant envelope).
- `created_at`: RFC3339 timestamp.

## Operations
1. **Ingest** — Router emits ledger event via append-only gRPC stream; ledger service batches and writes to PostgreSQL + object store.
2. **Seal** — Nightly task checkpoints ledger with Merkle root anchored to AWS QLDB + internal transparency log.
3. **Export** — Warrant-bound export generates signed manifest, zipped recordings, and policy decision replay pack.
4. **RTBF** — For eligible tiers, ledger marks entry `tombstoned` and purges recordings within 30 minutes while retaining salted hash for audit.

## Controls
- Write-once S3 bucket with bucket policy requiring MFA delete.
- Ledger service runs with mTLS and short-lived certificates.
- Hashes and signatures verified during replay to prevent tampering.
- Access mediated through OPA policies enforcing purpose tags.

## Evidence
- `tests/compliance/rtbf-flow.spec.ts` (automated RTBF validation).
- `docs/demos/replay-demo.md` (walkthrough linking ledger proof to replay).
- `benchmarks/shootout/results.json` includes ledger hash for transparency.

## Open Questions
- Evaluate QLDB vs. custom Merkle tree anchored to Git transparency log.
- Determine storage class transitions (Glacier) for expired tenants.
- Align ledger schema with IntelGraph privacy taxonomy updates.
