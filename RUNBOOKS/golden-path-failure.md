# Runbook: Golden Path Failure

**Severity:** Critical (Blocks Development/Release)
**Trigger:** `make smoke` fails, CI `smoke-test` fails, or `APIHealthDown` alert fires.

## 1. Triage
1. **Check CI/Local Logs:**
   - Look for "FAILED" steps in `scripts/smoke-test.cjs` output.
   - Note the timestamp and specific step (e.g., "Create Investigation").
2. **Verify Infrastructure:**
   - Run `./scripts/wait-for-stack.sh` (or `make up`) to check health endpoints.
   - Check `docker-compose ps` to ensure all containers are `Up (healthy)`.

## 2. Diagnosis
- **If `http://localhost:4000/health` is down:**
  - Check API logs: `docker-compose logs api`.
  - Check DB connection: Is Postgres/Neo4j up?
- **If "Create Investigation" fails:**
  - Check Neo4j logs.
  - Verify `createInvestigation` mutation schema matches `smoke-test.cjs`.
- **If "Frontend Health Check" fails:**
  - Check client logs: `docker-compose logs client`.
  - Ensure client build passed.

## 3. Mitigation
- **Local Dev:**
  - Run `make down && make up` to reset state.
  - Run `make migrate` to ensure schema is fresh.
- **CI/Production:**
  - If a deployment caused this, **ROLLBACK** immediately.
  - If it's a flaky test, re-run *once*. If it fails again, treat as incident.

## 4. Escalation
- **Owner:** Platform Team / On-call SRE.
- **Channels:** #dev-ops, #summit-alerts.
