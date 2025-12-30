# Audit Trail (Append-Only) - Design & Operations

## Overview

This document describes the append-only audit event system for Summit/IntelGraph. It covers the schema, storage layout, tamper-evidence controls, export pipeline, and verification flow. The implementation is intentionally small and self-contained so it can run in dev and CI without external dependencies.

## Event Schema (v1)

- **Version:** `audit_event_v1`
- **Fields:** actor, action, resource, classification, policy_version, decision_id, trace_id, timestamp, customer, metadata
- **Classification enums:** `public | internal | confidential | restricted`
- Schema source: [`schemas/audit_event_v1.json`](../../schemas/audit_event_v1.json)

### Redaction policy

| Classification | Export Rule                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| public         | No redaction                                                                               |
| internal       | Drop `actor.ip_address`                                                                    |
| confidential   | Drop `actor.ip_address`, `actor.id`, `resource.id`, `resource.owner`                       |
| restricted     | Keep only types/action + decision identifiers; metadata replaced with `{ redacted: true }` |

## Storage & Tamper Evidence

- Storage: append-only JSONL file at `logs/audit/audit-events.jsonl` (configurable via `AUDIT_EVENT_STORE`).
- Each record contains `{sequence, recorded_at, prev_hash, payload_hash, hash, event}`.
- Hash chain: `hash = sha256(sequence, recorded_at, prev_hash, payload_hash)` where `payload_hash = sha256(event JSON)`. The chain anchors to `GENESIS` for the first record.
- Verification: replays the log to ensure `prev_hash` continuity and recomputes each `hash`.

## Writer library usage

- Library: `server/src/audit/appendOnlyAuditStore.ts`.
- Service integration: `server/src/services/audit/AuditTrailService.ts` used in the `/health/detailed` flow to record health-check decisions with classification `internal`.
- Validation: Ajv enforces the v1 schema on every append.

## Exporter CLI

- Command: `intelgraph audit export --customer <id> [--from ISO] [--to ISO] [--store <path>] [--signing-key <pem>]`.
- Output: directory containing `events.jsonl` (redacted), `manifest.json` (signed), and optional `public.pem` when a signing key is provided.
- Manifest contents: export window, event count, hash chain start/end, redaction rules, public key, and signature.
- Verification: `intelgraph audit verify path/to/manifest.json [--public-key public.pem] [--events events.jsonl]` validates the chain and Ed25519 signature.

## Threat Model Notes

- **Tampering:** Mitigated by chained hashes and signed manifest. Altering a single record breaks verification.
- **Replay:** Timestamped sequence numbers prevent unnoticed reordering; manifest captures start/end hashes.
- **Key theft:** Signing keys are externalized (`--signing-key` path). Public key is embedded in the manifest for audit consumers; rotate keys by changing the signing key path.
- **PII exposure:** Classification-aware redaction removes actor/resource identifiers for `confidential` and `restricted` data in exports.
- **Availability:** Append-only file avoids DB dependency; failure to append is logged and does not block health responses.

## Sample Export Pack

A reference export is stored in `samples/audit-export/sample/`:

- `events.jsonl` – redacted audit records with hash continuity metadata
- `manifest.json` – signed manifest including embedded public key
- `manifest.sig` – detached base64 signature (optional convenience)

Verification example:

```bash
intelgraph audit verify samples/audit-export/sample/manifest.json --events samples/audit-export/sample/events.jsonl
```

## Operational Playbook

1. **Write events:** use `auditTrailService.recordPolicyDecision` in services requiring immutable audit.
2. **Verify chain locally:** `node -e "import('./server/src/audit/appendOnlyAuditStore.ts').then(m => m.default?.verify?.())"` or the CLI verify command on exports.
3. **Rotate store location:** set `AUDIT_EVENT_STORE=/var/log/intelgraph/audit-events.jsonl` and ensure directory permissions are append-only for the service user.
4. **Key management:** keep signing keys in vault/secret manager; provide a PEM path to the exporter. Distribute only the public key.
5. **Incident response:** regenerate an export for the incident window, verify signature + chain, and archive the manifest plus public key as evidence.
