# Event Signals

## Philosophy
Kubernetes events are elevated from raw logs to structured operational signals.

## Taxonomy
*   **CrashLoopBackOff** -> `workload_crash_loop`
*   **FailedScheduling** -> `scheduler_failed`
*   **Unhealthy** -> `probe_failed`

## Unhandled Events
Events with unknown reasons are ignored to reduce noise. They do not trigger alerts or recommendations.
