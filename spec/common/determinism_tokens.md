# Determinism Tokens

## Purpose

Determinism tokens allow deterministic replay of analytic executions, tying
outputs to specific data snapshots, model versions, and configuration seeds.

## Required fields

- Snapshot identifier (data version + window).
- Schema or model version identifier.
- Seed value for stochastic procedures.
- Execution policy version.

## Usage

- Include tokens in artifacts and logs.
- Reject replay requests missing required fields.
- Rotate token format versions using semantic versioning.
