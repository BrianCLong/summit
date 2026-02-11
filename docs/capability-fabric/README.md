# Capability Fabric

The Capability Fabric makes agent tool use capability-centric, policy-gated, and auditable. The
registry is the authoritative source for which APIs and tools agents may access and the controls
required before execution.

## How to register a capability

1. Copy the template and fill required fields.

   ```bash
   cp capability-fabric/templates/capability.template.yaml capability-fabric/registry/<capability>.yaml
   ```

2. Add JSON Schema references for inputs/outputs under `capability-fabric/schemas/`.
3. Link policy refs under `policies/capability-fabric/` and ensure least-privilege.
4. Run validation and compile artifacts:

   ```bash
   pnpm --filter summitctl dev -- cap validate
   pnpm --filter summitctl dev -- cap scan
   ```

## How policy gating works

- **Deny by default**: unregistered capabilities are blocked in enforcement mode.
- **Identity checks**: `allowed_identities` and required scopes must match the session.
- **Approval checks**: `risk_controls.approvals_required` enforces `x-approval-token`.
- **Schema checks**: inputs are validated against referenced JSON Schemas.
- **Rate limits**: per-capability limits throttle blast radius.
- **HTTP entrypoints**: requests supply `x-actor-scopes` and `x-tenant-id` headers so
  policy-as-code evaluates the caller context.

## How to interpret risk/blast reports

- `capability-risk-report.md` lists per-capability risk scores and missing metadata.
- `capability-graph.json` captures nodes/edges for dependency analysis.
- `capability-diff.json` shows new capabilities, auth scope changes, and new edges.

## CLI quickstart

```bash
pnpm --filter summitctl dev -- cap scan
pnpm --filter summitctl dev -- cap report --strict
```
