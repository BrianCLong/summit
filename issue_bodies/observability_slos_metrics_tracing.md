### Context

Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`, `INTELGRAPH_ENGINEERING_STANDARD_V4.md`
Excerpt/why: To operate the system reliably, we need deep visibility into its performance and behavior. We must establish and monitor Service Level Objectives (SLOs) for key user journeys and instrument the code with metrics and distributed tracing.

### Problem / Goal

The orchestrator currently lacks comprehensive observability. It is difficult to diagnose problems, measure performance, or understand the flow of a request across different components. The goal is to implement a robust observability solution based on OpenTelemetry (OTEL), including SLOs, metrics, and tracing.

### Proposed Approach

- Define SLOs for the most critical user journeys (e.g., task submission, code generation, test execution).
- Instrument the entire application with OpenTelemetry for distributed tracing and metrics.
- All logs, traces, and metrics should include a common set of attributes, such as `run_id`, `task_id`, and `worker_type`.
- Create a set of dashboards (e.g., in Grafana or Datadog) to visualize the SLOs, metrics, and traces.
- Set up alerts to notify the on-call team when an SLO is at risk of being breached.

### Tasks

- [ ] Define and document the initial set of SLOs.
- [ ] Integrate the OpenTelemetry SDK into all components of the orchestrator.
- [ ] Add structured logging with consistent attributes.
- [ ] Create a Grafana or Datadog dashboard for core metrics and SLOs.
- [ ] Implement alerts for SLO breaches.
- [ ] Document the observability setup and how to use the dashboards.

### Acceptance Criteria

- Given a request to the orchestrator, a distributed trace is generated that spans all services involved in handling the request.
- Key performance indicators (e.g., latency, error rate, throughput) are tracked as metrics.
- An SLO dashboard is created that shows the current status of all defined SLOs.
- Metrics/SLO: The observability system itself should have a high availability SLO (e.g., 99.9%).
- Tests: N/A (observability is validated by inspection and use).
- Observability: This task is all about observability.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

- Depends on: #<id_of_durable_store_issue>
- Blocks: Production deployment (GA).

### DOR / DOD

- DOR: SLOs and key metrics defined and approved.
- DOD: Merged, dashboards are live, alerts are configured, runbook is updated.

### Links

- Code: `<path/to/observability/config>`
- Docs: `<link/to/dashboards>`
