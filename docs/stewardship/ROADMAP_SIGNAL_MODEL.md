# Roadmap Signal Model

## Overview

The Roadmap Signal Model replaces intuition-based planning with evidence-based pressure signals. It aggregates data from drift detection, forecasting, and historical incidents to recommend strategic investment areas.

## Inputs

1.  **Drift Metrics**: Sustained deviations from baselines (e.g., cost drift, model performance degradation).
2.  **Forecasts**: High-confidence predictions of future stress (e.g., impending budget exhaustion).
3.  **Incident History**: Recurrent failure patterns.
4.  **Governance Pressure**: Frequency of policy overrides or denials.

## Outputs

The model produces **Pressure Signals**, ranked by urgency:

*   **Scale Risk**: Evidence that current architecture cannot support projected load.
*   **Governance Debt**: Evidence that policies are outdated or overly restrictive (high override rate).
*   **Model Decay**: Evidence that core models are losing relevance or accuracy.
*   **Cost Efficiency**: Evidence of unsustainable spending trajectory.

## Principles

*   **Advisory Only**: Signals inform human decision-making; they do not automatically trigger work items.
*   **Evidence-Backed**: Every signal must cite specific metrics or historical data.
*   **No Micro-Management**: Signals suggest *areas* of investment, not specific tasks.
