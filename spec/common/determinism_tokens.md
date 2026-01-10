# Determinism Tokens

Determinism tokens allow replay of probabilistic or policy-constrained workflows by capturing
stable inputs and versioning metadata.

## Token Schema

| Field            | Type   | Description                                   |
| ---------------- | ------ | --------------------------------------------- |
| `snapshot_id`    | string | Immutable snapshot reference for data inputs. |
| `seed`           | string | Random seed for probabilistic models.         |
| `model_versions` | array  | Versions of models used in computation.       |
| `policy_version` | string | Policy bundle or rule set hash.               |
| `timestamp`      | string | RFC 3339 creation timestamp.                  |
| `environment_id` | string | Runtime or sandbox environment identifier.    |

## Usage Patterns

- **CIRW:** Replay clustering decisions with same feature set and seed.
- **FASC:** Recompute feed calibration over a fixed outcome window.
- **PQLA:** Re-execute analytic operations under identical policy constraints.
- **SATT:** Rebuild transform receipts tied to specific template measurement hashes.
- **QSDR:** Validate canary-trigger decisions under replayed query logs.

## Validation Requirements

- Tokens must reference immutable snapshot IDs.
- Model and policy versions must be resolvable in artifact registries.
- Replay must emit a compliance decision log entry referencing the token.
