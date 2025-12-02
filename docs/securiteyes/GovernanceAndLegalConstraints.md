# Securiteyes Governance

## Legal & Ethical Constraints

*   **No Offensive Operations**: The system never "hacks back".
*   **Privacy First**: PII is minimized. Risk profiles are strictly access-controlled.
*   **Auditability**: All actions are logged.

## Multi-Tenancy

*   All data queries must include `tenantId`.
*   Cross-tenant correlation is allowed only for system-level threat intel (e.g., global blocklist) but specific tenant data must not leak.

## Access Control

*   `view_threat_data`: Role required to see dashboards.
*   `manage_incidents`: Role required to update incidents.
*   `view_risk_profiles`: Restricted role for HR/Security Leads.
