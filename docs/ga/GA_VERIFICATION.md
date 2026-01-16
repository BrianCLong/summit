# GA Verification - Release Train Ready

This document describes the **canonical GA verification path** for Summit.

## Overview

The GA verification system proves release readiness through:

1. **Single deterministic command** (`pnpm ga:verify`)
2. **Content-addressed artifacts** (no timestamps, no environment variance)
3. **Reproducible outputs** (same SHA → byte-identical artifacts)
4. **Cloud-ready markers** (`GA_READY.json` for deploy pipelines)

## The Single GA Command

```bash
pnpm ga:verify
```

This command:
- Runs all critical GA gates (typecheck, lint, build, tests)
- Produces deterministic proof artifacts under `artifacts/ga-proof/<git-sha>/`
- Validates that no non-deterministic fields exist in outputs
- Generates checksums for all artifacts
- Creates a release-readiness marker

### What It Does

The command executes these steps in order:

1. **typecheck** - TypeScript type checking across the monorepo
2. **lint** - ESLint + Ruff linting
3. **build** - Full production build
4. **server:test:unit** - Server unit tests in GA mode
5. **ga:smoke** - Basic smoke tests (optional)

All critical steps must pass. Non-critical steps (like smoke tests) are logged but don't block.

## The Artifact Contract

After running `pnpm ga:verify`, you get a content-addressed artifact directory:

```
artifacts/ga-proof/<git-sha>/
├── stamp.json          # Deterministic proof record
├── report.json         # Summary report with evidence
├── checksums.txt       # SHA-256 checksums of all artifacts
└── logs/              # Full logs for each step
    ├── typecheck.log
    ├── lint.log
    ├── build.log
    └── ...
```

### stamp.json

Contains:
- Git context (SHA, branch, dirty flag)
- Toolchain fingerprint (Node, pnpm, git versions)
- Step execution results (status, exit code, duration, log hash)
- Overall proof status

**NO TIMESTAMPS.** All fields are deterministic.

### report.json

Contains:
- Proof summary (passed/failed counts)
- Determinism validation results
- Evidence IDs for audit trail

### checksums.txt

Standard SHA-256 checksums in format:
```
<hash>  <relative-file-path>
```

## How Auditors Verify

### Local Verification

```bash
# Run the proof
pnpm ga:verify

# Inspect artifacts
SHA=$(git rev-parse HEAD)
cat artifacts/ga-proof/${SHA}/report.json
cat artifacts/ga-proof/${SHA}/checksums.txt

# Generate readiness marker
pnpm ga:readiness-marker
cat GA_READY.json
```

### CI Verification

The `.github/workflows/release-determinism-gate.yml` workflow enforces:

1. **Artifact structure** - All required files exist
2. **No timestamps** - Banned fields and ISO timestamps are rejected
3. **Sorted JSON keys** - Ensures deterministic JSON serialization
4. **Report status** - Must be `PASSED`
5. **Determinism check** - Must have zero violations
6. **Readiness marker** - `GA_READY.json` must be valid

### Re-run Reproducibility

To verify reproducibility:

```bash
# Run proof twice on same SHA
pnpm ga:verify
SHA=$(git rev-parse HEAD)
cp -r artifacts/ga-proof/${SHA} /tmp/proof-run-1

# Clean and re-run
rm -rf artifacts/ga-proof/${SHA}
pnpm ga:verify
cp -r artifacts/ga-proof/${SHA} /tmp/proof-run-2

# Compare (should be byte-identical)
diff -r /tmp/proof-run-1 /tmp/proof-run-2
```

**Note:** Logs may differ due to timing or output buffering, but `stamp.json` and `report.json` must be identical.

## Release Readiness Marker

After successful GA proof, generate the cloud-readiness marker:

```bash
pnpm ga:readiness-marker
```

This creates:
- `artifacts/ga-proof/<sha>/GA_READY.json`
- `GA_READY.json` (copy at repo root)

### GA_READY.json Contract

