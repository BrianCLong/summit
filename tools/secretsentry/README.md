# SecretSentry

SecretSentry is a deterministic secret scanning tool used by Summit to keep sensitive
material out of Git history. The scanner ships as a Python package with a small CLI and
a companion GitHub Action workflow template so teams can opt in without touching
application services.

## Features

- Pattern rules for common credentials (AWS, GitHub, Google, OAuth, Stripe, Slack, JWTs).
- Entropy-based detection with heuristics to avoid noisy false positives.
- Allowlist file (`.secretsentryignore`) supporting glob patterns for path suppression.
- Automatic discovery of `.secretsentryignore` in the scan root (or pass a relative/absolute
  path to a custom allowlist).
- Deterministic JSON and Markdown artifacts suitable for CI snapshot tests.
- Progressive enforcement support via `--mode warn|block` flag for staged rollouts.

## Usage

```bash
# Scan the current repository, automatically using .secretsentryignore when present
secretsentry scan --path .

# Provide an explicit allowlist path relative to the target directory
secretsentry scan --path ./submodule --allowlist .secretsentryignore

# Fail the build when findings are present
secretsentry scan --mode block

# Write explicit report paths
secretsentry scan --json-report ./reports/secrets.json --markdown-report ./reports/secrets.md
```

## Allowlist Format

The allowlist is an optional newline-delimited file containing shell-style glob patterns.
Entries may ignore entire files or directories. Lines beginning with `#` are treated as
comments. When a scanner run is provided `--allowlist`, the path is resolved relative to the
scan root unless absolute. Example:

```
# Ignore generated fixtures
**/tests/fixtures/**
```

## GitHub Action

Two workflow templates are provided under `tools/secretsentry/github/`.

- `secretsentry-warn.yml` keeps the job non-blocking and is intended for the one-week burn-in.
- `secretsentry-block.yml` flips the job to a required, blocking enforcement mode.

Each template relies on a deterministic execution (`pip install .` and `secretsentry scan`).
Teams can copy either file into `.github/workflows/` when they are ready to adopt the
scanner.

## Development

Install development dependencies with:

```bash
pip install -e .[test]
```

Run the unit suite:

```bash
pytest
```
