# Declarative Pipelines Architecture

## Summary

This design introduces a declarative-first pipeline substrate for Summit. Pipelines are modeled as
versioned contracts, validated before execution, and mapped to deterministic dependency plans.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: malicious pipeline payloads, dependency-loop denial of service,
  schema drift, policy bypass.
- **Mitigations**: schema-level validation, cycle detection, OPA deny rules, CI evidence checks.

## Components

- `src/graphrag/pipelines/spec.ts`: Typed contract for datasets and pipelines.
- `src/graphrag/pipelines/contracts.ts`: Runtime validation and unknown-field rejection.
- `src/graphrag/pipelines/planner.ts`: Topological ordering with cycle detection.
- `src/graphrag/pipelines/lineage.ts`: Flagged lineage graph materialization.
- `src/agents/pipelineExecutor.ts`: Policy-first task graph generation.

## Evidence

Evidence namespace: `EVD-SDP-PIPE-001`

Required artifacts:

- `evidence/pipelines/report.json`
- `evidence/pipelines/metrics.json`
- `evidence/pipelines/stamp.json`
- `evidence/index.json`

## Rollback

The change is additive. Runtime usage is constrained by feature flags and can be disabled with:

- `SUMMIT_DECLARATIVE_PIPELINES=false`
- `SUMMIT_PIPELINE_LINEAGE=false`
