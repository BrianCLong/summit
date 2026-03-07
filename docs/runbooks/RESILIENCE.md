# Resilience & Reliability Runbook

This document details the resilience features implemented to protect the Summit platform against failures in downstream services (PostgreSQL, LLM Providers) and frontend crashes.

## 1. Architecture Overview

We employ a "Defense in Depth" strategy:

1.  **Frontend**: React Error Boundaries isolate component failures.
2.  **Backend Connection Pooling**: Optimized pool settings for PostgreSQL.
3.  **Circuit Breakers**: Prevent cascading failures to LLMs and DBs.
4.  **Health Checks**: Deep inspection of service health including circuit states.

---

## 2. Failure Modes & Handling

### 2.1 Database (PostgreSQL)

| Failure Mode         | Detection                      | System Response                                                    |
| -------------------- | ------------------------------ | ------------------------------------------------------------------ |
| **Startup Outage**   | Connection failure             | Retries with exponential backoff (100ms...1600ms).                 |
| **Transient Outage** | Connection timeout/error       | Circuit breaker opens after 5 failures. Traffic stops for 60s.     |
| **Latency Spike**    | Query timeout                  | Query aborted. Recorded as failure. Circuit may open.              |
| **Pool Exhaustion**  | Metric `db_connections_active` | Alerts triggered. Requests queued until `connectionTimeoutMillis`. |

**Circuit Breaker Config:**

- **Threshold**: 5 consecutive failures
- **Cooldown**: 60 seconds (Open -> Half-Open)
- **Reset**: 1 successful request in Half-Open state closes the circuit.

### 2.2 LLM Service (OpenAI/etc)

| Failure Mode    | Detection                | System Response                                                    |
| --------------- | ------------------------ | ------------------------------------------------------------------ |
| **5xx Errors**  | HTTP Status 500-599      | Retries (max 3) with backoff. Circuit breaker records failure.     |
| **Timeouts**    | Request duration > limit | Aborted. Circuit breaker records failure.                          |
| **Rate Limits** | HTTP 429                 | (Future) Specific handling. Currently trips breaker if persistent. |

**Circuit Breaker Config:**

- **Threshold**: 5 failures
- **Cooldown**: 60 seconds
- **Shared State**: Circuit state is shared across service instances via static map.

### 2.3 Frontend

| Failure Mode     | Detection           | System Response                                       |
| ---------------- | ------------------- | ----------------------------------------------------- |
| **Render Error** | `componentDidCatch` | Shows "Something went wrong" card with retry button.  |
| **Route Error**  | Error Boundary      | Navigation remains functional. Sidebar/Layout intact. |

---

## 3. Operator Playbook

### 3.1 Investigating "Unhealthy" Status

If `/health/detailed` reports `status: degraded`:

1.  **Check `errors` array**: It will list the specific service (e.g., `llm`, `postgres`).
2.  **Check Circuit State**:
    - If `circuitState: OPEN`, the service is actively blocking requests.
    - **Action**: Verify downstream provider status page (OpenAI) or DB connectivity.
3.  **Metrics**:
    - Check `db_connections_active` for leaks.
    - Check `application_errors_total` for spike patterns.

### 3.2 Distinguishing Infrastructure vs. Provider

- **Infrastructure**: `postgres` circuit OPEN often means network/container issue.
- **Provider**: `llm` circuit OPEN usually means external API outage. Check logs for specific HTTP codes (503 vs 401).

### 3.3 Recovery

- **Automatic**: System automatically probes every 60s (Half-Open). No manual reset required.
- **Manual Override**: Restart the service container to reset all circuit breakers to CLOSED (if persistent false positive).

---

## 4. Known Limitations

- **LLM Health**: The health check verifies the _circuit breaker state_ but does not make a live API call to OpenAI to save costs/tokens.
- **Frontend**: Error Boundary does not catch Event Handler errors (standard React limitation). Use `try/catch` in async handlers.
- **Simulation**: Full end-to-end simulation of DB outages in the test environment is limited by container orchestration permissions. Backend logic is verified via unit/integration patterns.
