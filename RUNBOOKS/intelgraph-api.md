# IntelGraph API Runbook (Service #2)

## Service Overview

- **Service Name:** IntelGraph API
- **Code Location:** `server/` (primary API implementation and GraphQL handlers)
- **Owners:** Platform / Core Services
- **SLO Config:** [`slo/intelgraph-api.yaml`](../slo/intelgraph-api.yaml)
- **Alert Policy:** `ALERT_POLICIES.yaml` → `IntelGraphAPICanaryErrorBudget`

## Canary & Promotion

- **Canary Workflow:** `.github/workflows/canary-intelgraph-api.yml`
- **Golden Path:** `.github/workflows/ci-golden-path.yml`
- **Promotion Gate:** Ensure canary workflow is green before promotion.

## Health Checks

- **API Health:** `GET /health`
- **GraphQL:** `POST /graphql` with a minimal introspection or lightweight query

## Common Alerts & Actions

### IntelGraphAPICanaryErrorBudget

**Symptoms**

- Elevated 5xx responses in the 15-minute canary window.

**Immediate Actions**

1. Pause rollout and freeze promotion.
2. Compare error rate against baseline deploy.
3. Check recent deploy logs and service logs.

**Remediation Steps**

- Roll back the canary release if error rate persists for >5 minutes.
- Validate dependency health (Postgres, Redis, Neo4j).

## Escalation

- If the API remains unstable after rollback, follow [Incident Response](./incident-response.md).
- If data integrity is at risk, page on-call and initiate [Disaster Recovery Procedures](./disaster-recovery-procedures.yaml).
