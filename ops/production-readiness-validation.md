# Production Readiness Validation Plan

This plan converts the outstanding production gaps into executable validation work with measurable evidence. Each track produces artifacts (logs, screenshots, metrics exports) attached to the release ticket.

## 1) Performance and scale
- **Baseline latency:** run `npm run perf:snapshot -- --env prod` on 3 sample workflows (read, write, inference) and capture p50/p95/p99 plus CPU/memory. Export Prometheus range queries for the same window.
- **Load test:** execute `artillery run scripts/perf/main.yml` targeting prod with ramp to 1k req/min and 200 concurrent users. Store report JSON and Grafana snapshots.
- **Database profiling:** enable query logs for Neo4j and PostgreSQL during the load window; record slow query samples and index hit rates.
- **Acceptance:** p95 GraphQL latency < 1s, error rate <0.5%, cache hit ratio >70% during the run.

## 2) Security hardening validation
- **Persisted queries enforced:** call `npm run persisted:check` against prod endpoint and attempt a non-whitelisted query; expect 403/validation failure logged.
- **Rate limiting:** rerun `artillery run scripts/perf/rate-limit.yml` and confirm 429s plus Alertmanager silence <15m.
- **Audit logging:** stream a sample `kubectl logs deploy/api -n summit-prod | grep audit` to confirm structured entries for authn/authz paths.
- **Pen test placeholder:** schedule `zap-cli` baseline scan and attach report; block release on medium/high findings.

## 3) Backup and disaster recovery
- **Backup verification:** trigger `npm run backup` and confirm artifacts in object storage with checksum + timestamp.
- **Restore drill:** launch ephemeral namespace `summit-restore`, apply DB snapshots, and replay 24h of events using `scripts/db/replay.sh`. Compare row counts and graph node/edge totals to prod baseline.
- **RTO/RPO measurement:** capture total recovery time and max data loss from the drill; document in the ticket.
- **Point-in-time recovery:** if WAL archive enabled, perform PITR to T-15m and validate application smoke against restored stack.

## 4) Observability and alerting
- **Traces:** enable OpenTelemetry collector and verify traces arriving in Tempo/Jaeger; ensure GraphQL, background jobs, and WebSocket events have spans with `tenant` and `requestId` attributes.
- **Metrics:** extend Prometheus scrape to include business KPIs (workspace creations, ingestion throughput). Export a Prometheus rule file capturing SLOs and alert thresholds.
- **Alerts:** configure and fire-test Alertmanager routes: latency SLO burn, error rate, queue backlog, and rate-limit breach. Capture screenshots and alert payloads.

## 5) Application workflows (integration/E2E)
- **Collaboration:** run `node test-collab.js --env prod --users 3 --duration 10m` to validate conflict resolution and reconnection.
- **AI pipeline:** execute `npm run extract -- --document samples/demo.pdf --validate-threshold 0.85` and assert confidence gating works.
- **WebSocket reconnection:** run `scripts/websocket/failover.sh` to force reconnection and verify session resumption.
- **Data integrity:** perform diff between staging and prod schemas using `scripts/graphql/verify_schema.sh --env prod`.

## 6) Reporting and sign-off
- Publish a single PDF or markdown summary with: test commands, timestamps, success/failure, and links to artifacts.
- Attach Grafana dashboards and query exports as evidence.
- Release manager signs off only when all tracks meet acceptance criteria or approved exceptions are documented.
