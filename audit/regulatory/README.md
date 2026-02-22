# Regulatory Compliance Automation

This directory contains the schemas, source adapters, and tools for the "Regulatory Controls Pack" pipeline.

## Structure

*   `schema/`: JSON schemas for ControlPack, ClaimMap, and DriftReport.
*   `../../cli/src/lib/regulatory/sources/`: TypeScript adapters for fetching regulatory data from authoritative sources.
*   `builder/`: Logic for building deterministic artifacts.
*   `fixtures/`: Test fixtures.

## Usage

Use the CLI commands to build and diff regulatory artifacts.

```bash
pnpm regulatory:build
pnpm regulatory:diff --baseline artifacts/regulatory/baseline
```
