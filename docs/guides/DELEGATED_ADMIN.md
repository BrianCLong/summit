# Delegated Administration Guide

This guide outlines the flows for Partners to manage Customer Tenants using the Delegated Admin capabilities.

## 1. Partner Onboarding & Customer Provisioning

### Flow: Partner Onboards a New Customer
1.  **Partner Login**: Partner Admin logs into the Partner Portal (scoped to their Partner Tenant).
2.  **Create Tenant**:
    *   Action: `POST /api/partners/tenants`
    *   Payload: `{ name: "Acme Corp", plan: "Gold", admin_email: "admin@acme.com" }`
3.  **System Action**:
    *   Creates new `Tenant` node (Acme Corp).
    *   Creates `:MANAGES` edge from Partner to Acme Corp.
    *   Provisions initial `User` (Acme Admin) linked to Acme Corp.
    *   Sets up default Quotas and Policies inherited from Partner.
4.  **Result**: The new tenant appears in the Partner's "Managed Tenants" list.

### Flow: Partner Accesses Customer Tenant
1.  **Select Tenant**: Partner Admin selects "Acme Corp" from the dashboard.
2.  **Context Switch**:
    *   Frontend requests a temporary access token for `tenant_id=acme-corp-id`.
    *   **Auth Service Verification**:
        *   Checks `(:Partner {id: current_user.tenant})-[:MANAGES]->(:Tenant {id: target_tenant})`.
        *   Verifies User has `partner-admin` or `partner-support` role.
    *   **Token Issue**: Returns a short-lived JWT with `tenant: acme-corp-id` and `audit_actor_tenant: partner-id`.
3.  **Perform Actions**: Partner Admin configures settings, views dashboards, or debugs issues as if they were a local admin of Acme Corp.
    *   *Note: All actions are auditable as "Acting as Partner".*

## 2. Cross-Tenant Monitoring & Bulk Operations

### Aggregated Dashboard
*   **View**: "Fleet Health"
*   **Query**: `MATCH (p:Partner {id: $id})-[:MANAGES]->(t:Tenant) RETURN t.status, t.alert_count`
*   **Use Case**: Spotting outages or security incidents across the entire customer base.

### Bulk Configuration
*   **Action**: Apply a new Security Policy to all "Gold Tier" customers.
*   **Flow**:
    1.  Partner selects Policy "Strict-MFA-2025".
    2.  Selects target group (e.g., Tag: "Gold").
    3.  System iterates through matching Tenants and creates `(:Tenant)-[:HAS_POLICY]->(:Policy)` relationships.
    4.  Audits the bulk change.

## 3. Customer Control & Transparency

### Limiting Partner Access
*   **Scenario**: A sensitive investigation requires locking out external access.
*   **Action**: Customer Admin toggles "Partner Access" to `Restricted` or `Off`.
*   **Effect**:
    *   Updates properties on the `:MANAGES` edge (e.g., `status: 'suspended'`).
    *   Immediate revocation of delegated sessions.

### Audit Log Visibility
*   Customer Admins see a distinct "Partner Activity" log.
*   Shows *who* from the Partner organization accessed *what*, and *when*.

## 4. API & Integration

Partners can use the Management API to automate provisioning.

```typescript
// Example: Switch Context in SDK
const client = new CompanyOSClient({ apiKey: PARTNER_KEY });
const acmeSession = client.forTenant('acme-corp-id');

await acmeSession.users.list(); // Lists Acme's users
```
