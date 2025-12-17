# Partner Feature Safety Checklist

Use this checklist when designing or implementing features exposed to Partners to ensure tenant isolation and safety.

## 1. Isolation & Data Safety

- [ ] **Scope Enforcement**: Does every database query include a `MATCH (p:Partner)-[:MANAGES]->(t:Tenant)` (or equivalent check) to ensure the Partner actually owns the target Tenant?
- [ ] **Context Leakage**: When switching context, are all caches (Redis, LocalStorage) keyed by the *Target Tenant ID*, not just the User ID?
- [ ] **PII Masking**: Is PII in the Customer Tenant masked for Partner Support users unless explicitly unmasked with an audit reason?
- [ ] **Secret Protection**: Are Customer secrets (API Keys, private certs) hidden from Partners? (Partners should only be able to overwrite/reset, not read).

## 2. Authentication & Authorization

- [ ] **Role Mapping**: Are Partner roles (`partner-admin`) correctly mapped to restricted permissions in the Child Tenant? (e.g., A Partner should generally *not* be able to delete the Customer's root admin account).
- [ ] **Break-Glass**: Is there a mechanism for the Customer to revoke Partner access instantly?
- [ ] **Least Privilege**: Does the default `:MANAGES` relationship grant the minimum necessary permissions?

## 3. Operational Safety

- [ ] **Noisy Neighbor**: Are bulk operations (e.g., "Update All Tenants") rate-limited to prevent degrading performance for the Tenants?
- [ ] **Audit Trail**: Is the `actor_tenant_id` (Partner) distinct from the `target_tenant_id` (Customer) in all audit logs?
- [ ] **Error Handling**: Do error messages leaked to the Partner avoid revealing sensitive internal state of the Customer Tenant?

## 4. Billing & Resources

- [ ] **Attribution**: Are resource costs correctly attributed to the Customer Tenant, even if provisioned by the Partner?
- [ ] **Quota Inheritance**: Does the system correctly enforce both Tenant-level and Partner-level quotas?

## 5. UI/UX

- [ ] **Context Indicator**: Is there a clear, persistent UI element showing "Viewing as [Customer Name]" to prevent accidental changes to the wrong tenant?
- [ ] **Action Confirmation**: Do destructive actions require re-confirmation with the specific Tenant Name typed out?
