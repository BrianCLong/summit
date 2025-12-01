# Telemetry Privacy & Threat Model

**Version:** 1.0.0
**Date:** 2025-05-18

## 1. Overview
This document defines the privacy controls and threat model for telemetry collected by the Summit platform. Our goal is to maintain operational visibility without compromising user privacy or leaking sensitive data.

## 2. Telemetry Inventory

### 2.1 Prometheus Metrics
Collected via `/metrics` endpoint.

| Metric Name | Description | Labels | Privacy Risk |
|---|---|---|---|
| `intelgraph_http_request_duration_seconds` | Request latency | `method`, `route`, `status` | Low (Aggregate). **Do not label with user ID.** |
| `intelgraph_jobs_processed_total` | Background jobs | `queue`, `status` | None |
| `intelgraph_active_connections` | WebSocket count | `tenant` | Low (Tenant ID is internal) |
| `intelgraph_database_query_duration_seconds` | DB Performance | `database`, `operation` | None |
| `intelgraph_graphrag_query_total` | AI Query count | `status`, `hasPreview` | None |
| `intelgraph_glass_box_runs_total` | Glass Box runs | `type`, `status` | None |

### 2.2 Logs (Structured)
- **Access Logs:** IP, method, path, status, duration.
- **Application Logs:** Error details, operational events.

## 3. Threat Model

### 3.1 Risks
1. **User Deanonymization:** Correlating request timestamps/sizes to specific user actions.
   - *Mitigation:* Metrics are aggregated. Logs use correlation IDs, not raw user PII in message bodies.
2. **Data Leakage in Labels:** High-cardinality labels (e.g., query text, user email) in Prometheus.
   - *Mitigation:* Strict code review of `labelNames`. `route` label must be parameterized (e.g., `/users/:id` not `/users/123`).
3. **Sensitive Data in Logs:** Passwords, tokens, or PII in error traces.
   - *Mitigation:* `pino` redact configuration for `password`, `token`, `authorization`, `cookie`.

### 3.2 Controls
- **Retention:** Metrics (15 days), Logs (30 days hot, 1 year cold).
- **Access:** Restricted to DevOps/SRE via Grafana/Loki with RBAC.
- **Forbidden:** Never log request bodies or full query strings in INFO/ERROR logs unless strictly necessary for debugging (and then sanitized).

## 4. Compliance
- **GDPR/CCPA:** Telemetry does not contain PII.
- **SOC2:** Audit logs are separate from telemetry logs.
