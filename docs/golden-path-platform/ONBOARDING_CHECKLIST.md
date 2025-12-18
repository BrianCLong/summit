# Service Onboarding Checklist

> **Version**: 1.0.0
> **Last Updated**: 2025-12-06

This checklist ensures services meet all Golden Path Platform requirements before going live. Complete all items to achieve "Golden Path Ready" status.

---

## Pre-Flight Checklist

Use this checklist when onboarding a new service or migrating an existing service to the Golden Path.

### 1. Repository Structure ✓

- [ ] **Service created via scaffold CLI**
  ```bash
  companyos create <type> --name <service-name>
  ```

- [ ] **Standard directory structure present**
  ```
  ✓ src/           - Source code
  ✓ tests/         - Test files
  ✓ slos/          - SLO definitions
  ✓ dashboards/    - Grafana dashboards
  ✓ policies/      - OPA policies
  ```

- [ ] **Required configuration files exist**
  - [ ] `package.json` with standard scripts
  - [ ] `tsconfig.json` extending base config
  - [ ] `jest.config.js` with coverage thresholds
  - [ ] `.eslintrc.json` with platform rules
  - [ ] `Dockerfile` with multi-stage build
  - [ ] `.env.example` with all required variables

- [ ] **Documentation complete**
  - [ ] `README.md` with service overview
  - [ ] API documentation (OpenAPI/GraphQL schema)
  - [ ] Runbook for common issues
  - [ ] Architecture decision records (if applicable)

### 2. Code Quality ✓

- [ ] **Linting passes**
  ```bash
  pnpm lint        # Zero errors
  pnpm typecheck   # No TypeScript errors
  ```

- [ ] **Formatting consistent**
  ```bash
  pnpm format:check  # All files formatted
  ```

- [ ] **No security issues in code**
  - [ ] No hardcoded secrets
  - [ ] Input validation on all endpoints
  - [ ] SQL/NoSQL injection prevention
  - [ ] XSS prevention (if applicable)

### 3. Testing ✓

- [ ] **Unit tests present and passing**
  ```bash
  pnpm test:unit   # All tests pass
  ```

- [ ] **Coverage thresholds met**
  | Tier | Lines | Branches | Functions |
  |------|-------|----------|-----------|
  | 1    | 90%   | 85%      | 90%       |
  | 2    | 80%   | 75%      | 80%       |
  | 3    | 70%   | 65%      | 70%       |

- [ ] **Integration tests present**
  ```bash
  pnpm test:integration  # Database/service tests pass
  ```

- [ ] **Smoke tests defined**
  - [ ] `tests/smoke/` directory exists
  - [ ] Critical path coverage

### 4. Health & Observability ✓

- [ ] **Health endpoints implemented**
  | Endpoint | Purpose | Response |
  |----------|---------|----------|
  | `/health` | Basic liveness | `{"status": "ok"}` |
  | `/health/ready` | Readiness (deps) | `{"status": "ok", "checks": {...}}` |
  | `/health/live` | Liveness probe | `{"status": "ok"}` |

- [ ] **Metrics endpoint exposed**
  ```bash
  curl localhost:8080/metrics  # Prometheus format
  ```

- [ ] **Required metrics present**
  - [ ] `http_requests_total` (counter)
  - [ ] `http_request_duration_seconds` (histogram)
  - [ ] `http_requests_in_flight` (gauge)
  - [ ] Custom business metrics

- [ ] **Structured logging configured**
  ```json
  {
    "level": "info",
    "time": "2024-01-15T10:30:00.000Z",
    "service": "my-service",
    "traceId": "abc123",
    "msg": "Request processed"
  }
  ```

- [ ] **OpenTelemetry tracing enabled**
  - [ ] `OTEL_SERVICE_NAME` configured
  - [ ] Trace context propagation
  - [ ] Spans for external calls

### 5. SLO Definition ✓

- [ ] **SLO file exists**: `slos/slos.yaml`

- [ ] **Availability SLO defined**
  ```yaml
  - name: availability
    objective: 99.9  # Adjust by tier
    sli:
      type: availability
  ```

- [ ] **Latency SLO defined**
  ```yaml
  - name: latency-p99
    objective: 99.0
    sli:
      type: latency
      threshold_ms: 500
  ```

- [ ] **Error budget alerts configured**
  - [ ] Burn rate alert (fast burn)
  - [ ] Burn rate alert (slow burn)

### 6. Grafana Dashboard ✓

- [ ] **Dashboard file exists**: `dashboards/grafana.json`

- [ ] **Required panels present**
  - [ ] Request rate (QPS)
  - [ ] Error rate (%)
  - [ ] Latency percentiles (p50, p95, p99)
  - [ ] Saturation (CPU, memory)
  - [ ] Custom business metrics

- [ ] **Dashboard variables configured**
  - [ ] `$namespace`
  - [ ] `$service`
  - [ ] `$interval`

### 7. Security & Policy ✓

- [ ] **OPA policy file exists**: `policies/authz.rego`

- [ ] **Authentication configured**
  - [ ] JWT/OIDC validation middleware
  - [ ] Token refresh handling
  - [ ] Unauthorized response format

- [ ] **Authorization rules defined**
  ```rego
  package myservice.authz
  default allow = false
  # Health endpoints public
  allow { input.path == "/health" }
  # Other endpoints require auth
  allow { input.jwt.valid }
  ```

- [ ] **Secrets management**
  - [ ] No secrets in code/config
  - [ ] External Secrets manifest (if needed)
  - [ ] Secret rotation documented

- [ ] **Network policy defined**
  - [ ] Ingress rules specified
  - [ ] Egress rules specified
  - [ ] Default deny enabled

