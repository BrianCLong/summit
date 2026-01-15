# Tenant Provisioning Admin Workflow

## Objective

Deliver a governed tenant provisioning flow that creates namespaces, partitions, and quotas, exposes an OPA-enforced admin endpoint, emits provenance receipts, and documents the flow plus identity integration contracts.

## Required Outcomes

- Implement `server/src/services/tenants/` provisioning service for namespace, partitions, and quota assignment.
- Expose `POST /api/admin/tenants` with OPA policy enforcement.
- Emit provenance receipts for tenant provisioning and quota assignment.
- Add OIDC and SCIM contract stubs in `server/src/services/identity/` with documented request/response examples.
- Document provisioning flow and identity contracts in `docs/`.

## Constraints

- Use policy-as-code (OPA) for authorization decisions.
- Record provenance receipts for each provisioning action.
- Keep changes scoped to server and docs while maintaining boundary checks.
