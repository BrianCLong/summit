# Contract Tests

This directory contains contract tests to ensure API stability and compatibility between consumers and providers.

## Structure
*   `consumers/`: Tests representing client expectations.
*   `providers/`: Tests verifying service responses match expectations.
*   `schemas/`: JSON Schemas or snapshots of contracts.

## Running Tests
Run via `pnpm test:contracts` (if script added) or `jest tests/contracts`.
