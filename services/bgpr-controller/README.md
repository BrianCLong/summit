# BGPR Controller Service

The BGPR controller exposes deterministic policy rollout orchestration with audit logging and guardrail enforcement.

## Running Locally

```bash
export BGPR_MANIFEST_SECRET="super-secret"
cd services/bgpr-controller
go run . --port 8085 --policy policy-v1
```

The service exposes the following endpoints:

- `POST /api/bgpr/dry-run` – simulate a rollout using a signed manifest without committing changes.
- `POST /api/bgpr/rollouts` – apply a rollout; guardrails automatically revert the policy if breached.
- `GET /api/bgpr/status` – inspect the current policy, last rollout metrics, and audit trail entries.

See `client/src/features/bgpr` for a TypeScript dashboard that drives these endpoints.

