# Runtime Governance Enforcement

This document details the runtime governance enforcement mechanisms in the Summit platform, including tenant isolation, kill switches, and governance verdicts.

## GovernanceVerdict

Every request processed by the platform produces a `GovernanceVerdict`. This verdict determines whether the request was allowed, denied, or degraded, and provides reasons for the decision.

### Structure

```typescript
type GovernanceVerdict = {
  status: "allow" | "deny" | "degrade";
  reasons: Array<{code: string; message: string; control?: string;}>;
  tenant_id: string;
  policy_version: string;
  timestamp: string;
  evidence: {
    request_id: string;
    actor?: string;
    route?: string;
    inputs_hash?: string;
  };
};
```

Verdicts are returned in the response body (wrapped in envelopes where applicable) and also via HTTP Headers:
- `X-Governance-Status`
- `X-Governance-Policy-Version`

## Kill Switch

The platform includes a centralized kill switch mechanism to quickly mitigate risks.

### Modes

- **OFF**: Normal operation.
- **DENY_ALL**: All requests are rejected with a 503 status and a DENY verdict.
- **READ_ONLY**: Write operations (POST, PUT, DELETE, PATCH) are rejected. Read operations are allowed but marked with a DEGRADE verdict.
- **ROUTE_DENY**: Specific routes matching configured patterns are denied.

### Configuration

The kill switch can be configured via:
1. Environment Variables: `KILL_SWITCH_MODE`
2. Runtime Configuration (Global or Per-Tenant)

### Break Glass

Emergency access ("Break Glass") overrides the kill switch. It requires:
1. `BREAK_GLASS=1` environment variable set on the server.
2. Request must be from an admin.
3. Request must include `X-Break-Glass: true` header.

## Tenant Isolation

Tenant isolation is enforced at the middleware level.

- **Requirement**: Every request must have a valid `tenant_id` associated with the authenticated user or passed via `X-Tenant-ID` header (must match auth).
- **Enforcement**: Missing or mismatched tenant IDs result in an immediate DENY verdict (403).
- **Data Access**: Application logic must propagate `tenant_id` to all data access calls.

## Artifacts

Runtime evidence is generated to `artifacts/governance/runtime/<sha>/`:
- `boot.json`: Snapshot of boot configuration and policy version.
- `report.md`: Human-readable status report.
- `stamp.json`: Cryptographic stamp of the evidence generation.
