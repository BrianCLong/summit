# Global Control Plane Capabilities Matrix

## Mission
To empower operators, support, and compliance teams to manage CompanyOS with precision and safety, adhering to the principle of **"Power without Abuse"**.

## Personas & Roles

| Persona | Primary Role (OPA) | Scope | Description |
| :--- | :--- | :--- | :--- |
| **SRE (Platform Admin)** | `PLATFORM_ADMIN` | Global | Full system access. Manages infrastructure, global configuration, feature flags, and deployments. Can assume any role. |
| **Support Engineer** | `MODERATOR` / `ADMIN` (JIT) | Tenant (JIT) | Debugs customer issues. Access is usually read-only or limited to specific tenant contexts via JIT impersonation. |
| **Security Engineer** | `PLATFORM_ADMIN` (Scoped) | Global | Focuses on audit logs, threat response, and policy violations. High privilege for investigation but audited actions. |
| **Compliance Officer** | `ANALYST` | Global (Read-only) | View-only access to audit logs, compliance reports, and governance data. Cannot mutate system state. |
| **Partner Admin** | `ADMIN` | Tenant (Multi) | Manages specific tenant sets (e.g., White Label partners). Full admin rights within their assigned tenant scope. |

## Capabilities Matrix

| Capability | SRE | Support | Security | Compliance | Partner Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Global Config** | ✅ (Write) | ❌ | ✅ (Read) | ❌ | ❌ |
| **Tenant Config** | ✅ | ✅ (JIT) | ✅ (Read) | ❌ | ✅ (Owned Tenants) |
| **User Mgmt** | ✅ | ✅ (Reset/Unblock) | ✅ (Lock) | ❌ | ✅ (Owned Tenants) |
| **Impersonation** | ✅ (MFA) | ✅ (JIT + Approval) | ✅ (Audit) | ❌ | ❌ |
| **Audit Logs** | ✅ | ❌ | ✅ (Full) | ✅ (Full) | ✅ (Owned Tenants) |
| **Policy/OPA** | ✅ | ❌ | ✅ | ✅ (Read) | ❌ |
| **Deployments** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Billing/Quota** | ✅ | ❌ | ❌ | ✅ (Read) | ✅ (Read) |
| **Data Export** | ✅ | ❌ | ✅ | ✅ | ✅ (Owned Tenants) |

## Just-in-Time (JIT) Access Patterns

To minimize standing privileges, high-risk actions (especially for Support and SRE) utilize JIT access flows.

### 1. Impersonation Flow
*   **Trigger**: Admin requests "Impersonate User" for a specific tenant/user.
*   **Requirement**:
    *   **Reason**: Must provide a ticket ID or business justification.
    *   **Consent**: (Optional but recommended) Customer approval via support ticket.
    *   **MFA**: Session must be MFA verified.
*   **Duration**: Time-bound (e.g., 1 hour).
*   **Audit**: High-fidelity logging of all actions taken while impersonating.

### 2. Elevated Action ("Break Glass")
*   **Trigger**: Accessing `PLATFORM_ADMIN` capabilities for critical incidents.
*   **Requirement**:
    *   **Four-Eyes**: Approval from another qualified admin (via Slack/PagerDuty integration) for critical mutations (e.g., mass delete).
    *   **MFA**: Re-authentication required immediately before the action.
*   **Audit**: Flagged as `CRITICAL` in audit logs.

## Security & Guardrails

*   **MFA Enforcement**: Required for all Admin Console access. Double-prompt for sensitive operations.
*   **Scope Isolation**: Partner Admins are cryptographically bound to their Tenant IDs.
*   **Rate Limiting**: Strict limits on administrative bulk operations to prevent accidental denial of service.
*   **Immutable Audit**: All admin actions are written to `ProvenanceLedger` and are tamper-evident.
