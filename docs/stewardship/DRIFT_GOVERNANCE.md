# Drift Governance

## Overview

Drift Governance goes beyond simple configuration drift detection. It identifies semantic shifts in the platform's behavior, risk profile, and operating environment.

## Drift Classes

### 1. Model Drift
*   **Prediction Distribution**: Changes in the output distribution of models.
*   **Confidence Shifts**: Inflation or deflation in model confidence scores.
*   **Feature Usage**: Shifts in which features contribute most to model outputs.

### 2. Agent Behavior Drift
*   **Capability Creep**: Agents attempting actions outside their initial scope.
*   **Budget Pressure**: Accelerating consumption of tokens or compute resources.
*   **Policy Override Frequency**: Increasing rate of requested or attempted policy overrides.

### 3. Risk Drift
*   **Denied Actions**: Increase in actions blocked by policy.
*   **Threat Patterns**: Emergence of new attack vectors or abuse patterns.

### 4. Cost Drift
*   **Budget Burn Acceleration**: Non-linear increase in spending.
*   **Cross-Tenant Imbalance**: Disproportionate resource usage by specific tenants.

## Detection & Response

Drift is measured relative to established baselines.
*   **Detection**: Automated jobs run daily/weekly to compare current metrics against baselines.
*   **Response**: Alerts are generated for human review. Significant drift may trigger automatic circuit breakers (e.g., pausing an agent).
