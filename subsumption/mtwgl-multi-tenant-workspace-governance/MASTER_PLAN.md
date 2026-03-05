# Master Plan: Multi-Tenant Workspace & Tenant Governance Layer (MTWGL)

## 1. Goal
Turn Summit into a multi-tenant, workspace-aware platform with enterprise-grade isolation, billing, and governance. Enable ACP, AEGS, TMAML, and ASF to safely serve many customers.
Optimize for "few big enterprises" (deep compliance, slower complexity growth) as the primary target.

## 2. Requirements
### 2.1. Tenant & Workspace Model
- Hierarchy: Organization -> Tenant -> Workspace -> Project/Agent.
- RBAC and hard isolation at each layer (data, identity, configs, observability).

### 2.2. Policy, Governance, and Isolation
- Tenant-aware policy engine (residency, retention, tools, autonomy).
- Workspace-level guardrails.
- Strict isolation: no cross-tenant memory/logs/evals.
- Tenant-scoped encryption keys/secrets.

### 2.3. Billing, Quotas, Resource Governance
- Usage accounting: tokens, compute time, storage, evals, skills.
- Quotas/throttles: hard/soft limits per tier.
- Billing reports/dashboards.

### 2.4. Enterprise Controls & Integrations
- SSO/Identity: SAML/OIDC, SCIM.
- Compliance: Audit exports, DSR APIs, retention config, regional routing.
- Tenant-scoped API keys/OAuth, approval workflows.

### 2.5. Productization of Agents & Skills
- Internal marketplace for discovering/installing Summit agents/skills into workspaces.
- Support per-tenant overrides/forking.

### 2.6. Success Criteria
- 3 synthetic tenants with conflicting policies running with zero cross-tenant leakage.
- Billing reports accurate to within 1%.
- Full audit trail for cross-boundary ops.
- ACP, AEGS, TMAML, ASF fully tenant-aware.
