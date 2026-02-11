# GA Scripts

Scripts for managing and monitoring GA (General Availability) release status.

## ga-snapshot

Generates a machine-readable JSON summary of GA release state for dashboards and automation consumption.

### Usage

```bash
# Basic usage (requires source docs to exist)
./scripts/ga/ga-snapshot

# Output to specific file
./scripts/ga/ga-snapshot --out status.json

# Allow missing source documents (marks as "unknown")
./scripts/ga/ga-snapshot --allow-missing

# Include CI status (requires gh CLI)
./scripts/ga/ga-snapshot --include-ci

# Include release/tag info from git
./scripts/ga/ga-snapshot --include-release

# Full options for CI artifact generation
./scripts/ga/ga-snapshot --out ga_snapshot.json --allow-missing --include-ci --include-release

# Output to stdout
./scripts/ga/ga-snapshot --out - --allow-missing
```

### Options

| Option              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `--out <path>`      | Output file path (default: `ga_snapshot.json`) |
| `--include-ci`      | Include CI status via `gh` CLI (best effort)   |
| `--include-release` | Include release/tag info from git              |
| `--allow-missing`   | Don't fail if source docs are missing          |
| `--help`            | Show help message                              |

### Input Files

The script reads from these source documents (relative to repo root):

| File                       | Purpose                         |
| -------------------------- | ------------------------------- |
| `docs/release/QUEUE.md`    | PR queue with merge status      |
| `docs/release/BLOCKERS.md` | Known blockers and their status |
| `docs/release/EVIDENCE.md` | Verification evidence           |
| `docs/release/STATE.md`    | Current GA phase                |

### Output Schema

```json
{
  "phase": "P0_DISCOVER|P1_QUEUE|P2_UNBLOCK|P3_MERGE|P4_VERIFY|P5_RELEASE|P6_DONE|unknown",
  "main_green": true|false|"unknown",
  "queue": {
    "total": 42,
    "remaining": 10,
    "merged": 30,
    "deferred": 2,
    "buckets": {
      "A": {"remaining": 2, "merged": 8},
      "B": {"remaining": 3, "merged": 12},
      "C": {"remaining": 3, "merged": 7},
      "D": {"remaining": 2, "merged": 3}
    },
    "top_failing_checks": [
      {"check": "typecheck", "count": 3}
    ]
  },
  "blockers": [
    {"check": "CI Pipeline", "status": "open|resolved|unknown", "summary": "Description"}
  ],
  "verification": {
    "last_evidence_section": "smoke",
    "status": "pass|fail|unknown"
  },
  "release": {
    "version": "4.1.0",
    "tag": "v4.1.0",
    "commit": "abc123def456"
  },
  "generated_by": "scripts/ga/ga-snapshot"
}
```

### Consuming in Dashboards

The snapshot JSON can be consumed by:

1. **CI Workflows** - Upload as artifact for downstream jobs
2. **Dashboards** - Poll or fetch from CI artifacts
3. **Slack/Discord Bots** - Parse and post status updates
4. **Monitoring** - Track phase progression over time

Example: Fetching from GitHub Actions artifact:

```bash
# Download latest artifact
gh run download --name ga-snapshot --dir ./snapshots

# Parse with jq
jq '.phase' ./snapshots/ga_snapshot.json
jq '.queue.remaining' ./snapshots/ga_snapshot.json
```

### Determinism

The output is deterministic:

- Keys are in stable order
- No timestamps unless `--include-release` adds commit info
- Same inputs produce identical outputs

## verify-ga-surface.mjs

Validates GA hardening requirements against the verification map and documentation.

```bash
node scripts/ga/verify-ga-surface.mjs
```

## run-ga-hardening-audit.mjs

Runs a deterministic GA hardening check suite that aligns security, dependency, quality, and reliability gates into one machine-readable report.

### Usage

```bash
# Run baseline checks and write JSON report
pnpm ga:hardening:audit

# Write report to a custom location
node scripts/ga/run-ga-hardening-audit.mjs --out artifacts/custom-hardening.json

# Treat environment warnings as failures
node scripts/ga/run-ga-hardening-audit.mjs --fail-on-warning
```

### Included checks

1. `pnpm security:check`
2. `pnpm audit --prod --json`
3. `pnpm outdated --recursive`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm test`

By default, network/registry failures (for example npm audit `403`) are classified as warnings so local hardening runs still produce actionable output in restricted environments.
