# Transparency Log Standard

Defines the append-only log used to register capsule metadata and commitments.

## Objectives

- Provide immutable evidence of capsule creation.
- Allow independent verification of commitments and replay tokens.

## Log Entry Schema (Logical)

```yaml
log_entry:
  entry_id: <uuid>
  created_at: <rfc3339>
  capsule_id: <uuid>
  commitment:
    merkle_root: <hex>
    algorithm: <string>
  replay_token_ref: <string>
  policy_version: <string>
  signature:
    signer: <string>
    signature: <base64>
```

## Operational Rules

- Entries are appended only; deletion is prohibited.
- Entries are signed by a service identity.
- Consumers validate signatures and commitments before trust.
