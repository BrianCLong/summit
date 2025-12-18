# Data Protection Telemetry Guard

Use this template before enabling any telemetry related to accessibility signals. The intent is to guarantee that no analytics or content capture occurs.

## Collection boundaries
- [ ] Only rule identifiers, selectors, and timestamps are captured; **no innerText or HTML** is stored.
- [ ] No screenshots or video are collected in CI runs.
- [ ] Telemetry payloads are stripped of user-generated content (UGC) and PII.

## Transport and retention
- [ ] Events are batch-flushed over TLS and retention is capped at 30 days.
- [ ] Access to raw events is restricted to the accessibility team.
- [ ] Opt-out controls are exposed for all environments.

## Compliance
- [ ] DPIAs updated for accessibility telemetry streams.
- [ ] Consent surfaces documented for production experiences.
- [ ] Redaction rules unit-tested for every payload shape.
