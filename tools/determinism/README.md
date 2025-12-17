<<<<<<< HEAD
# Reproducible Build Verifier

This tool verifies if a build process is deterministic by running it twice and comparing the outputs.

## Usage

```bash
python3 tools/determinism/repro_verifier.py \
  --build-command "npm run build" \
  --output-dir "dist" \
  --clean-command "npm run clean"
```

## Arguments

- `--build-command`: The command used to build the project (required).
- `--output-dir`: The directory containing the build artifacts (required).
- `--clean-command`: A command to clean the workspace before each build (optional).
- `--work-dir`: The working directory to run commands in (default: current directory).

## Output

The tool will output:
- Whether the builds are identical.
- A list of differing files.
- Unified diffs for text files that differ.
- Exit code 0 if deterministic, 1 if differences found.
=======
# Deterministic Build Enforcer

`tools/determinism/diff.py` compares two build outputs or manifests, detects nondeterministic signatures, and fails by default when artifacts drift.

## Usage

Run against two build directories (or JSON manifests containing an `artifacts` array) and optionally compare SBOMs:

```bash
python3 tools/determinism/diff.py build-output-run1 build-output-run2 \
  --sbom1 build-output-run1/app.sbom.json --sbom2 build-output-run2/app.sbom.json
```

### Flags
- `--warn-only` – keep printing differences but exit 0 (useful for exploratory runs).
- `--output <path>` – emit a JSON report that includes per-artifact statuses, nondeterminism hints, and SBOM comparison results.

## What gets flagged
- Hash mismatches with contextual hints (timestamps, UUIDs, temp paths, build IDs, or unstable line ordering).
- Missing/extra artifacts across runs.
- SBOM drifts after normalization (timestamps and creation metadata stripped).

The checker limits inline content inspection to 512 KB per file to avoid heavy memory usage; large files still produce hash-based differences.
>>>>>>> main
