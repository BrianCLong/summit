# Multi-Agent Coordination Benchmarks

## Overview
The Multi-Agent Coordination Benchmark builds upon the base interactive substrate to evaluate teams of agents interacting in shared environments. It measures capabilities such as cooperation, task allocation, communication bandwidth, and collective reasoning depth.

## Configurations
- **Topology**: Defines how agents communicate (e.g., `fully_connected`, `hierarchical`, `ring`).
- **Communication Policy**: Rules for bandwidth, message passing, and visibility limits among agents.

## Implementation Details
The `runMultiAgent` orchestration function invokes `init`, `act`, `update`, and `finalize` across a provided map of `BenchmarkAgent` instances. The environment processes combined actions to generate the shared `StepResult`.

## Artifacts
Generates standard interactive benchmark schemas (`report`, `metrics`, `trace`, `stamp`) but with multi-agent specific metadata and metric records (e.g., coordination efficiency, message count).
