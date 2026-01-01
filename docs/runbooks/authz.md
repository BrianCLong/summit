# AuthZ Runbook: OPA RBAC + ABAC

This runbook describes how to manage authorization policies, validate changes, and roll out OPA bundles across Summit/IntelGraph services.

## Roles and Permissions

Roles are defined in `policy/data/roles.json` and map to permissions. Permission metadata (risk, clearance, time windows, warrant requirements) live in `policy/data/permissions.json`.

- Roles: `analyst`, `lead_analyst`, `admin`, `auditor`, `service_account`
- Permissions: `ingest:write`, `graph:query`, `report:export`, `admin:*`, `tenant:impersonate`

## Local Testing

```bash
opa fmt --diff policy
opa test policy/authz policy/common policy/tests -v --coverage --threshold 90
python -m pip install jsonschema && python -m jsonschema -i policy/fixtures/analyst_report.json policy/schema/input.schema.json
```

## Building Bundles

```bash
ENTRYPOINT=policy/authz/abac/decision ./.ci/scripts/opa/build_wasm.sh policy dist/opa/policy-bundle.tar.gz
```

## Deploying Bundles

1. Commit policy/data and policy/authz changes.
2. CI publishes coverage artifact from `.github/workflows/policy-ci.yml`.
3. Build bundle with the script above and publish as an artifact tagged with the git SHA.
4. Helm chart (`deploy/helm/intelgraph/templates/opa`) mounts the bundle/config map; rolling update canary first.
5. To rollback, re-publish the previous bundle (git tag) and redeploy.

## Gateway and Services

- Gateway middleware (`apps/gateway/src/middleware/authz.ts`) calls OPA for every request (except `/healthz`) and returns actionable 403 responses with `x-deny-reason` and `x-trace-id`.
- Services use `services/lib/authz.ts` and enforce checks in ingest, reporting, and NLQ endpoints for defense in depth.

## Decision Logging & Observability

- Decision logs include hashed subject IDs, action, tenant, and deny reasons and are wired for Loki ingestion.
- Grafana dashboard: `observability/grafana/dashboards/authz.json` exposes decision rates, top denies, and p95 latency.

## Troubleshooting Denies

1. Capture `x-trace-id` and `x-deny-reason` from the response.
2. Query decision logs in Loki using the trace ID.
3. Validate inputs against `policy/schema/input.schema.json`.
4. Re-run `opa test` with the fixture that matches the failing request; add a regression case if missing.
5. If step-up or warrant binding blocks the request, verify MFA and warrant metadata are present.
