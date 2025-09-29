# ConfigGuard (TypeScript)

ConfigGuard provides deterministic configuration loading and JSON Schema validation with environment variable interpolation. Use the exported `Load` and `Validate` functions or the bundled CLI.

```bash
# Validate all configs in ./configs with a schema
npx ts-node --project libs/configguard/ts/tsconfig.json libs/configguard/ts/src/cli.ts \
  --schema ./schema.json --dir ./configs
```

## Features

- JSON and YAML parsing with line/column aware diagnostics.
- JSON Schema validation powered by Ajv.
- Environment variable interpolation with allow/deny policies and defaults.
- Deterministic output suitable for CI pipelines.

## CLI Options

- `--schema <path>`: Path to a JSON Schema document (required).
- `--dir <path>`: Directory containing YAML or JSON configs (defaults to current directory).
- `--allow-env <list>`: Comma-separated allow list of environment variables.
- `--deny-env <list>`: Comma-separated deny list of environment variables.
- `--defaults <list>`: Comma-separated `KEY=VALUE` fallbacks when variables are missing.
- `--format <text|json>`: Emit human-readable text (default) or machine-readable JSON diagnostics.
- `--enforce <warn|fail>`: Start in `warn` mode for progressive adoption. Switch to `fail` once teams are ready.

## Development

```bash
cd libs/configguard/ts
npm install
npm run build
npm test
```

> **Note:** Running the Jest suite requires installing local dev dependencies. When working in network-restricted environments the install step may need to be skipped and tests run in CI instead.
