# Admin Console Wireframe

## Global Layout

```
+-----------------------------------------------------------------------------------------------+
|  [LOGO] CompanyOS Admin      [Search Tenants/Users/Policies...]    [User: jules@company.os] v |
+-----------------------------------------------------------------------------------------------+
|  NAVBAR      |  CONTEXT: Global / Tenant: Acme Corp (ID: t-123)   [STATUS: JIT ACTIVE (25m)]  |
|              |                                                                                |
|  Dashboard   |  +--------------------------------------------------------------------------+  |
|  Tenants     |  |  DASHBOARD OVERVIEW                                                      |  |
|  Users       |  |                                                                          |  |
|  Policy      |  |  [ Health: HEALTHY ]  [ Active Incidents: 0 ]  [ Pending Approvals: 2 ]  |  |
|  Incidents   |  |                                                                          |  |
|  Deployments |  |  +-------------------+  +-------------------+  +----------------------+  |  |
|  Billing     |  |  | Total Tenants     |  | Active Users      |  | System Load (Global) |  |  |
|              |  |  | 1,245             |  | 45,201            |  | 24%                  |  |  |
|  Settings    |  |  +-------------------+  +-------------------+  +----------------------+  |  |
|  Audit       |  |                                                                          |  |
|              |  +--------------------------------------------------------------------------+  |
+--------------+--------------------------------------------------------------------------------+
```

## Module: Tenant Detail View

```
+-----------------------------------------------------------------------------------------------+
|  < Back to Tenants    |  Tenant: Acme Corp (t-123)                    [ ACTIONS v ]           |
+-----------------------------------------------------------------------------------------------+
|  Overview    |  +--------------------------------------------------------------------------+  |
|  Config      |  |  Tenant Configuration (Effective)                                        |  |
|  Quotas      |  |                                                                          |  |
|  Users       |  |  MODEL_PROVIDER:       [ openai            v ] (Global Default)          |  |
|  Features    |  |  RATE_LIMIT_MAX:       [ 1000              ] (Override)                  |  |
|  Audit Log   |  |  REQUIRE_BUDGET:       [ TRUE              ] (Policy Enforced)           |  |
|              |  |                                                                          |  |
|              |  |  [ Save Changes ]  [ Reset to Defaults ]                                 |  |
|              |  +--------------------------------------------------------------------------+  |
|              |                                                                                |
|              |  +--------------------------------------------------------------------------+  |
|              |  |  DANGEROUS ZONE                                                          |  |
|              |  |  +--------------------------------------------------------------------+  |  |
|              |  |  | Suspend Tenant                                                     |  |  |
|              |  |  | Prevents all user access. Reversible.                              |  |  |
|              |  |  | [ SUSPEND ]                                                        |  |  |
|              |  |  +--------------------------------------------------------------------+  |  |
|              |  |  | Delete Tenant                                                      |  |  |
|              |  |  | Permanently removes data. Requires 2-Admin Approval.               |  |  |
|              |  |  | [ DELETE ]                                                         |  |  |
|              |  |  +--------------------------------------------------------------------+  |  |
|              |  +--------------------------------------------------------------------------+  |
+--------------+--------------------------------------------------------------------------------+
```

## Flow: Dangerous Action (e.g., Delete Tenant)

**Step 1: Initiation**
> User clicks [ DELETE ] in Dangerous Zone.

**Step 2: Friction Modal**
```
+---------------------------------------------------------------+
|  ⚠️ DANGER: Delete Tenant 'Acme Corp'?                        |
+---------------------------------------------------------------+
|  This action is IRREVERSIBLE.                                 |
|  All data, users, and configurations will be wiped.           |
|                                                               |
|  Please type the tenant ID to confirm:                        |
|  [ t-123___________________________ ]                         |
|                                                               |
|  Reason for deletion:                                         |
|  [ Contract Termination____________ ] v                       |
|                                                               |
|  [ Cancel ]                                     [ Next > ]    |
+---------------------------------------------------------------+
```

**Step 3: Approval / MFA**
```
+---------------------------------------------------------------+
|  🔒 Security Verification                                     |
+---------------------------------------------------------------+
|  This action requires Multi-Factor Authentication.            |
|                                                               |
|  Enter code from your authenticator app:                      |
|  [ _ _ _ _ _ _ ]                                              |
|                                                               |
|  (For Production Tenants, a Slack request will be sent        |
|   to #security-ops for secondary approval)                    |
|                                                               |
|  [ Verify & Execute ]                                         |
+---------------------------------------------------------------+
```

## Module: Incident Management & Deployments

```
+-----------------------------------------------------------------------------------------------+
|  Incidents / Active                                           [ + Create Incident ]           |
+-----------------------------------------------------------------------------------------------+
|  Status      |  Severity  |  Title                          |  Affected Services |  Time      |
|  [ACTIVE]    |  [CRITICAL]|  API Latency Spike in EU-West   |  API, Database     |  14m ago   |
|  [MITIGATED] |  [HIGH]    |  Failed Deploy v1.2.4           |  Worker Nodes      |  2h ago    |
+-----------------------------------------------------------------------------------------------+
```

## Module: Intelligence & Search (Cross-Linking)

*   **Global Search Bar**: Supports queries like `user:email@domain.com`, `tenant:t-123`, `trace:request-id`.
*   **Contextual Links**:
    *   From a User Profile -> Link to "View in Graph" (Intelligence Fabric).
    *   From an Alert -> Link to "View Traces" (Observability).
    *   From a Policy Violation -> Link to "OPA Playground" with the failing input.
