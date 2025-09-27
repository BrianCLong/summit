# Schema Evolution Simulator (SES)

SES is a TypeScript tool for simulating schema evolution scenarios before applying changes to production systems. It ingests structured schema definitions, consumer usage telemetry, and a list of proposed changes to forecast downstream impact.

## Features

- **Compatibility Matrix** — summarizes the effect of proposed changes per consumer.
- **Migration Bundle** — auto-generates SQL statements and TypeScript migration stubs.
- **Risk Assessment** — deterministic score based on observed usage and change severity.
- **Rollout Planning** — staged rollout plan with pass/fail gates for each phase.
- **Fixture Validation** — optional dataset fixtures validate generated migrations.

## Getting Started

```
cd tools/ses
npm install
npm run build
```

Run the simulator by pointing it at a configuration file:

```
npx ses ./configs/example.json
```

The configuration file supports the following keys:

```json
{
  "schemaPath": "./fixtures/schema.json",
  "telemetryPath": "./fixtures/telemetry.json",
  "changesPath": "./fixtures/changes.json",
  "fixturePath": "./fixtures/data.json",
  "outputPath": "./runs/latest.json"
}
```

## Testing

SES uses [Vitest](https://vitest.dev). Run the suite with:

```
npm test
```

Tests validate that breaking changes are flagged, migrations execute against fixtures, and rollout gates are deterministic.

## GitHub Action Gate

A GitHub Action workflow (`.github/workflows/ses.yml`) runs the SES tests to block regressions when changes are introduced.
