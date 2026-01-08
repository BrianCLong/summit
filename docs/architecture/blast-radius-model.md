# Blast-Radius & Containment Model

## 1. Philosophy: "The Ship Survives the Hull Breach"

In Summit, we assume components _will_ fail and actors _will_ be compromised. Our architecture ensures these events are **local tragedies, not systemic catastrophes**.

We measure success by the **Blast Radius**: the maximum scope of damage a single failure mode can cause.

---

## 2. Failure Scenarios & Containment

### Scenario A: The Rogue Agent (AI Misalignment)

- **Trigger:** An agent (e.g., Codex) gets stuck in a loop, hallucinates destructive commands, or is prompt-injected.
- **Max Allowed Impact:**
  - Loss of the specific _Task_ or _Run_.
  - Financial loss capped at the **Team** budget limit.
  - NO corruption of long-term memory (Graph) without human approval.
- **Containment Mechanisms:**
  1.  **Hard Budget Limits:** `QuotaManager` enforces strict token/dollar caps per Run.
  2.  **Tool Whitelisting:** Agents only access tools explicitly granted in their manifest.
  3.  **Human-in-the-Loop (HITL):** High-impact actions (e.g., `delete_database`, `publish_report`) require `WAIT_FOR_APPROVAL` signal.
  4.  **Semantic Validation:** Output parsers (Zod) reject hallucinated arguments before execution.

### Scenario B: The Hostile Tenant (Insider Threat)

- **Trigger:** A valid tenant attempts to access other tenants' data or DDOS the platform via complex Graph queries.
- **Max Allowed Impact:**
  - Performance degradation for _that tenant only_ (Self-inflicted DOS).
  - Zero data leakage to/from other tenants.
- **Containment Mechanisms:**
  1.  **Row-Level Security (RLS):** Postgres strictly enforces `tenant_id` at the database engine level.
  2.  **Graph Query Guardrails:** Neo4j queries run with `CALL { ... } IN TRANSACTIONS` and strict timeout limits (e.g., 5s).
  3.  **Rate Limiting:** Tiered API rate limits (IP + Token) isolate noisy neighbors.
  4.  **Resource Quotas:** `QuotaManager` blocks requests after tier limits are reached.

### Scenario C: Credential Compromise (Leaked API Key)

- **Trigger:** A Service Account or User API key is leaked publicly.
- **Max Allowed Impact:**
  - Attacker can access data _only_ within the scope of that key (specific tenant/role).
  - No access to underlying infrastructure or other tenants.
- **Containment Mechanisms:**
  1.  **Scope Minimization:** Keys are scoped to specific resources (Least Privilege).
  2.  **Short-Lived Tokens:** JWTs expire in 1 hour; Refresh tokens are strictly cookie-bound (HttpOnly).
  3.  **Automated Revocation:** `AuthService.revokeAllTokens(userId)` endpoint available for immediate kill-switch.
  4.  **Secret Scanning:** Github Actions and Pre-commit hooks block key commits.

### Scenario D: CI/CD Supply Chain Attack

- **Trigger:** A compromised developer account pushes malicious code or dependency to the repo.
- **Max Allowed Impact:**
  - Bad code reaches the `dev` branch but is blocked from `main` or Production.
  - No production secrets are accessible from the build environment.
- **Containment Mechanisms:**
  1.  **Branch Protection:** `main` requires 2 reviews + Code Owner approval.
  2.  **Ephemeral Build Envs:** Github Actions runners are ephemeral and have no access to Prod VPC.
  3.  **Signed Commits:** All commits must be GPG signed.
  4.  **Deployment Gates:** "Guarded Code Gate" script runs smoke tests before any traffic shift.

---

## 3. Escalation Thresholds

When does a localized failure become an Incident?

| Severity             | Condition                                                                         | Response                                                            |
| :------------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| **SEV-3 (Low)**      | Single agent failure, Single user rate-limited.                                   | Auto-recovery / User notification.                                  |
| **SEV-2 (Medium)**   | Tenant-wide performance degradation, Budget exhaustion.                           | Alert to Tenant Admin + Platform Support.                           |
| **SEV-1 (High)**     | Cross-tenant leakage attempt detected (RLS Policy Violation), API Gateway outage. | **PAGER DUTY**. Auto-scale or Circuit Break affected region.        |
| **SEV-0 (Critical)** | Root key compromise, Data corruption detected in Ledger.                          | **FULL LOCKDOWN**. Read-only mode enabled. Global token revocation. |

---

## 4. Visualizing the Blast Walls

```ascii
[ GLOBAL INTERNET ]
       |
       v
[ WAF / DDoS PROTECTION ] <--- Wall 1: Network
       |
       v
[ API GATEWAY (AuthZ) ] <--- Wall 2: Identity (Valid Token?)
       |
       v
+-------------------------------------------------------+
| TENANT CONTAINER (Logical)                            |
|                                                       |
|  [ QUOTA MANAGER ] <--- Wall 3: Resources             |
|        |                                              |
|        v                                              |
|  [ AGENT RUNTIME ] <--- Wall 4: Semantic (Tool Valid?)|
|        |                                              |
|        v                                              |
|  [ DATA LAYER (RLS/Graph) ] <--- Wall 5: Data Access  |
|                                                       |
+-------------------------------------------------------+
```
