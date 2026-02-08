# Receipts and Replay

## Purpose

Receipts are the audit-grade record of every Switchboard action. Replay is deterministic verification from evidence bundles alone.

## Receipt Principles

- **Content-addressed**: Receipt hashes are derived from canonical JSON.
- **Signed**: Each receipt is signed with the runtime signing key.
- **Policy-linked**: Receipts record policy decisions with rule references.
- **Redaction-safe**: Redaction is applied without breaking hashes (redaction receipts are chained).

## Receipt Contents (v0.1)

- `receipt_id`
- `timestamp`
- `actor` (user/tenant)
- `skill_id` + `skill_digest`
- `inputs_hash` + `outputs_hash`
- `policy_decisions` (rule IDs + explain tree)
- `environment` (sandbox version, runtime digest)
- `signatures`
- `parent_receipt_id` (for chained actions)

## Evidence Bundle

Evidence bundles are deterministic exports that contain receipts and validation artifacts.

**Minimum bundle contents:**

- `report.json`
- `metrics.json`
- `stamp.json`
- `receipts/` (receipt chain)
- `policy/` (policy digest + rule set)
- `skills/` (skill digests + signature proofs)

## Deterministic Replay

Replay verifies:

- Receipt chain integrity
- Signature validity
- Policy decision integrity
- Skill digest and sandbox version

Replay output must be deterministic for identical inputs. Divergence is a gate failure.

## Redaction Flow

1. Original receipt is sealed.
2. Redaction receipt references original hash.
3. Redacted receipt replaces fields but preserves verifiable chain.
4. Shareable bundles contain only redacted receipts.
