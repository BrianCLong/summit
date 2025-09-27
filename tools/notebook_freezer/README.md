# Reproducible Notebook Freezer (RNF)

RNF builds deterministic bundles from executed Jupyter notebooks. A bundle captures:

- A copy of the notebook with its execution order.
- A `pip freeze` environment lock with a checksum.
- Fingerprints for optional datasets.
- Normalised per-cell outputs.
- A standalone `replay.py` script that re-executes the notebook and verifies that
  the regenerated artifacts match the frozen outputs.

## Commands

Run the CLI with `python -m tools.notebook_freezer <command>`.

- `freeze <notebook.ipynb>` — create a `<notebook>.rnf` bundle.
  - `--output <path>` overrides the bundle directory.
  - `--data <paths...>` fingerprints additional files or directories.
  - `--archive` produces a `.zip` archive alongside the bundle directory.
- `replay <bundle>` — execute the notebook and verify outputs.
- `diff <bundle-a> <bundle-b>` — render a unified diff of output changes.
- `cache-key <bundle>` — print the cache key derived from the notebook, data, and
  environment hashes.
- `ci-check` — replay every `*.rnf` bundle in the repository to block
  nondeterministic outputs in CI.

## Replay contract

The generated `replay.py` imports the CLI and executes the `replay` command.
Replay runs record a report under `<bundle>/replays/<timestamp>/report.json` and
fail fast if any artifact hash differs. The same hashing routine is exposed by
`cache-key`, making cache invalidation deterministic.
