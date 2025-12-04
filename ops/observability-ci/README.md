# Observability & CI Pack

This package provides reusable CI workflows and observability helpers used across Intelgraph services.

## OpenTelemetry Quickstart

### Node.js

```ts
import { initTracing } from './otel/node-tracing';
const tracer = initTracing('my-service');
tracer.startSpan('startup').end();
```

### Python

```python
from otel.python_tracing import init_tracing
tracer = init_tracing('my-service')
with tracer.start_as_current_span('startup'):
    pass
```

## Local Dev Stack

Run Prometheus, Grafana, Neo4j, Redis, and OPA:

```sh
make up
```

Visit Grafana at http://localhost:3000 and Prometheus at http://localhost:9090.

## Alert runbook automation

- `python scripts/alert_runbook_generator.py` builds one-click remediation payloads and the
  aggregated catalog in `ops/runbooks/generated` from `ops/alerts/slo-burn-rules.yml`.
- `python scripts/check_oncall_paths.py` verifies on-call rotation coverage and PagerDuty
  escalation wiring; it is invoked by `scripts/smoke-test.sh` for CI safety.
