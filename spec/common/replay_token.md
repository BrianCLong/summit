# Replay Token Standard

Defines the deterministic replay token used to recompute capsule artifacts.

## Design Goals

- Stable identifiers to bind outputs to time, policy, and schema versions.
- Deterministic recomputation without depending on mutable upstream state.
- Minimal size for transport across APIs and logs.

## Token Contents (Logical)

```yaml
replay_token:
  token_version: <semver>
  snapshot_id: <string>
  time_window:
    start: <rfc3339>
    end: <rfc3339>
  policy_version: <string>
  schema_version: <string>
  index_version: <string>
  seed: <string>
  salt: <string>
```

## Generation Rules

- **Snapshot ID** must reference immutable storage or an immutable event window.
- **Policy version** must reflect the policy-as-code bundle used to authorize.
- **Schema version** must match the capsule artifact schemas.
- **Seed + salt** drive deterministic sampling when budgets limit outputs.

## Replay Procedure

1. Validate token version and schema compatibility.
2. Load snapshot by ID, constrain to time window.
3. Apply policy bundle and disclosure budgets referenced by token.
4. Recompute artifacts using seed and salt for deterministic sampling.

## Validation & Auditing

- Replay operations should produce a witness record and log a replay event.
- Any mismatch between recomputed artifacts and commitments is a defect.
