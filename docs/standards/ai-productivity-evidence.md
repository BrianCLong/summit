# AI Productivity Evidence Standard

## Overview
This standard defines the protocol for measuring the impact of AI assistance on engineering workflows. It mandates an "evidence-first" approach where decisions about AI adoption are gated by objective telemetry, not subjective perception.

## Core Principles
1.  **Objective Measurement**: We measure speed, quality, and friction.
2.  **Determinism**: Telemetry artifacts must be deterministic and diffable.
3.  **Context Awareness**: Measurements must account for workflow mode (baseline vs. assist).
4.  **Perception vs. Reality**: We acknowledge the "perception gap" (METR RCT) and rely on measured outcomes.

## Artifacts
The system produces the following artifacts in `artifacts/productivity/`:

*   `run_metrics.json`: Deterministic metrics (duration, test counts, friction). Keys are sorted.
*   `stamp.json`: Volatile metadata (timestamps, run IDs, runners).
*   `diff.json`: Comparison between baseline and assist modes.

## Schema
See `schemas/productivity-run.schema.json` for the strict definition of the evidence format.

## Experiment Protocol (Switchback)
To evaluate AI assistance:
1.  **Baseline Mode**: Run the workflow without AI (or with legacy tools).
2.  **Assist Mode**: Run the workflow with AI features enabled.
3.  **Comparison**: Compute `diff.json`.
4.  **Gate**:
    *   **Quality**: No regression allowed in test pass rate or critical quality metrics.
    *   **Speed**: Improvement is desired but quality is paramount.
    *   **Friction**: Decrease in review cycles/comments is a positive signal.

## Interpretation
*   **Positive Diff**: Improved speed/quality/friction.
*   **Negative Diff**: Regression.
*   **Zero Diff**: No measurable impact.

## Security & Privacy
*   No code content or prompt text is logged in productivity artifacts.
*   Only aggregate counts and durations are stored.
