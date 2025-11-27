# Summitsight MVP Architecture

## Overview
Summitsight is the observability and metrics engine. It consumes events from the Maestro Event Bus and Securiteyes to calculate real-time KPIs.

## Metrics (v1)

### Task Success Rate
- Formula: `(TASK_COMPLETED / TASK_STARTED) * 100`
- Source: Maestro Events

### Governance Block Rate
- Formula: `(TASK_BLOCKED / TOTAL_TASKS) * 100`
- Indicator of system safety and policy enforcement.

### Incident Velocity
- Count of Incidents per time period.
- Source: Securiteyes.

## Dashboard Integration
Exposes a typed API for the frontend Ops Console.
