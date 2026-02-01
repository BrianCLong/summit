# GMR Guardrail Security

## Tenant Isolation

- `metrics.facts_cdc` and `metrics.facts_graph` must enforce tenant isolation via RLS or per-tenant schema/database.
- Gate queries MUST scope by `(tenant_id, source)` and avoid cross-tenant aggregation.

## Prometheus Cardinality Controls

- Do not add labels for `ts_window_start` or `ts_window_end`.
- Limit labels to `tenant_id` and `source` only when required, and prefer allowlisted values.

## Threat Model (Lightweight)

| Abuse Case             | Impact                    | Mitigation                                                       |
| ---------------------- | ------------------------- | ---------------------------------------------------------------- |
| Cross-tenant inference | Confidentiality loss      | RLS, tenant-scoped queries, dashboard access control             |
| Metric spoofing        | False negatives/positives | Counter provenance, immutable evidence, hash-stable drift checks |
| Alert fatigue          | Operational overload      | Phased rollout, MAD thresholds, suppression policy               |

## MAESTRO Layers

- **Foundation:** Database integrity and access controls.
- **Data:** Aggregates only; no raw CDC payloads.
- **Agents:** Gate runner and CI integration.
- **Tools:** Prometheus/Grafana provisioning.
- **Observability:** GMR ratio and volume panels.
- **Security:** RLS enforcement, least privilege access.

## CI Security Checks

- Validate schema migrations include RLS policies for `metrics` schema.
- Ensure Prometheus rule files do not include high-cardinality labels.
- Verify gate evidence files are deterministic (no wall-clock timestamps).
