# Switchboard Identity & Authorization (v0.1)

## Identity Model

### Principals
Switchboard recognizes two types of principals:
1.  **Human Users:** Authenticated via OIDC (e.g., Google, Okta). ID format: `user:{email}` or `user:{sub}`.
2.  **Service Accounts:** Automated agents (e.g., Maestro Conductor). Authenticated via mTLS or signed JWTs. ID format: `service:{name}`.

### Delegated Identities (Agents)
Agents often act on behalf of a human.
*   **On-Behalf-Of (OBO):** The agent presents a token asserting `sub: agent-id` and `act_as: user-id`.
*   **Scopes:** The agent's permissions are the *intersection* of the agent's scopes and the user's scopes.

## Tenant Boundary Enforcement

*   **Derivation:** Tenant ID is derived from the verified JWT `iss` (issuer) or a custom claim `org_id`.
*   **Propagation:** All internal calls must propagate `X-Tenant-ID`.
*   **Enforcement:**
    *   **Registry Lookups:** Always scoped by `WHERE tenant_id = ?`.
    *   **Policy Evaluation:** Loads only policies belonging to the tenant.
    *   **Isolation:** A server registered in Tenant A is invisible to Tenant B.

## Authorization Levels

| Role | Description | Capabilities |
| :--- | :--- | :--- |
| **Admin** | Tenant Administrator | Register servers, edit policies, view all logs, manage users. |
| **Operator** | Switchboard Operator | View health, restart servers, view operational metrics (no data access). |
| **Agent** | Automated System | Execute allowed tools, view own history. |
| **User** | Human User | Execute allowed tools (via UI), view own history. |

## AuthZ vs. Policy

Switchboard uses a two-layer authorization model:

1.  **Hard AuthZ (RBAC):** Checks *who* you are and *broadly* what you can do.
    *   Example: "Can `service:maestro` call `mcp:github`?"
    *   Implemented via JWT scopes and coarse-grained ACLs.
    *   **Fast, cheap, cached.**

2.  **Policy Engine (ABAC / PBAC):** Checks *context* and *content*.
    *   Example: "Can `service:maestro` push to `repo:production` with this specific commit message at 2 AM?"
    *   Implemented via OPA (Rego).
    *   **Slower, detailed, context-aware.**

## JWT Claims & Headers

**Headers:**
*   `Authorization`: `Bearer <jwt>`
*   `X-Tenant-ID`: `<uuid>` (Validated against JWT)

**Recommended JWT Claims:**
*   `iss`: Issuer (Identity Provider)
*   `sub`: Subject (Principal ID)
*   `aud`: Audience (must include `switchboard`)
*   `exp`: Expiration
*   `iat`: Issued At
*   `scope`: Space-separated scopes (e.g., `mcp:execute switchboard:read`)
*   `org_id`: Tenant ID (optional, if not mapped from `iss`)
*   `act_as`: Delegated user ID (for agents)
