# Autonomous Product Surfaces (APS)

## Overview

Summit turns graph intelligence into governed product surfaces.
This subsystem extends Summit from design-aware component generation into a system that can generate full product surfaces, compose them as microfrontends, and evolve them from telemetry + GraphRAG signals.

## MWS (Minimal Winning Slice)
Given a Summit investigation dataset and one approved dashboard template, Summit generates one deterministic investigation dashboard surface, renders it as a mountable microfrontend, and opens a draft PR with tests and artifacts.

## Architecture

Figma MCP / Summit graph / telemetry → surface planner → UI schema plan → codegen → microfrontend bundle → host shell registration → telemetry collection → refactor proposals → draft PR

## Evidence ID Pattern

All outputs MUST use the pattern: `APS-<slug>-<nnn>`
Examples: `APS-surface-plan-001`, `APS-telemetry-signal-014`, `APS-guardrail-test-003`

## Artifact Determinism

No unstable timestamps in deterministic files. `stamp.json` may contain generation run metadata only if normalized to commit SHA, template version, graph snapshot ID, and policy version.

Outputs:
- `artifacts/surfaces/<slug>/surface-plan.json`
- `artifacts/surfaces/<slug>/manifest.json`
- `artifacts/surfaces/<slug>/metrics.json`
- `artifacts/surfaces/<slug>/report.json`
- `artifacts/surfaces/<slug>/stamp.json`

## Policy Gates & Flags

- `SUMMIT_APS_ENABLED=false`
- `SUMMIT_APS_AUTOPR_ENABLED=false`
- `SUMMIT_APS_RUNTIME_PERSONALIZATION=false`
- `SUMMIT_APS_FIGMA_SYNC=false`

## Import Matrix

- **Figma MCP** → variables, components, layout data, frame links, optional editable-layer sync.
- **Summit GraphRAG** → graph snapshot, entity clusters, temporal slices, ranking/confidence.
- **Telemetry** → widget events, latency, abandonment, search/filter outcomes.
- **Policy layer** → widget allowlist, data classification, PR permissions.

## Export Matrix

- `SurfacePlan` JSON
- Generated React TSX
- Microfrontend `manifest.json`
- Telemetry `metrics.json`
- Ops `report.json`
- Deterministic `stamp.json`
- Optional Figma sync payload

## Non-goals

- Arbitrary prompt-to-UI with no schema
- Pixel-perfect recreation of every Figma file
- Autonomous production rollout
- Autonomous merge
- Agent-written auth logic
