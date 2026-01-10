# Summit MVP-4 GA Frequently Asked Questions

**Version:** 1.0
**Last Updated:** 2025-12-30

---

## General Questions

### Q1: What is Summit MVP-4 GA?

**A:** Summit MVP-4 GA is the General Availability release of the Summit intelligence analysis platform. It provides a production-ready governance framework with:

- **Policy-as-Code**: OPA-based policy evaluation with versioned Rego policies
- **Multi-Tenant Architecture**: Strict tenant isolation with ABAC controls
- **Immutable Audit Trail**: Cryptographically signed, append-only audit logs
- **Human-in-the-Loop Governance**: Approval workflows for high-risk operations

The release achieved a **95.75% readiness score** based on the GA assessment methodology.

---

### Q2: What does "GA" mean in this context?

**A:** "GA" stands for **Governance & Attestation** in the Summit context. It refers to the governance layer that provides:

- Policy-driven access control
- Provenance attestation for data lineage
- Compliance verification
- Audit trail capabilities

GA also indicates **General Availability**, meaning the platform is production-ready for deployment.

---

### Q3: What is the 95.75% readiness score based on?

**A:** The readiness score is calculated from six weighted dimensions:

| Dimension | Weight | Score |
|-----------|--------|-------|
| Code & Architecture | 25% | 100% |
| Security | 30% | 95% |
| CI/CD | 15% | 95% |
| Documentation | 15% | 100% |
| Testing | 10% | 80% |
| Hygiene | 5% | 100% |

The threshold for GA approval is **≥95%**. The 95.75% score exceeds this threshold.

---

## Architecture Questions

### Q4: What is the technology stack?

**A:** The MVP-4 GA stack includes:

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS, TypeScript |
| API | GraphQL with Apollo Server v5 |
| Database | PostgreSQL 14+, Neo4j 5.x |
| Cache | Redis 7.x |
| Policy Engine | Open Policy Agent (OPA) |
| Observability | OpenTelemetry, Prometheus, Grafana |

---

### Q5: What is the default-deny policy model?

**A:** The default-deny model means:

1. All requests are denied by default
2. Policies must explicitly allow access
3. Policy evaluation errors result in DENY
4. Missing policies result in DENY

This is enforced in `policies/mvp4_governance.rego`:

```rego
default allow = false
```

---

### Q6: How does tenant isolation work?

**A:** Tenant isolation is enforced at multiple layers:

1. **OPA Policy**: `policies/abac_tenant_isolation.rego` evaluates tenant context
2. **Middleware**: `TenantIsolationGuard` validates `resourceTenantId === requestTenantId`
3. **Database**: Queries filtered by tenant ID
4. **Neo4j**: Graph queries scoped to tenant namespace

Cross-tenant access attempts return **403 Forbidden** and are logged to the audit trail.

---

## Security Questions

### Q7: What authentication methods are supported?

**A:** MVP-4 GA supports:

- **OIDC/JWT**: Industry-standard token-based authentication
- **Token Sources**: `Authorization: Bearer <token>` or `x-access-token` header
- **Token Validation**: RS256 or HS256 signature verification, issuer validation, expiration enforcement

All non-public endpoints require authentication.

---

### Q8: What is the role hierarchy?

**A:** The RBAC system includes four roles:

| Role | Permissions |
|------|-------------|
| **admin** | Wildcard (`*`) - full access |
| **operator** | Workflow, task, evidence, policies, serving, CTI, pricing, capacity |
| **analyst** | Workflow read/execute, task read/execute, evidence, policies read |
| **viewer** | Read-only across all resources |

---

### Q9: How are secrets protected?

**A:** Secret protection includes:

1. **CI Scanning**: Gitleaks integrated in `mvp4-gate.yml`
2. **Input Validation**: Production config rejects test secrets
3. **Minimum Requirements**: JWT secrets must be ≥32 characters
4. **Log Redaction**: Tokens, passwords, PII redacted from logs

---

### Q10: What security headers are enforced?

**A:** Full Helmet configuration with:

| Header | Value |
|--------|-------|
| Content-Security-Policy | `default-src 'self'; script-src 'self'...` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |

GraphQL introspection is disabled in production.

---

## Operational Questions

### Q11: How do I verify the deployment?

**A:** Run the following verification commands:

```bash
curl -s localhost:3000/health
curl -s localhost:3000/health/detailed
opa check policies/
opa test policies/ -v
```

---

### Q12: What is the canary deployment strategy?

**A:** The canary deployment follows these stages:

| Stage | Traffic | Duration |
|-------|---------|----------|
| Internal canary | 0% | 15 min |
| Canary 5% | 5% | 30 min |
| Canary 25% | 25% | 30 min |
| Canary 50% | 50% | 30 min |
| Full rollout | 100% | 10 min |

**Total Duration**: ~2 hours
**Rollback Time**: <3 minutes (automated)

---

### Q13: How do I rollback a deployment?

**A:** Quick rollback:

```bash
kubectl rollout undo deployment/summit
kubectl rollout status deployment/summit
```

Full rollback is documented in `docs/ga/ROLLBACK.md`.

---

### Q14: What monitoring is available?

**A:** Observability stack includes:

| Component | Purpose |
|-----------|---------|
| OpenTelemetry | Distributed tracing |
| Prometheus | Metrics collection |
| Grafana | Dashboards |
| Pino | Structured logging |

---

## Policy Questions

### Q15: How do I add a custom policy?

**A:** To add a custom policy:

1. Create a Rego file in `policies/`
2. Add tests in `policies/tests/`
3. Validate: `opa check policies/ && opa test policies/ -v`
4. Submit for peer review

---

### Q16: What is a GovernanceVerdict?

**A:** A `GovernanceVerdict` is a structured decision object returned with all AI/LLM outputs:

```json
{
  "verdict": "ALLOW",
  "reason": "Policy evaluation passed",
  "policyVersion": "v4.0.0",
  "evaluatedAt": "2025-12-30T10:00:00Z"
}
```

Possible verdicts: `ALLOW`, `DENY`, `PENDING_APPROVAL`

---

## Troubleshooting Questions

### Q17: Why am I getting 403 Forbidden errors?

**A:** Common causes:

1. **Missing tenant context**: Ensure `x-tenant-id` header is set
2. **Insufficient permissions**: Verify user role has required permission
3. **Cross-tenant access**: Requests to resources in other tenants are blocked
4. **Policy evaluation failure**: Check policy syntax with `opa check policies/`

---

### Q18: Why are policy tests failing?

**A:** Troubleshooting steps:

1. **Syntax errors**: Run `opa check policies/`
2. **Import issues**: Verify `future.keywords` imports
3. **Test data**: Ensure test fixtures match expected input schema
4. **OPA version**: Confirm OPA 0.60+ is installed

---

### Q19: What are the known limitations?

**A:** Current limitations:

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Test environment variability | Local tests may differ from CI | CI is authoritative |
| Legacy lint warnings | Some legacy code has warnings | New code enforces strict linting |
| Error budgets not defined | No formal SLO enforcement | Prometheus/AlertManager configuration available |

---

### Q20: Where can I get help?

**A:** Support channels:

| Resource | Contact |
|----------|---------|
| Release Captain | @release-captains |
| Security Team | @security-team |
| SRE On-Call | @sre-oncall |

Documentation:
- `docs/ga/DEPLOYMENT.md`
- `docs/ga/ROLLBACK.md`
- `docs/ga/OBSERVABILITY.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
