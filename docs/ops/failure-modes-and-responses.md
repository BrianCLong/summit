# Failure Modes and Response Taxonomy

This document catalogs common failure modes for the Summit / IntelGraph platform, how to detect them, and the recommended first-response actions.

## 1. Database Failures

### Postgres Down / Unreachable

- **Symptoms**: API returns 500 errors. Logs show `ConnectionRefused` or `timeout` connecting to port 5432.
- **Detection**:
  - Health check `/health/detailed` reports `postgres: unhealthy`.
  - Metrics: `pg_up` is 0.
  - Logs: `Error: connect ECONNREFUSED` in API/Worker.
- **Impact**: **CRITICAL**. Auth, Users, and core data unavailable. System is effectively down.
- **Response**:
  1.  Check Postgres container/pod status: `docker compose ps postgres` or `kubectl get pod postgres`.
  2.  Check logs: `docker compose logs postgres`.
  3.  Restart service: `docker compose restart postgres`.
  4.  Verify disk space is not full.

### Neo4j Down / Slow

- **Symptoms**: Graph-related queries fail. API might work partialy (Auth works, but Graph views fail).
- **Detection**:
  - Health check `/health/detailed` reports `neo4j: unhealthy`.
  - Logs: `ServiceUnavailable: WebSocket connection failure` or `SessionExpired`.
- **Impact**: **HIGH**. Knowledge graph features, search, and analysis tools unavailable.
- **Response**:
  1.  Check Neo4j status: `docker compose ps neo4j`.
  2.  Check memory usage (Neo4j is memory hungry).
  3.  Restart: `docker compose restart neo4j`.

### Redis Down

- **Symptoms**: Session loss, Rate limiting fails (open or closed), Background jobs stop processing.
- **Detection**:
  - Health check `/health/detailed` reports `redis: unhealthy`.
  - Logs: `Redis connection lost`.
- **Impact**: **MEDIUM/HIGH**. System might feel "logged out". Async tasks pile up.
- **Response**:
  1.  Check Redis status: `docker compose ps redis`.
  2.  Restart: `docker compose restart redis`.
  3.  If using ElastiCache, check AWS console for maintenance events.

## 2. Infrastructure Failures

### Kafka Down (Ingestion/NLP)

- **Symptoms**: Ingestion pipelines stall. New data does not appear in the system.
- **Detection**:
  - Logs in `ingestion-service` showing `KafkaTimeoutError`.
  - Consumer lag metrics increasing.
- **Impact**: **MEDIUM**. Real-time capabilities paused. Data is not lost if producers buffer, but latency increases.
- **Response**:
  1.  Check Zookeeper and Kafka containers.
  2.  Restart Zookeeper first, then Kafka.

### OPA Down (Policy Engine)

- **Symptoms**: All requests requiring authorization might fail (fail-closed) or pass insecurely (if fail-open, but usually fail-closed).
- **Detection**:
  - API Logs: `ECONNREFUSED` connecting to OPA sidecar/service.
- **Impact**: **CRITICAL**. Access control unavailable.
- **Response**:
  1.  Check OPA container status.
  2.  Verify policy bundle loading (check OPA logs for syntax errors in Rego).

## 3. External Dependency Failures

### LLM Provider (OpenAI/Anthropic) Outage

- **Symptoms**: AI Chat/Copilot features return errors or hang.
- **Detection**:
  - Logs: `429 Too Many Requests` or `5xx Server Error` from upstream API.
  - Latency spikes on `/api/chat` endpoints.
- **Impact**: **LOW/MEDIUM**. Core business logic usually remains functional.
- **Response**:
  1.  Check status page of the provider (e.g., status.openai.com).
  2.  Temporarily disable AI features via Feature Flag if errors are noisy.

## 4. Resource Exhaustion

### Disk Full

- **Symptoms**: Database write errors. Pods executing eviction.
- **Detection**:
  - Host metrics (disk usage > 90%).
  - Postgres logs: `PANIC: could not write to file`.
- **Response**:
  1.  Identify filling volume (Logs? DB Data?).
  2.  Prune old docker images/volumes if local: `docker system prune`.
  3.  Expand storage volume.

### Memory OOM

- **Symptoms**: Service crashes and restarts ("OOMKilled").
- **Detection**:
  - `kubectl get pods` shows `Restarts` count increasing.
  - `dmesg` or monitoring tools show OOM kill.
- **Response**:
  1.  Check memory limits in `docker-compose.yml` or K8s manifest.
  2.  Analyze heap dumps if Node.js (enable `--inspect`).
