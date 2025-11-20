# PCQP TypeScript SDK

This package provides a lightweight interface for working with plans emitted by the Policy-Aware Cross-Silo Query Planner (PCQP) Rust core. It focuses on plan introspection, compliance trace summarization, and ergonomic helpers for client and orchestrator integrations.

## Features

- Parse and validate planner output JSON into ergonomic TypeScript objects.
- Load plans directly from disk (ideal for working with the Rust simulator's golden outputs).
- Compute policy gate summaries and compliance timelines for auditing and reporting.
- Filter subplans by silo to support per-region execution coordination.

## Usage

```ts
import { loadPlanFromFile, policyGateSummary } from '@summit/pcqp-sdk';

const plan = await loadPlanFromFile('../pcqp/tests/golden/compliant_plan.json');
const gates = policyGateSummary(plan);
console.log(gates['policy::residency::us']);
```

To regenerate plans from fresh logical queries, invoke the Rust CLI:

```bash
cargo run --manifest-path ../../pcqp/Cargo.toml --bin pcqp_cli -- plan --query my-query.json
```

## Development

Install dependencies and run tests:

```bash
npm install
npm test
```
