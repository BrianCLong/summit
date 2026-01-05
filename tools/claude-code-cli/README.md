# Claude Code CLI

Deterministic, CI-friendly CLI for Claude Code agent operations.

## Features

- **Deterministic execution**: TZ/locale normalized by default for consistent results across systems
- **Schema-stable JSON output**: Reliable output format for CI/automation pipelines
- **Exit codes**: Well-defined exit codes for scripting and error handling
- **Verbose/quiet modes**: Flexible output for different use cases

## Installation

```bash
# From the repo root
pnpm install
pnpm -C tools/claude-code-cli build

# Or run directly with tsx
pnpm -C tools/claude-code-cli dev -- --help
```

## Usage

### Basic Commands

```bash
# Analyze current directory (pretty output)
claude-code run analyze

# Analyze with JSON output (for CI)
claude-code --output json run analyze ./src

# Include timestamps in JSON output
claude-code --output json --include-timestamps run analyze

# Verbose mode
claude-code -v run analyze
```

### Output Modes

| Mode   | Flag                        | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| Pretty | `--output pretty` (default) | Human-readable output with colors    |
| JSON   | `--output json`             | Schema-stable JSON for CI/automation |

### Environment Normalization

By default, the CLI normalizes the execution environment for deterministic results:

- **Timezone**: `TZ=UTC`
- **Locale**: `LC_ALL=C`

Override with flags:

```bash
claude-code --tz America/New_York --locale en_US run analyze
```

### Exit Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 0    | Success                                    |
| 1    | Unexpected error                           |
| 2    | User error (bad input, validation failure) |
| 3    | Provider/model error                       |

## JSON Output Schema

The JSON output follows a schema-stable structure (version 1.0.0):

```json
{
  "version": "1.0.0",
  "command": "run analyze",
  "args": ["./src"],
  "normalized_env": {
    "tz": "UTC",
    "locale": "C",
    "nodeVersion": "v20.0.0",
    "platform": "linux",
    "arch": "x64"
  },
  "status": "success",
  "result": {
    "root": "./src",
    "files": ["index.ts", "utils.ts"],
    "fileCount": 2,
    "directories": ["components/"],
    "directoryCount": 1
  },
  "diagnostics": [],
  "timestamp": "2025-01-04T12:00:00.000Z",
  "duration_ms": 150
}
```

### Schema Fields

| Field            | Type     | Description                                       |
| ---------------- | -------- | ------------------------------------------------- |
| `version`        | string   | Schema version (always "1.0.0" currently)         |
| `command`        | string   | Command that was executed                         |
| `args`           | string[] | Arguments passed to the command                   |
| `normalized_env` | object   | Environment info at execution time                |
| `status`         | string   | "success", "error", or "cancelled"                |
| `result`         | any      | Command-specific result data                      |
| `diagnostics`    | array    | Errors, warnings, info messages                   |
| `timestamp`      | string?  | ISO timestamp (only with `--include-timestamps`)  |
| `duration_ms`    | number?  | Execution time (only with `--include-timestamps`) |

## Determinism Guarantees

The CLI is designed for deterministic execution:

1. **File ordering**: All file/directory listings are sorted alphabetically
2. **JSON key ordering**: Object keys are sorted for stable output
3. **Timezone**: UTC by default, prevents timezone-dependent behavior
4. **Locale**: POSIX locale by default, ensures consistent string comparisons

### Verification

Run the same command 3 times and verify identical output:

```bash
# These should produce byte-identical JSON
for i in 1 2 3; do
  TZ=UTC claude-code --output json run analyze . > "run-$i.json"
done

# Compare
diff run-1.json run-2.json && diff run-2.json run-3.json && echo "Deterministic!"
```

## Development

```bash
# Run in development mode
pnpm -C tools/claude-code-cli dev -- run analyze

# Run tests
pnpm -C tools/claude-code-cli test

# Run golden tests (determinism verification)
pnpm -C tools/claude-code-cli test:golden

# Type check
pnpm -C tools/claude-code-cli typecheck

# Build
pnpm -C tools/claude-code-cli build
```

## Environment Variables

| Variable        | Description                          |
| --------------- | ------------------------------------ |
| `CLAUDE_OUTPUT` | Default output format (pretty\|json) |
| `TZ`            | Timezone (default: UTC)              |
| `LC_ALL`        | Locale (default: C)                  |
| `VERBOSE`       | Enable verbose output if "true"      |

## License

MIT
