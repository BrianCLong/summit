# MC v0.3.9 — Resolvers + Typed Client

## Server
- Env: `OPA_URL`, `PORT`, `PERSISTED_MANIFEST`.
- Start: `npm -C server-v039 run dev` (or build + docker).
- Enforces **persisted-only** at `/graphql` and requires provenance header.
- Every mutation → OPA `mc/admin/decision` → emits audit (SIEM in prod).

## Client
- Update `client-v039/src/manifest.ts` with hashes from `out/persisted-manifest.resolved.json` (CI artifact).
- Usage:
  ```ts
  import { McAdminClient } from 'mc-admin-client';
  const mc = new McAdminClient('https://api.example.com/graphql', {
    'x-actor-id': 'ops-123', 'x-actor-role': 'platform-admin', 'x-actor-tenant': 'ALL'
  });
  await mc.setSloThresholds({ tenant: 'ALL', thresholds: { composite: 0.87, jwsFail: 0.001, budgetNoise: 0.05, graphqlP95: 350, aaLag: 120 } });
  ```

## Wiring to UI
- Point UI `API_BASE` to the server gateway that routes to this GraphQL endpoint.
- UI buttons correspond directly to persisted operations in `graphql/persisted/*`.

## Notes
- Replace stubbed return values with service calls (evidence packer, exporter, remediator, etc.).
- Fail-closed OPA: if OPA is unreachable, mutations are denied by design.