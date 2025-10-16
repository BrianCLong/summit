# Trace Correlation in Maestro UI

This document explains how OpenTelemetry (OTel) trace correlation is implemented in Maestro UI, enabling seamless navigation from runs and nodes to their corresponding traces in Tempo/Grafana and correlated logs in Loki.

## How Trace Context Flows

Maestro UI propagates OpenTelemetry trace context end-to-end, from the UI through the backend gateway to the underlying worker/executor services. This ensures that all operations related to a specific run or node share the same trace ID, allowing for comprehensive observability.

1.  **UI to Gateway Propagation:**
    - The Maestro UI is instrumented with `@opentelemetry/sdk-trace-web` and `@opentelemetry/instrumentation-fetch`.
    - When the UI makes API calls to the Maestro backend gateway (via `fetch`), the `FetchInstrumentation` automatically injects `traceparent` headers into the HTTP requests.
    - These headers contain the current trace ID and span ID, linking the UI-initiated operation to the broader trace.

2.  **Gateway Context Continuation:**
    - The Maestro backend gateway receives the `traceparent` headers from the UI.
    - It is configured to extract and continue the trace context from these headers.
    - The gateway then sets the `traceId` on:
      - Run records and node steps (as structured fields in their data models).
      - Responses for relevant API endpoints (e.g., `/runs/:id`, `/runs/:id/nodes/:nodeId`).

3.  **Worker/Executor Trace Inclusion:**
    - Downstream worker and executor services (which perform the actual pipeline steps) are designed to include the current `traceId` (and ideally `spanId`) in all emitted logs and metrics.
    - This ensures that logs and metrics generated during a specific part of a run can be directly correlated back to the trace.

## UI Deep Links

Maestro UI provides convenient deep links to external observability platforms (Grafana/Tempo/Loki) for detailed trace and log analysis.

### "View Trace" Button (Run Level)

- **Location:** On the `RunDetail.tsx` page, a "View Trace" button is available for the entire run.
- **Functionality:** Clicking this button constructs a URL to Grafana/Tempo, passing the `traceId` of the run as a query parameter. This opens the full trace view in Tempo, allowing you to see all spans associated with that run.
- **URL Structure (Example):**

  ```
  {{grafanaBase}}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22<run_trace_id>%22%7D,%7B%22ui%22:%22trace%22%7D%5D
  ```

  - `{{grafanaBase}}`: Configured Grafana base URL (e.g., `https://grafana.your-domain.com`).
  - `<run_trace_id>`: The unique trace ID associated with the Maestro run.

### "View Trace" Button (Node Level)

- **Location:** Within the Node Inspector section on the `RunDetail.tsx` page, a "View Node Trace" button is available for each selected node.
- **Functionality:** This button constructs a URL to Grafana/Tempo, passing both the `traceId` of the run and the `spanId` of the specific node's operation. This allows you to directly jump to the relevant span within the trace, focusing on the execution of that particular node.
- **URL Structure (Example):** (Similar to run-level, but potentially with a span filter if Tempo supports it directly in URL)
  ```
  {{grafanaBase}}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22<run_trace_id>%22%7D,%7B%22ui%22:%22trace%22%7D%5D
  ```
  _Note: While the URL currently points to the full trace, future enhancements could include direct span linking if supported by Grafana/Tempo's URL scheme._

### Logs Tab: "Filter to this trace" Pill

- **Location:** In the Logs tab of the `RunDetail.tsx` page.
- **Functionality:** A "Filter to this trace" pill appears when a run has an associated `traceId`. Clicking this pill applies a client-side filter to the displayed log entries, showing only those logs that contain the specific `traceId`.
- **Correlation:** This relies on the worker/executor services including the `traceId` in their log messages (e.g., `... some log message traceId=<trace_id> ...`).
- **Loki Query Templates:** The backend provides Loki query templates (e.g., `lokiQueryTemplates.runLogs`, `lokiQueryTemplates.nodeLogs`) that can be used to construct direct links to Loki in Grafana, pre-filtering logs by `traceId` and `nodeId`.

## Debugging Trace Correlation

To debug trace correlation issues:

- **Browser Developer Tools:** Inspect network requests from the UI to the gateway. Verify that `traceparent` headers are present in the request headers for Maestro API calls.
- **Gateway Logs:** Check gateway logs for incoming `traceparent` headers and ensure that the trace context is being correctly extracted and propagated.
- **Worker/Executor Logs:** Verify that your worker/executor services are emitting logs with the `traceId` included as a structured field or within the log message itself.
- **Grafana/Tempo/Loki:** Directly query your observability backend using the `traceId` to confirm that traces and logs are being ingested and correlated as expected.

By following these guidelines, you can effectively leverage OpenTelemetry for end-to-end trace correlation and debugging within the Maestro ecosystem.