### 8. CI/CD Configuration ✓

- [ ] **CI workflow file exists**: `.github/workflows/ci.yml`

- [ ] **Uses reusable workflows**
  ```yaml
  jobs:
    pipeline:
      uses: ./.github/workflows/_golden-path-pipeline.yml
      with:
        service: my-service
  ```

- [ ] **All required stages enabled**
  - [ ] Lint
  - [ ] Test
  - [ ] Security (SAST, secret scan, CVE scan)
  - [ ] Build
  - [ ] Deploy

- [ ] **Branch protection configured**
  - [ ] Require PR reviews
  - [ ] Require status checks
  - [ ] No direct push to main

### 9. Container & Deployment ✓

- [ ] **Dockerfile follows standards**
  ```dockerfile
  # Multi-stage build
  FROM node:20-alpine AS builder
  # ... build steps ...

  FROM node:20-alpine
  USER node  # Non-root user
  # ... production image ...
  ```

- [ ] **Container security**
  - [ ] Runs as non-root
  - [ ] No unnecessary capabilities
  - [ ] Read-only filesystem (where possible)
  - [ ] Resource limits defined

- [ ] **Kubernetes manifests ready**
  - [ ] Helm chart or kustomize
  - [ ] Resource requests/limits
  - [ ] Liveness/readiness probes
  - [ ] PodDisruptionBudget
  - [ ] HorizontalPodAutoscaler

- [ ] **Image signing configured**
  - [ ] Cosign signature on push
  - [ ] SBOM attestation

### 10. Documentation & Ownership ✓

- [ ] **Team ownership defined**
  ```json
  // package.json
  {
    "companyos": {
      "team": "platform-team",
      "tier": 2,
      "oncall": "platform-oncall@company.com"
    }
  }
  ```

- [ ] **CODEOWNERS file updated**
  ```
  /services/my-service/ @platform-team
  ```

- [ ] **Runbook exists**
  - [ ] Common failure modes
  - [ ] Troubleshooting steps
  - [ ] Escalation path
  - [ ] Recovery procedures

- [ ] **Service catalog entry**
  - [ ] Description
  - [ ] Dependencies
  - [ ] SLA commitments
  - [ ] Contact information

---

## Verification Commands

Run these commands to verify readiness:

```bash
# 1. Validate structure
companyos validate <service-name>

# 2. Run all tests
pnpm --filter @companyos/<service-name> test

# 3. Check security
pnpm --filter @companyos/<service-name> audit
trivy fs ./services/<service-name>

# 4. Build container
docker build -t <service-name>:test ./services/<service-name>
trivy image <service-name>:test

# 5. Run locally
docker-compose up -d
curl http://localhost:8080/health
curl http://localhost:8080/metrics

# 6. Verify SLOs
promtool check rules slos/slos.yaml
```

---

## Sign-Off Requirements

Before production deployment, obtain sign-off from:

| Role | Requirement | Approver |
|------|-------------|----------|
| **Tech Lead** | Code review, architecture approval | Team tech lead |
| **Security** | Security review (Tier 1-2 only) | Security team |
| **SRE** | SLO review, runbook approval | SRE team |
| **Platform** | Golden Path compliance | Platform team |

### Sign-Off Template

```markdown
## Service Onboarding Sign-Off

**Service**: my-service
**Team**: platform-team
**Tier**: 2
**Date**: 2024-01-15

### Checklist Completion
- [x] Repository Structure (10/10)
- [x] Code Quality (4/4)
- [x] Testing (4/4)
- [x] Health & Observability (4/4)
- [x] SLO Definition (3/3)
- [x] Grafana Dashboard (3/3)
- [x] Security & Policy (5/5)
- [x] CI/CD Configuration (4/4)
- [x] Container & Deployment (4/4)
- [x] Documentation & Ownership (4/4)

### Approvals
- [ ] Tech Lead: @tech-lead (pending)
- [ ] Security: @security-team (pending)
- [ ] SRE: @sre-team (pending)
- [ ] Platform: @platform-team (pending)

### Notes
[Any exceptions or special considerations]
```

---

## Exception Process

If unable to meet a requirement, follow the exception process:

1. **Document the gap** in `EXCEPTIONS.md`
2. **Justify** why the requirement cannot be met
3. **Propose compensating controls**
4. **Get approval** from relevant team
5. **Set expiration** (max 90 days)
6. **Track** in platform dashboard

### Exception Template

```markdown
## Exception: [Service Name] - [Requirement]

### Requested By
- Team: platform-team
- Requestor: @developer
- Date: 2024-01-15

### Requirement
Coverage threshold 80% cannot be met due to legacy code.

### Current State
Current coverage: 65%

### Justification
Service contains legacy code scheduled for deprecation in Q2.
Investing in test coverage for soon-to-be-removed code is not efficient.

### Compensating Controls
1. Manual testing checklist for critical paths
2. Increased monitoring during deployments
3. Gradual coverage increase plan (5% per sprint)

### Approval
- [ ] Platform team: @platform-lead

### Expiration
2024-04-15 (90 days)

### Renewal Criteria
Exception will be re-evaluated if:
- Legacy code deprecation is delayed
- Incident occurs related to untested code
```

---

## Post-Onboarding

After achieving Golden Path Ready status:

1. **Monitor SLOs** via Grafana dashboard
2. **Review alerts** weekly for false positives
3. **Update documentation** as service evolves
4. **Participate in** platform improvement discussions
5. **Share learnings** with other teams

---

## Related Documents

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md)
- [CI/CD Pipeline Design](./CICD_PIPELINE.md)
- [ADR-0014: Golden Path Platform](./ADR-0014-golden-path-platform.md)
