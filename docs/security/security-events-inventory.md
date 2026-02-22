# Security Events Inventory

> **Purpose**: Catalog all security-relevant events in the Summit/IntelGraph platform, their locations, risk levels, and current observability status.
>
> **Last updated**: 2026-02-08
> **Owner**: Security & Observability Engineering

## Legend

| Field | Values |
|-------|--------|
| **Risk** | Critical / High / Medium / Low |
| **Logged?** | Yes = structured audit event emitted; Partial = ad-hoc `logger.*` only; No = unobserved |
| **Metrics?** | Yes = Prometheus counter/histogram exposed; No = not instrumented |
| **Traces?** | Yes = OpenTelemetry span present; No = not traced |

---

## 1. Sensitive Report Access

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| View report templates | `server/src/routes/reporting.ts` GET `/templates` | Medium | No | No | No | No audit trail for who listed available reports |
| Generate report | `server/src/routes/reporting.ts` POST `/generate` | High | No | No | No | Produces exportable artifacts; no "who saw what" record |
| Schedule report | `server/src/routes/reporting.ts` POST `/schedule` | High | No | No | No | Creates recurring data access; unaudited |
| View report history | `server/src/routes/reporting.ts` GET `/history/:templateId` | Medium | No | No | No | Read access to historical report data |

## 2. Entity & Graph Access

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Entity search | `server/src/routes/graph.ts` POST `/entities/search` | High | Partial | No | No | Provenance ledger append (fire-and-forget) |
| Entity read | `server/src/routes/graph.ts` GET `/entities/:id` | Medium | No | No | No | Individual entity view not audited |
| Entity neighbors | `server/src/routes/graph.ts` GET `/entities/:id/neighbors` | Medium | No | No | No | Graph traversal not audited |
| Pattern search | `server/src/routes/graph.ts` POST `/patterns/search` | High | Partial | No | No | Provenance ledger append (fire-and-forget) |
| Shortest path | `server/src/routes/graph.ts` POST `/analytics/shortest-path` | Medium | Partial | No | No | Provenance ledger append |
| Centrality analysis | `server/src/routes/graph.ts` POST `/analytics/centrality` | Medium | Partial | No | No | Provenance ledger append |
| Anomaly detection | `server/src/routes/graph.ts` POST `/analytics/anomalies` | Medium | Partial | No | No | Provenance ledger append |

## 3. OSINT Artifact Access

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Ingest OSINT feed | `server/src/routes/osint.ts` POST `/ingest-feed` | High | No | No | No | External data ingestion, no audit trail |
| Risk assessment | `server/src/routes/osint.ts` POST `/assess-risk` | High | No | No | No | LLM-based analysis of IOCs, no audit |
| Score entity | `server/src/routes/osint.ts` POST `/score/:id` | Medium | No | No | No | Currently 501, but should be audited when implemented |
| OSINT prioritize | `server/src/routes/osint.ts` POST `/prioritize` | Medium | No | No | No | Currently 501 |

## 4. Data Export & Disclosure

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Create export job | `server/src/disclosure/export-service.ts` `createJob()` | Critical | Partial | Yes (disclosureMetrics) | No | Metrics tracked but no structured audit event with actor |
| Export audit trail | `server/src/disclosure/export-service.ts` `collectAuditTrail()` | Critical | No | No | No | Bulk export of audit events themselves |
| Export SBOM | `server/src/disclosure/export-service.ts` `collectSbomReports()` | High | No | No | No | Software supply chain data export |
| Export attestations | `server/src/disclosure/export-service.ts` `collectAttestations()` | High | No | No | No | Cryptographic attestation export |
| Download export bundle | `server/src/routes/disclosures.ts` GET `/export/:id/download` | Critical | No | No | No | Actual file retrieval unaudited |

## 5. Data Ingestion

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Bulk entity ingest | `server/src/routes/ingest.ts` POST `/api/v1/ingest` | High | Partial | No | No | Logger info but no structured audit event |
| Ingest status check | `server/src/routes/ingest.ts` GET `/api/v1/ingest/status/:id` | Low | No | No | No | Read-only status check |

## 6. Access Control & Policy Changes

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Permission denied | `server/src/middleware/auth.ts` `requirePermission()` | High | Yes | Yes (pbacDecisionsTotal) | No | Full audit event via AdvancedAuditSystem |
| Permission granted | `server/src/middleware/auth.ts` `requirePermission()` | Low | No | Yes (pbacDecisionsTotal) | No | Metric only, no audit event |
| Auth failure | `server/src/middleware/auth.ts` `ensureAuthenticated()` | High | No | No | No | 401 returned but no audit event |
| Role check failure | `server/src/middleware/auth.ts` `ensureRole()` | High | No | No | No | 403 returned but no audit event |
| OPA policy decision | `server/src/middleware/opa-enforcer.ts` | High | Partial | No | No | Decision logged but not always via audit system |
| Tenant isolation violation | `server/src/tenancy/TenantIsolationGuard.ts` | Critical | Partial | No | No | Guard evaluates but gaps in audit coverage |

## 7. WebSocket Events

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Connection established | `services/websocket-server/src/server.ts` | Medium | No | Yes (activeConnections) | No | Metrics but no security audit event |
| Auth failure on connect | `services/websocket-server/src/middleware/auth.ts` | High | No | Yes (authFailures) | No | Counter only, no structured audit |
| Rate limit hit | `services/websocket-server/src/middleware/rateLimit.ts` | Medium | No | Yes (rateLimitHits) | No | Counter only |
| Message sent/received | `services/websocket-server/src/handlers/` | Low | No | Yes (messagesSent/Received) | No | Volume metrics only |

## 8. Audit System Self-Monitoring

| Event | Location | Risk | Logged? | Metrics? | Traces? | Notes |
|-------|----------|------|---------|----------|---------|-------|
| Audit buffer flush failure | `server/src/audit/advanced-audit-system.ts` | Critical | Partial | No | No | Error logged but no metric for monitoring |
| Audit retention sweep | `server/src/audit/advanced-audit-system.ts` | Medium | Yes | No | No | Logger.info on completion |
| Audit schema init failure | `server/src/audit/advanced-audit-system.ts` | Critical | Partial | No | No | Error logged, no metric |

---

## Gap Summary

### Critical Gaps (must address)
1. **Report generation/viewing** has zero audit logging - no "who saw what when" for sensitive intelligence reports
2. **Disclosure export downloads** lack actor attribution - bulk data retrieval is unaudited
3. **OSINT feed ingestion** has no audit trail - external data enters the system without structured logging
4. **Auth failures** at the primary middleware layer are not recorded as audit events

### High-Priority Gaps
5. **Entity reads** (`GET /entities/:id`) have no audit trail while entity searches do (partially)
6. **WebSocket auth failures** have counter metrics but no structured audit events for investigation
7. **Audit system self-monitoring** lacks metrics for flush failures and write errors

### Recommendations
- Introduce a central `SecurityAuditLogger` that wraps the existing `AdvancedAuditSystem` with non-blocking, fire-and-forget semantics for hot paths
- Add security-specific Prometheus metrics: `security_audit_writes_total`, `security_audit_write_failures_total`, `security_sensitive_reads_total`, `security_auth_denials_total`
- Wire the logger into the top-priority gaps (reports, exports, OSINT, entity reads) first
- Expose audit write health as a metric so SOC dashboards can alert on silent failures