```json
{
  "schema": "ga-readiness-marker-v1",
  "version": "1.0.0",
  "git": {
    "sha": "<commit-sha>",
    "branch": "<branch>",
    "isDirty": false,
    "shortSha": "<short-sha>"
  },
  "toolchain": {
    "node": "v20.x.x",
    "pnpm": "10.0.0",
    "git": "2.x.x"
  },
  "gaProof": {
    "status": "PASSED",
    "artifactDir": "artifacts/ga-proof/<sha>",
    "attestation": {
      "stampHash": "<sha256>",
      "reportHash": "<sha256>",
      "checksumsHash": "<sha256>"
    },
    "summary": {
      "status": "PASSED",
      "totalSteps": 5,
      "passed": 5,
      "failed": 0,
      "criticalPassed": 4,
      "criticalFailed": 0
    }
  },
  "releaseTrainReady": true,
  "cloudDeployReady": true
}
```

### Cloud Deploy Consumption

Cloud pipelines can:

1. Check for `GA_READY.json` in the repo
2. Verify `releaseTrainReady === true`
3. Fetch proof artifacts from `artifactDir`
4. Validate attestation hashes
5. Proceed with deployment

No live execution or network calls required—proof is already complete.

## Determinism Enforcement

### What Is Banned

The determinism validator rejects:

**Banned keys:**
- `timestamp`, `startedAt`, `finishedAt`, `lastHeartbeatAt`
- `createdAt`, `updatedAt`, `now`, `date`, `time`
- `hostname`, `host`, `username`, `user`
- `pid`, `processId`, `randomId`, `uuid`, `guid`

**Banned values:**
- ISO timestamp strings (e.g., `2024-01-15T12:34:56Z`)
- Absolute file paths with usernames
- Random IDs or UUIDs

### What Is Allowed

- Git SHA (deterministic from repo state)
- Toolchain versions (pinned)
- Exit codes, durations (from deterministic execution)
- Content hashes (SHA-256 of files/strings)

### Validation

```bash
# Manual validation
node -e "
const { validateDeterminism } = require('./scripts/release/lib/determinism.mjs');
const stamp = require('./artifacts/ga-proof/<sha>/stamp.json');
const violations = validateDeterminism(stamp);
if (violations.length > 0) {
  console.error('Violations:', violations);
  process.exit(1);
}
console.log('✓ Deterministic');
"
```

## Integration with Existing Workflows

### make ga (Legacy Flow)

The existing `make ga` target runs the full GA gate including Docker-based health checks. It remains unchanged and can be used for local full-stack validation.

For release-train purposes, use:
```bash
pnpm ga:verify
```

### Relationship to Other Commands

- **`make ga`** - Full local GA gate (Docker, health checks, smoke tests)
- **`pnpm ga:verify`** - Deterministic proof generation (no Docker required)
- **`pnpm ga:readiness-marker`** - Generate cloud-ready marker (requires successful proof)
- **`pnpm release:ready`** - Full release pipeline (proof + marker + CI tests)

## Troubleshooting

### "Evidence bundle not found"

Run `pnpm ga:verify` first to generate the proof artifacts.

### "Determinism violations detected"

Check the violation details in `report.json`:
```bash
SHA=$(git rev-parse HEAD)
cat artifacts/ga-proof/${SHA}/report.json | jq '.determinismCheck.violations'
```

Common fixes:
- Remove `new Date()` calls from artifact generation
- Use `getGitContext()` instead of `process.env.USER`
- Use `writeDeterministicJSON()` instead of `JSON.stringify()`

### "Working directory is dirty"

Commit or stash changes. The proof is only reproducible on clean commits.

### CI failure on "No timestamps found"

Check that you're using the new `scripts/ga/ga-proof.mjs`, not the legacy `ga-verify-runner.mjs`.

## Migration from Legacy

Old command:
```bash
node scripts/ga/ga-verify-runner.mjs
```

New command:
```bash
pnpm ga:verify
```

The legacy runner is still available as `pnpm ga:verify:legacy` for backward compatibility during transition, but it **does not** produce deterministic artifacts and should not be used for release verification.

## References

- [DETERMINISM_AND_REPRO.md](./DETERMINISM_AND_REPRO.md) - Determinism principles
- [MVP-4-GA-VERIFICATION.md](./MVP-4-GA-VERIFICATION.md) - GA feature verification matrix
- [Release Determinism Gate Workflow](../../.github/workflows/release-determinism-gate.yml) - CI enforcement
- [Determinism Library](../../scripts/release/lib/determinism.mjs) - Implementation
