# Metric Definition Registry (MDR)

The Metric Definition Registry provides a single source of truth for KPI specifications and produces compiled SQL views and table functions for BigQuery, Snowflake, and Postgres deployments.

## Features

- Versioned metric specifications stored as YAML under `specs/`.
- Deterministic SQL generation for views and UDF-style table functions across supported dialects.
- Golden SQL fixtures and a conformance runner to ensure generated SQL stays byte-identical.
- Spec diffing utilities to highlight breaking changes between versions.

## Usage

Install dependencies:

```bash
npm install
```

Generate compiled SQL artifacts:

```bash
npm run compile -- <dialect> [--metric <name>]
```

Regenerate golden fixtures after intentional spec changes:

```bash
npx ts-node src/cli.ts golden <dialect>
```

Run conformance checks to compare generated SQL against goldens:

```bash
npm test -- <dialect>
```

Inspect differences between spec versions:

```bash
npx ts-node src/cli.ts diff <metric> <fromVersion> <toVersion>
```

By default the CLI looks for specs in `specs/`, writes compiled artifacts to `dist/`, and reads golden fixtures from `golden/`. Override these directories with `--specs`, `--out`, or `--golden` flags.
