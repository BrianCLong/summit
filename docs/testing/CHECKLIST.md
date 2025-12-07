# Service Quality Checklist

A CompanyOS service is considered **Production Ready** only if it meets the following criteria:

## ✅ 1. Testing Coverage
- [ ] **Unit Tests:** Business logic covered (>70%).
- [ ] **Integration Tests:** Repository/Database layer verified with real DB.
- [ ] **Critical Path:** The "Happy Path" for the service's main function is tested end-to-end.
- [ ] **Error Handling:** Tests exist for 4xx/5xx scenarios (e.g., Not Found, Unauthorized, Downstream Failure).

## ✅ 2. Infrastructure & config
- [ ] **CI/CD:** Service has a working CI workflow that runs tests on PR.
- [ ] **Dockerfile:** Service builds successfully and container starts.
- [ ] **Health Check:** `/health` endpoint exists and returns 200 OK + dependency status.
- [ ] **Configuration:** All secrets are env vars; defaults are safe for Dev.

## ✅ 3. Observability
- [ ] **Logging:** Structured JSON logging used (no `console.log`).
- [ ] **Metrics:** Prometheus metrics exposed (Request count, Latency, Error rate).
- [ ] **Tracing:** OpenTelemetry instrumentation enabled.

## ✅ 4. Documentation
- [ ] **README:** Explains how to run locally and how to run tests.
- [ ] **API Spec:** OpenAPI (Swagger) or GraphQL Schema is up to date.

## ✅ 5. Security
- [ ] **Auth:** Endpoints require Authentication/Authorization (unless public by design).
- [ ] **Input Validation:** All inputs validated (Zod/Joi) before processing.
- [ ] **Deps:** No Critical/High vulnerability dependencies.
