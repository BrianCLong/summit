# Reliability Policy

## 1. Overview
This policy defines the minimum reliability standards required for all code contributions to the `summit` repository. The goal is to prevent the reintroduction of known anti-patterns (flaky tests, resource leaks, unbounded polling) that degrade CI stability and production reliability.

## 2. Network Listen & Port Binding
**Rule:** No test or service may bind to a TCP/UDP port unless explicitly gated by the `NO_NETWORK_LISTEN` environment variable.

*   **Rationale:** Parallel test execution relies on port availability. Hardcoded ports cause flaky collisions.
*   **Enforcement:**
    *   `server.listen()`, `app.listen()`, and `createServer().listen()` must be wrapped in a conditional check for `!process.env.NO_NETWORK_LISTEN`.
    *   Linting scripts will scan for ungated listen calls.
*   **Remediation:**
    ```typescript
    if (process.env.NO_NETWORK_LISTEN !== 'true') {
      server.listen(port, () => { ... });
    }
    ```

## 3. Resource Teardown
**Rule:** All external clients and heavy resources must have a deterministic teardown path invoked during test cleanup and application shutdown.

*   **Scope:**
    *   Redis Clients (`createClient`)
    *   Neo4j Drivers (`neo4j.driver`)
    *   PostgreSQL Pools (`new Pool`)
    *   Worker Queues (`new Queue`, `new Worker`)
    *   Servers (HTTP/WebSocket)
*   **Enforcement:**
    *   Tests must register resources for cleanup (e.g., `afterAll(() => client.quit())`).
    *   Linting scripts will flag instantiation of these classes if no obvious cleanup is detected (heuristic).
*   **Remediation:** Ensure every resource is closed in `finally` blocks or `afterAll` hooks.

## 4. Polling & Intervals
**Rule:** Unbounded polling loops (infinite `setInterval` or recursive `setTimeout` without exit condition) are prohibited.

*   **Requirements:**
    *   **Disable in Tests:** Polling must be configurable and disabled by default in test environments.
    *   **Bounded Intervals:** All polling must have a maximum duration or retry count.
    *   **Cleanup:** `setInterval` handles must be stored and cleared via `clearInterval`.
*   **Enforcement:**
    *   Linting scripts will flag `setInterval` usage that lacks a corresponding `clearInterval`.
*   **Remediation:** Use `p-retry` with limits, or store the interval ID and clear it on shutdown/timeout.

## 5. Network Retries
**Rule:** Infinite retries are prohibited for network operations.

*   **Requirement:** All network calls (HTTP, DB connections) must use bounded exponential backoff.
*   **Remediation:** Use libraries like `axios-retry` or `p-retry` with `retries: 3` (or similar reasonable limit).

## 6. Acceptance Tests
**Rule:** Heavy integration/acceptance tests must be gated behind `RUN_ACCEPTANCE=true`.

*   **Rationale:** Keeps the default `test:unit` fast and reliable.
*   **Remediation:**
    ```typescript
    const describeAcceptance = process.env.RUN_ACCEPTANCE === 'true' ? describe : describe.skip;
    describeAcceptance('Heavy Flow', () => { ... });
    ```
