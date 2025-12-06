# Governance & Guardrails Integration

This document defines how the Governance Layer is wired into the Agent Mesh and Maestro.

## 1. Agent-Level Guardrails

Every agent's system prompt includes strict constraints. These are enforced via:
1.  **Prompt Instructions**: Explicit "Do Not" directives.
2.  **API Gateways**: Middleware that checks permissions and scopes.
3.  **Code Reviews**: Mandatory `GOV-STEWARD` review for changes to critical agents.

| Agent | Prohibited Domains | Consultation Triggers |
| :--- | :--- | :--- |
| **MC-ARCH** | Unauthenticated execution, Resource exhaustion | Arch changes, New orchestrator capabilities |
| **IG-ARCH** | Cross-tenant data leakage, PII exposure | Schema changes, New data sources |
| **AUR-TEAM** | Offensive/Authoritarian tech, Unethical IP | Patent filings, Strategic pivots |
| **SEC-DEF** | Offensive Cyber ("Hack Back"), Privacy violations | Response playbooks, Surveillance capabilities |
| **SSIGHT** | Misleading metrics, Data access violations | New KPI definitions, Executive reports |
| **MaaS-OPS** | Unvetted tenants, Ignoring SLAs | High-risk tenant onboarding, Contract deviations |

## 2. Maestro Governance Hooks

Maestro Conductor must call the **Governance Policy Engine (OPA)** at these key checkpoints:

### Hook: `check_tenant_onboarding`
*   **Trigger**: Start of `FLOW_TENANT_ONBOARDING`.
*   **Action**: Query OPA with Tenant Industry/Region.
*   **Policy**: `policy/tenancy/onboarding.rego`
*   **Effect**: Blocks onboarding of restricted entities (e.g., sanctioned regimes, hate groups).

### Hook: `check_feature_risk`
*   **Trigger**: `Deployment` step in `FLOW_FEATURE_LIFECYCLE`.
*   **Action**: Analyze feature metadata (risk score, scope).
*   **Policy**: `policy/release/risk_gates.rego`
*   **Effect**: Requires additional approvals for "High Risk" features (e.g., changes to crypto, auth, or surveillance).

### Hook: `check_response_proportionality`
*   **Trigger**: Automated `Remediation` in `FLOW_INCIDENT_RESPONSE`.
*   **Action**: Assess impact of remediation (e.g., shutting down a tenant).
*   **Policy**: `policy/security/response.rego`
*   **Effect**: Prevents automated actions that cause disproportionate harm; forces manual escalation.

## 3. Governance Drift Monitoring

**Metric**: `GovernanceDriftMetric` (GDM)

### Components
1.  **Policy Violations**: Count of OPA Deny decisions over time.
2.  **Manual Overrides**: Count of "Emergency Override" actions used by admins.
3.  **SLA Breaches**: Rate of missed commitments to tenants.
4.  **Sentiment Dip**: Drop in internal/external sentiment (from Nudge/Summitsight).

### Calculation
`GDM = (w1 * Violations) + (w2 * Overrides) + (w3 * SLA_Breaches) + (w4 * Sentiment_Dip)`

### Thresholds
*   **Green**: GDM < 10. Normal operation.
*   **Yellow**: 10 < GDM < 50. Warning. `GOV-STEWARD` notified. Agent autonomy reduced.
*   **Red**: GDM > 50. Critical Drift. Feature freezes triggered. Board notified.

### Enforcement
Agents must query the current GDM before starting high-impact tasks. If `GDM == Red`, only "Recovery" tasks are allowed.
