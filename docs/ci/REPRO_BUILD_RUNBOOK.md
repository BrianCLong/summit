# Reproducible Build Gate Runbook

## Definition

Reproducibility means the same commit produces byte-identical build artifacts when built twice in clean,
isolated workspaces. The gate validates deterministic outputs by rebuilding, canonicalizing text artifacts,
and comparing digests while flagging nondeterminism indicators (timestamps, unstable ordering, and
bundler-variant outputs).

## How the Gate Works

1. Two isolated workspaces are created from the same commit (git archive preferred).
2. Dependencies are installed in each workspace using a local pnpm store per run.
3. Builds execute for the policy-selected workspaces.
4. Artifacts matched by policy globs are collected, normalized, and hashed.
5. Reports compare digests and record nondeterminism indicators.

## Modes

- **fast**: scoped workspaces and targeted dist outputs for PRs.
- **full**: all workspaces and dist/build artifacts for main and nightly runs.

## Local Usage

```bash
pnpm ci:repro-build -- --mode fast
pnpm ci:repro-build -- --mode full
```

Optional environment toggles:

- `REPRO_BUILD_OFFLINE=1` uses `pnpm install --offline` when available.

## Interpreting the Report

The gate writes evidence to `artifacts/governance/repro-build/<sha>/`:

- `report.json`: canonical comparison results, sorted for deterministic output.
- `report.md`: human-readable summary and remediation tips.
- `stamp.json`: status, policy hash, and report hash.
- `diffs/`: normalized diffs for a limited set of mismatched text artifacts.

Key report sections:

- `missing_in_run2` / `extra_in_run2`: file ordering or bundler hash drift.
- `digest_mismatches`: identical paths with different canonical digests.
- `nondeterminism_indicators`: embedded timestamp patterns or unstable line ordering (these fail the gate).

## Policy Adjustments

Policy lives in `docs/ci/REPRO_BUILD_POLICY.yml` and defines:

- workspaces and artifact globs per mode
- normalization rules for text artifacts
- ignore globs for volatile outputs

Adjust policy conservatively. Over-normalization can hide real nondeterminism.
Only normalize content that is explicitly allowed by governance and document the
rationale in the policy change.
