# Switchboard V2: Task Capsules + Replay

## Capsule Model

A task capsule is a hermetic execution envelope that makes agent runs reproducible, auditable, and
policy-gated. Each capsule is defined by a manifest plus a workspace snapshot and emits a
hash-chained ledger of every decision and execution.

### Manifest Fields

- `allowed_paths.read` / `allowed_paths.write`: allowlists for file access (use trailing `/` to mark directories).
- `allowed_commands`: explicit executable allowlist (supports `*` prefix matching).
- `network_mode`: `off` (default) or `on`.
- `env_allowlist`: environment variables permitted into the capsule.
- `time`: pinned `timezone`, `locale`, and optional `fixed_time` (mapped to `SOURCE_DATE_EPOCH`).
- `secret_handles`: opaque handles permitted for secret access.
- `waivers`: time-boxed waiver tokens for emergency overrides.
- `steps`: ordered commands with declared reads/writes, network intent, and optional test category.

### Safety Defaults

- **Network off by default** (`network_mode: off`).
- **Secrets off by default** (must be listed in `secret_handles` and provided by env).
- **Every exec/write logged** in the capsule ledger with hash chaining.

Secrets are injected via environment variables named `SWITCHBOARD_SECRET_<HANDLE>` so values remain
opaque in logs and the ledger.

Waivers are treated as governed exceptions and are always recorded in the ledger.

## CLI Workflow

Run a capsule, generate evidence, and replay deterministically:

```bash
# Run capsule
switchboard run --capsule .summit/capsules/demo.yaml

# Generate evidence bundle
switchboard evidence <session_id>

# Replay and compare
switchboard replay <session_id>
```

## Ledger + Evidence

Each capsule run emits:

- `ledger.jsonl`: append-only entries with hash chaining.
- `diff.patch`: workspace changes relative to the snapshot.
- `outputs/`: stdout/stderr for every step.
- `test-results.json`: extracted test results when steps are marked as `category: test`.
- `ledger-verification.json`: hash-chain verification results for the ledger.

Use `switchboard evidence <session_id>` to copy manifest, ledger, diffs, and outputs into the
`.switchboard/evidence/` bundle for audit or regression review.
