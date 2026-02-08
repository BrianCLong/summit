# companyOS Boundary Standards & Contracts

## Interop Matrix

| Exported Object | Type | Description |
|-----------------|------|-------------|
| `Org` | JSON | Authoritative organizational context. |
| `Role` | JSON | Role definition and assigned permissions. |
| `Entitlement` | JSON | Feature/capability flag assigned to an Org/Role. |
| `Budget` | JSON | Spend limits (tokens, tool calls, USD). |
| `Policy` | JSON | Policy-as-code (e.g., Rego or JSON schema). |
| `PolicyDecision`| JSON | Allow/Deny result with reasons and audit ID. |
| `AuditEvent` | JSON | Immutable record of a decision. |

## Typed Contracts (Draft)

### PolicyDecision
```typescript
interface PolicyDecision {
  decision: 'allow' | 'deny';
  reasons: string[];
  policyVersion: string;
  auditEventId: string;
  tenantId: string;
}
```

### AuditEvent
```typescript
interface AuditEvent {
  id: string;
  timestamp: string; // ISO8601
  actorId: string;
  tenantId: string;
  action: string;
  resource: string;
  decision: 'allow' | 'deny';
  policyVersion: string;
  hash: string; // Deterministic hash of the event
}
```

## Non-Goals
- Full SCIM provisioning implementation (v1 uses stubs).
- Full IAM provider integration (identity stays behind interface).
- Real-time budget synchronization (eventual consistency allowed < 1s).
