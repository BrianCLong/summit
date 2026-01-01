# Data Policy & Privacy (v2.0.0-rc.1)

## 1. Entity Catalog
- **Users:** PII (Name, Email, Phone). Retention: 30d (soft delete), 365d (audit).
- **Cases:** Sensitive. Retention: 7y (Legal Hold).
- **Graph Nodes:** Standard. Retention: 365d.
- **Audit Logs:** Immutable. Retention: 7y.

## 2. Retention Matrix
| Data Type | Retention | Policy ID |
|---|---|---|
| Telemetry | 30d | POL-TEL-01 |
| App Logs | 90d | POL-LOG-01 |
| Audit Trail | 7y | POL-AUD-01 |
| User Profile | Account Lifetime + 30d | POL-USR-01 |

## 3. Encryption
- **At Rest:** AES-256 (AWS KMS / Vault).
- **In Transit:** TLS 1.3 (Strict).

## 4. Access Control
- **RBAC:** Enforced via OPA.
- **ABAC:** Tenant isolation verified in `policy/opa/multi-tenant-abac.rego`.
