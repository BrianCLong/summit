# Determinism Tokens

Determinism tokens make probabilistic or dynamic processes replayable for audit and debugging.

## Structure

- `snapshot_id`: Dataset or feature store snapshot reference.
- `seed`: RNG seed or initialization vector used by probabilistic models.
- `version_set`: Versions of models, policies, templates, and code.
- `time_window`: Optional bound for time-sensitive analytics.

## Usage by Domain

- **CIRW:** Reproduce clustering decisions and identity merges/splits for a given batch.
- **FASC:** Re-run calibration with the same outcome horizon to verify quarantine triggers.
- **PQLA:** Replay sandboxed analytics with fixed seeds for randomized privacy transforms.
- **SATT:** Re-execute transform templates against the same measurement hash and license budget.
- **QSDR:** Re-simulate module execution with canary triggers to confirm kill decisions.

## Storage

Embed determinism tokens inside witnesses, receipts, and calibration artifacts; also anchor them in the transparency log for independent verification.
