# Tenant Provisioning Flow

This flow provisions a tenant namespace, partitions, and quotas while enforcing OPA policy and
recording provenance receipts. It aligns with the Summit Readiness Assertion and the governance
requirements for policy-as-code.

## API Endpoints

### Admin Provisioning (OPA-enforced)

`POST /api/admin/tenants`

**Request**

```json
{
  "name": "Acme Intel",
  "slug": "acme-intel",
  "residency": "US",
  "region": "us-east-1",
  "plan": "ENTERPRISE",
  "environment": "prod",
  "requestedSeats": 250,
  "storageEstimateBytes": 500000000000
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "tenant": { "id": "tenant-123", "name": "Acme Intel", "slug": "acme-intel" },
    "namespace": { "id": "ns_tenant-123", "slug": "acme-intel-prod", "environment": "prod" },
    "partitions": [{ "id": "part_tenant-123_primary", "name": "primary", "type": "primary" }],
    "quota": { "tier": "ENTERPRISE", "requestsPerDay": 10000000 }
  },
  "receipts": {
    "provisioning": { "id": "prov_...", "actionType": "TENANT_PROVISIONED" },
    "quotaAssignment": { "id": "prov_...", "actionType": "TENANT_QUOTA_ASSIGNED" }
  },
  "policy": {
    "opa": { "allow": true }
  }
}
```

### Self-Serve Provisioning

`POST /api/tenants/provision`

The self-serve flow performs the same provisioning steps but relies on the authenticated user
and tenant isolation guardrails.

## Execution Sequence

1. **OPA decision** (`tenants/provision`) evaluates the admin request.
2. **Tenant creation** persists the tenant record.
3. **Namespace creation** establishes the tenant namespace identifier.
4. **Partition creation** creates primary, analytics, and audit partitions.
5. **Quota assignment** aligns quotas with the requested plan tier.
6. **Provenance receipts** record provisioning and quota assignment events.
7. **Isolation guard** validates the tenant isolation defaults.

## Provenance Receipts

Provisioning emits:

- `TENANT_PROVISIONED` with namespace + partition metadata.
- `TENANT_QUOTA_ASSIGNED` with quota tier metadata.

Receipts are emitted via `server/src/provenance/tenant-provisioning.ts`.
