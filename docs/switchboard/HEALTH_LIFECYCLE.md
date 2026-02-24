# Health Lifecycle

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: SRE, Operations

## 1. Overview

The Health Lifecycle ensures that Switchboard **only** routes requests to healthy MCP servers. It implements a **State Machine** that actively manages the availability of every tool.

## 2. Health Check Types

### 2.1 Liveness (Basic Ping)
*   **What**: Is the process running and listening?
*   **How**: TCP check or HTTP `/health` endpoint.
*   **Frequency**: Every 10 seconds.

### 2.2 Readiness (Dependency Check)
*   **What**: Can the server fulfill requests?
*   **How**: Does it have access to its upstream dependencies (e.g., DB connection)?
*   **Frequency**: Every 30 seconds.

### 2.3 Capability Sanity (Deep Check)
*   **What**: Can it actually perform its core function?
*   **How**: Run a lightweight "noop" or "echo" command.
    *   *Example*: `brave-search` performs a search for "test".
*   **Frequency**: Every 5 minutes or after X failures.

## 3. Startup & Registration Flow

1.  **Register**: Server registers via API or Config.
    *   *State*: `STARTING`.
2.  **Verify**: Switchboard runs Liveness & Readiness checks.
    *   *Pass*: Transition to `HEALTHY`.
    *   *Fail*: Transition to `UNHEALTHY` (Retry loop).
3.  **Active**: Once `HEALTHY`, the server is added to the routing pool.

## 4. Quarantine & Circuit Breaking

If a server fails repeatedly (e.g., 3 consecutive failures):
1.  **Quarantine**: Remove from the active pool.
    *   *State*: `QUARANTINE`.
    *   *Reason*: "Connection timeout > 3x".
2.  **Circuit Breaker Open**: Stop sending traffic.
3.  **Probation**: After a cooldown (e.g., 60s), allow 1 request through.
    *   *State*: `PROBATION`.
    *   *Result Success*: Close breaker, transition to `HEALTHY`.
    *   *Result Fail*: Re-open breaker, extend quarantine.

## 5. Safe Degradation Modes

When critical tools fail, Switchboard degrades gracefully:

*   **Refuse**: Reject requests requiring the failed tool.
    *   *Response*: `503 Service Unavailable (Tool: brave-search)`.
*   **Fallback**: Route to a secondary provider if configured.
    *   *Config*: `search:internet -> [brave-search, google-search]`.
*   **Unknown**: If state is indeterminate, assume `UNHEALTHY` until proven otherwise.

## 6. State Machine Diagram

```
[STARTING] --> (Pass Checks) --> [HEALTHY]
     |                               |
  (Fail)                          (Fail x3)
     v                               v
[UNHEALTHY] <--(Fail Probe)-- [QUARANTINE]
     |                               |
  (Retry)                     (Cooldown + Probe)
     |                               |
     +-------> (Success) -----> [PROBATION]
                                     |
                                 (Success)
                                     v
                                 [HEALTHY]
```

## 7. Routing Influence

Health state **deterministically** affects routing:
*   `HEALTHY`: Eligible for selection.
*   `PROBATION`: Eligible for *one* test request.
*   `QUARANTINE` / `UNHEALTHY`: **Ineligible**. Removed from candidate list.
