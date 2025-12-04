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
