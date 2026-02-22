# Golden Path Security & Controls

This document outlines the security guardrails and controls implemented to ensure the reliability and security of the Summit Platform's Golden Path.

## 1. Production Secrets Validation

**Control:** The API server enforces strict validation of critical secrets in production environments.
**Enforcement:** `server/src/config.ts`
**Test:** `server/tests/security/config_guardrails.test.ts`

### Mechanism
On startup, if `NODE_ENV=production`:
- **JWT_SECRET** and **JWT_REFRESH_SECRET** must be at least 32 characters long.
- Secrets must not contain insecure tokens like `default`, `password`, `changeme`, `secret`, `localhost`.
- **Database passwords** are checked for known development defaults.

If any check fails, the server process exits with code 1, preventing deployment.

## 2. CORS Misconfiguration Protection

**Control:** The API server prevents permissive CORS configurations in production.
**Enforcement:** `server/src/config.ts`
**Test:** `server/tests/security/config_guardrails.test.ts`

### Mechanism
On startup, if `NODE_ENV=production`:
- `CORS_ORIGIN` must be explicitly defined.
- Wildcards (`*`) are prohibited.
- `http://` origins are prohibited (must be `https://`).
- `localhost` origins are prohibited.

## 3. Golden Path Observability

**Control:** Continuous monitoring of the Golden Path health endpoint availability.
**Enforcement:** Prometheus Alert Rule
**Artifact:** `observability/alert-rules.yml`
**Dashboard:** `observability/dashboards/golden-path-health.json`

### Metric
We monitor the `/health/ready` endpoint availability over a rolling 7-day window.

**Alert Rule:** `GoldenPathHealthLow`
- **Threshold:** < 99.5% availability
- **Window:** 7 days (evaluated every 5 minutes)
- **Severity:** Critical

### Implementation
```yaml
expr: sum(rate(http_request_duration_seconds_count{path="/health/ready", status="200"}[7d])) / sum(rate(http_request_duration_seconds_count{path="/health/ready"}[7d])) < 0.995
```

## How to Verify
1.  **Run Tests:** `npm test tests/security/config_guardrails.test.ts` (Ensure `NODE_ENV` is managed by the test runner).
2.  **View Dashboard:** Import `observability/dashboards/golden-path-health.json` into Grafana.
