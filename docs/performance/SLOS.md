# Service Level Objectives (SLOs)

## Overview
This document defines the performance baselines, Service Level Objectives (SLOs), and error budgets for the Summit platform. These contracts ensure predictable latency, bounded cost, and graceful degradation under load.

## Critical Surfaces

### 1. Agent Execution (Maestro)
*   **Definition**: The end-to-end execution of a Maestro run (Orchestrator).
*   **SLO**:
    *   **Latency**: 95% of standard runs complete within 5 seconds (excluding LLM inference latency).
    *   **Availability**: 99.9% of run requests are accepted and successfully enqueued.
    *   **Throughput**: Scale linearly up to 100 concurrent runs per tenant.
*   **Error Budget**: 14 minutes of downtime/degradation per day (calculated daily).

### 2. Predictive Analytics (Threat/Predictive)
*   **Definition**: Forecasting and simulation API endpoints (`/api/predictive`).
*   **SLO**:
    *   **Latency**: 90% of requests complete within 200ms (P90).
    *   **Availability**: 99.5% success rate.
*   **Error Budget**: ~7 minutes/day.

### 3. Negotiation Runtime (ChatOps/Consensus)
*   **Definition**: Real-time message processing and consensus formation.
*   **SLO**:
    *   **Latency**: 99% of messages processed < 100ms.
    *   **Availability**: 99.99% uptime during active negotiations.

### 4. Explainability API (Provenance/Graph)
*   **Definition**: Graph traversal and explanation generation.
*   **SLO**:
    *   **Latency**: 95% of queries < 500ms.
    *   **Availability**: 99.0% (Best effort for complex queries).

## Error Budgets & Burn Rates

| Surface | Target Availability | Error Budget (Monthly) | Burn Rate Alert (1h) | Burn Rate Alert (24h) |
| :--- | :--- | :--- | :--- | :--- |
| Agent Execution | 99.9% | ~43 minutes | > 2% errors | > 0.5% errors |
| Predictive | 99.5% | ~3.6 hours | > 5% errors | > 2% errors |
| Negotiation | 99.99% | ~4 minutes | > 1% errors | > 0.1% errors |

## Degradation Policy

When Error Budgets are exhausted or system is under stress (e.g., CPU > 80%, Queue > 1000), the system degrades in the following order:

1.  **Tier 3 (Best Effort)**: Background analytics, non-critical reporting, batch ingestion. -> **Paused/Rejected (429/503)**
2.  **Tier 2 (Normal)**: Standard agent runs, routine queries. -> **Rate Limited / Queued**
3.  **Tier 1 (Critical)**: Security alerts, active negotiations, admin overrides. -> **Preserved**

## Measurement
*   **Latency**: Measured at the API Gateway / Ingress (P95, P99).
*   **Availability**: `(Successful Requests / Total Requests) * 100`.
*   **Cost**: Verified against `BudgetTracker` enforcement logs.

## Signals
*   **Saturation**: Queue depth trends.
*   **Latencies**: Histogram buckets.
*   **Errors**: 5xx rate and 429 rate.
