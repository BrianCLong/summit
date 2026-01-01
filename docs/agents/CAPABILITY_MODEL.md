# Agent Capability Model

## Overview

This document defines the **authoritative capability model** for all autonomous agents in the Summit platform. Every agent action must be explicitly permitted through capability registration, with enforcement at runtime.

**Design Principle**: Fail-closed by default. No agent executes an action without an explicit, declared capability.

---

## Capability Model Architecture

### 1. Agent Identity

Every agent must have a registered identity before execution:

```typescript
interface AgentIdentity {
  id: string;                    // UUID - immutable
  name: string;                  // Human-readable identifier
  version: string;               // Semantic version (e.g., "1.2.3")
  agent_type: AgentType;         // Classification
  status: AgentStatus;           // Lifecycle state
  is_certified: boolean;         // Certification flag
  certification_expires_at?: Date; // Cert expiration
  owner_id: string;              // Responsible user
  organization_id: string;       // Owning organization
}

enum AgentType {
  INTERNAL = 'internal',         // First-party agents
  EXTERNAL = 'external',         // Third-party agents
  PARTNER = 'partner'            // Partner-developed agents
}

enum AgentStatus {
  ACTIVE = 'active',             // Operational
  SUSPENDED = 'suspended',       // Temporarily disabled
  RETIRED = 'retired',           // Permanently disabled
  REVOKED = 'revoked'            // Security revocation
}
```

### 2. Capability Declaration

Capabilities define **what an agent is allowed to do**:

```typescript
interface AgentCapability {
  name: string;                  // e.g., "database:read", "api:github:write"
  scope: CapabilityScope;        // Access boundaries
  risk_level: RiskLevel;         // Impact classification
  requires_approval: boolean;    // Manual approval required
  approval_class: ApprovalClass; // Approval workflow
}

interface CapabilityScope {
  // Data Access Boundaries
  tenant_scopes: string[];       // Allowed tenant IDs
  project_scopes: string[];      // Allowed project IDs
  data_classifications: DataClassification[]; // Max data sensitivity

  // Resource Access
  allowed_domains: string[];     // Network access whitelist
  allowed_apis: string[];        // API endpoint access
  allowed_tools: string[];       // Tool/function access

  // Operational Boundaries
  read_only: boolean;            // Write access permitted
  secrets_access: boolean;       // Secret manager access
  cross_tenant: boolean;         // Cross-tenant operations
}

enum RiskLevel {
  LOW = 'low',                   // No approval, standard limits
  MEDIUM = 'medium',             // May require approval
  HIGH = 'high',                 // Requires approval
  CRITICAL = 'critical'          // Requires approval + certification
}

enum ApprovalClass {
  AUTO = 'auto',                 // Automatic approval
  GATED = 'gated',               // Policy-based approval
  HITL = 'human_in_the_loop'     // Manual human approval required
}

enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret'
}
```

### 3. Execution Limits

Hard limits enforced at runtime, not by agent logic:

```typescript
interface ExecutionLimits {
  // Time Limits
  max_wall_clock_ms: number;     // Total execution time (default: 300000 = 5min)
  max_cpu_time_ms: number;       // CPU time limit

  // Step Limits
  max_steps: number;             // Max reasoning/action steps (default: 50)
  max_tool_calls: number;        // Max tool invocations (default: 100)

  // Token Budgets
  max_tokens_input: number;      // Max input tokens per run
  max_tokens_output: number;     // Max output tokens per run
  max_tokens_total: number;      // Total token budget

  // Resource Limits
  max_memory_mb: number;         // Memory limit
  max_concurrent_requests: number; // Parallel request limit

  // Rate Limits
  max_runs_per_minute: number;   // Per-minute rate limit
  max_runs_per_hour: number;     // Per-hour rate limit
  max_runs_per_day: number;      // Per-day rate limit
}
```

### 4. Budget Limits

Financial and resource quotas:

```typescript
interface BudgetLimits {
  // Financial Budgets
  max_cost_per_run_usd: number;  // Per-run cost cap
  max_cost_per_day_usd: number;  // Daily cost cap
  max_cost_per_month_usd: number; // Monthly cost cap

  // Resource Quotas
  quota_type: QuotaType;
  quota_limit: number;           // Total quota
  quota_used: number;            // Current usage
  quota_period_start: Date;      // Period start
  quota_period_end: Date;        // Period end

  // Behavior on Breach
  on_limit_breach: LimitBreachAction;
}

enum QuotaType {
  DAILY_RUNS = 'daily_runs',
  MONTHLY_RUNS = 'monthly_runs',
  TOKENS = 'tokens',
  API_CALLS = 'api_calls',
  COST_USD = 'cost_usd'
}

enum LimitBreachAction {
  DENY = 'deny',                 // Fail-closed
  THROTTLE = 'throttle',         // Rate limit
  ESCALATE = 'escalate',         // Human escalation
  ALERT = 'alert'                // Alert + allow
}
```

---

## Capability Registry Schema

The **authoritative source of truth** for agent capabilities.

### Registry Structure

```yaml
agents:
  - identity:
      id: "agent-123e4567-e89b-12d3-a456-426614174000"
      name: "code-review-agent"
      version: "2.1.0"
      agent_type: "internal"
      status: "active"
      is_certified: true
      certification_expires_at: "2026-12-31T23:59:59Z"
      owner_id: "user-abc123"
      organization_id: "org-xyz789"

    capabilities:
      - name: "repository:read"
        scope:
          tenant_scopes: ["tenant-123"]
          project_scopes: ["*"]
          data_classifications: ["internal", "confidential"]
          allowed_domains: ["github.com", "gitlab.com"]
          allowed_apis: ["github:repos/*", "github:pulls/*"]
          allowed_tools: ["git", "grep", "ast-parser"]
          read_only: true
          secrets_access: false
          cross_tenant: false
        risk_level: "low"
        requires_approval: false
        approval_class: "auto"

      - name: "repository:write"
        scope:
          tenant_scopes: ["tenant-123"]
          project_scopes: ["project-456"]
          data_classifications: ["internal"]
          allowed_domains: ["github.com"]
          allowed_apis: ["github:repos/*/commits", "github:pulls/*/merge"]
          allowed_tools: ["git"]
          read_only: false
          secrets_access: false
          cross_tenant: false
        risk_level: "high"
        requires_approval: true
        approval_class: "gated"

      - name: "secrets:read"
        scope:
          tenant_scopes: ["tenant-123"]
          project_scopes: ["project-456"]
          data_classifications: ["secret"]
          allowed_apis: ["vault:secrets/*"]
          secrets_access: true
          cross_tenant: false
        risk_level: "critical"
        requires_approval: true
        approval_class: "human_in_the_loop"

    limits:
      execution:
        max_wall_clock_ms: 300000     # 5 minutes
        max_steps: 50
        max_tool_calls: 100
        max_tokens_total: 100000
        max_memory_mb: 512
        max_concurrent_requests: 5
        max_runs_per_minute: 10
        max_runs_per_hour: 100
        max_runs_per_day: 1000

      budget:
        max_cost_per_run_usd: 1.00
        max_cost_per_day_usd: 100.00
        max_cost_per_month_usd: 2000.00
        quota_type: "daily_runs"
        quota_limit: 1000
        on_limit_breach: "deny"

    restrictions:
      # Additional constraints
      allowed_operation_modes: ["SIMULATION", "DRY_RUN", "ENFORCED"]
      requires_human_oversight: false
      max_trust_level: "elevated"
      compliance_tags: ["SOC2", "GDPR", "HIPAA"]
      geographic_restrictions: ["US", "EU"]
```

---

## Capability Enforcement

### Runtime Enforcement Pipeline

1. **Pre-Execution Validation**
   - Agent identity verification
   - Capability lookup in registry
   - Scope boundary checks
   - Limit validation

2. **Policy Evaluation (OPA)**
   - Agent status check (active, certified)
   - Capability permission check
   - Context-based authorization
   - Approval requirement determination

3. **Execution Monitoring**
   - Real-time limit enforcement (wall-clock, steps, tokens)
   - Resource usage tracking
   - Cost accumulation
   - Quota consumption

4. **Post-Execution Audit**
   - Action logging
   - Outcome recording
   - Metric aggregation
   - Policy violation detection

### Enforcement Points

```typescript
interface EnforcementContext {
  agent: AgentIdentity;
  capability_requested: string;
  action_details: {
    action_type: string;
    action_target: string;
    action_payload: unknown;
  };
  tenant_id: string;
  project_id?: string;
  user_context: {
    user_id: string;
    roles: string[];
    clearance_level?: string;
  };
}

interface EnforcementResult {
  allowed: boolean;
  decision: PolicyDecision;
  obligations: Obligation[];
  reason: string;
  policy_path: string;
}

enum PolicyDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  CONDITIONAL = 'conditional'  // Allow with obligations
}

interface Obligation {
  type: ObligationType;
  details: unknown;
}

enum ObligationType {
  REQUIRE_APPROVAL = 'require_approval',
  AUDIT_ENHANCED = 'audit_enhanced',
  RATE_LIMIT = 'rate_limit',
  NOTIFY_OWNER = 'notify_owner',
  RECORD_JUSTIFICATION = 'record_justification'
}
```

---

## Capability Categories

### Standard Capability Taxonomy

```
repository:
  - read              # Read repository contents
  - write             # Commit changes
  - delete            # Delete resources
  - admin             # Administrative operations

database:
  - read              # Read data
  - write             # Insert/update data
  - schema_modify     # DDL operations
  - admin             # Administrative operations

api:
  - {domain}:{operation}  # e.g., "api:github:read", "api:slack:write"

secrets:
  - read              # Read secrets
  - write             # Create/update secrets
  - rotate            # Rotate credentials

compute:
  - execute           # Execute code/scripts
  - provision         # Provision resources
  - modify            # Modify infrastructure

network:
  - external_access   # Outbound network access
  - internal_access   # Internal service access

data:
  - pii_access        # PII data access
  - export            # Data export
  - cross_tenant      # Cross-tenant operations
```

---

## Trust Levels

Agents are assigned trust levels based on certification and track record:

```typescript
enum TrustLevel {
  UNTRUSTED = 0,       // New/unverified agents - minimal capabilities
  BASIC = 1,           // Basic certification - standard capabilities
  ELEVATED = 2,        // Proven track record - expanded capabilities
  PRIVILEGED = 3,      // High assurance - sensitive operations
  SOVEREIGN = 4        // Maximum trust - critical operations
}
```

**Trust Level Mapping to Capabilities:**

| Trust Level | Max Risk Level | Secrets Access | Cross-Tenant | Auto-Approval |
|-------------|---------------|----------------|--------------|---------------|
| Untrusted   | Low           | No             | No           | No            |
| Basic       | Medium        | No             | No           | Low risk only |
| Elevated    | High          | Read-only      | No           | Low/Medium    |
| Privileged  | Critical      | Full           | Yes          | Low/Medium/High |
| Sovereign   | Critical      | Full           | Yes          | All           |

---

## Operation Modes

Agents execute in one of three operation modes:

```typescript
enum OperationMode {
  SIMULATION = 'SIMULATION',   // Allow all, no real execution (testing)
  DRY_RUN = 'DRY_RUN',         // Check permissions, simulate execution
  ENFORCED = 'ENFORCED'        // Full validation and enforcement
}
```

**Mode Behavior:**

- **SIMULATION**: All actions allowed, logging only, no side effects
- **DRY_RUN**: Policy evaluation, approval checks, no execution
- **ENFORCED**: Full enforcement, real execution, audit logging

---

## Capability Lifecycle

### 1. Registration

```bash
# Register new agent capability
POST /api/v1/agents/{agent_id}/capabilities
{
  "capability": {
    "name": "database:write",
    "scope": { ... },
    "risk_level": "high",
    "requires_approval": true
  }
}
```

### 2. Validation

Registry validates:
- Capability name follows taxonomy
- Scope is well-formed
- Risk level matches scope
- Approval requirements are consistent
- Limits are within organizational bounds

### 3. Activation

Capability is active only when:
- Agent status is `ACTIVE`
- Agent is certified (if capability requires)
- Capability has not been revoked
- Agent has not exceeded quotas

### 4. Revocation

Capabilities can be revoked:
- Per agent (revoke all capabilities)
- Per capability (revoke specific capability across agents)
- Immediate effect (no grace period)

---

## Enforcement Guarantees

### Hard Guarantees

1. **No Undeclared Actions**: Agent cannot execute action without declared capability
2. **Centralized Enforcement**: Limits enforced by platform, not agent code
3. **Fail-Closed Default**: Deny by default, allow by exception
4. **Immutable Audit**: All actions logged with cryptographic integrity
5. **Instant Revocation**: Revocation effective immediately, no redeploy

### Soft Guarantees

1. **Policy Consistency**: OPA policies evaluated consistently
2. **Quota Accuracy**: Usage tracking within 1% accuracy
3. **Cost Attribution**: Cost tracking per run with transaction boundaries

---

## Example: Complete Agent Registration

```yaml
agent:
  identity:
    id: "agent-incident-responder-001"
    name: "incident-response-agent"
    version: "3.0.0"
    agent_type: "internal"
    status: "active"
    is_certified: true
    certification_expires_at: "2026-06-30T23:59:59Z"
    owner_id: "user-sre-lead"
    organization_id: "org-platform-team"

  capabilities:
    - name: "monitoring:read"
      scope:
        tenant_scopes: ["*"]
        data_classifications: ["internal", "confidential"]
        allowed_apis: ["prometheus:query", "datadog:metrics"]
        read_only: true
      risk_level: "low"
      approval_class: "auto"

    - name: "deployment:rollback"
      scope:
        tenant_scopes: ["*"]
        project_scopes: ["production-*"]
        allowed_apis: ["kubernetes:rollback", "helm:rollback"]
      risk_level: "critical"
      approval_class: "gated"
      requires_approval: true

    - name: "communication:send"
      scope:
        allowed_apis: ["slack:post_message", "pagerduty:trigger"]
      risk_level: "medium"
      approval_class: "auto"

  limits:
    execution:
      max_wall_clock_ms: 600000  # 10 minutes for incident response
      max_steps: 100
      max_tool_calls: 200
      max_tokens_total: 500000
      max_runs_per_hour: 50
    budget:
      max_cost_per_run_usd: 5.00
      max_cost_per_day_usd: 500.00
      on_limit_breach: "escalate"

  restrictions:
    allowed_operation_modes: ["ENFORCED"]
    requires_human_oversight: true
    max_trust_level: "privileged"
    compliance_tags: ["SOC2", "INCIDENT_RESPONSE"]
```

---

## Integration with Existing Systems

### Database Schema

Capabilities are stored in:
- `agents.capabilities[]` - JSONB array of capability objects
- `agents.restrictions` - JSONB object of restriction rules
- `agent_policies` - Policy associations
- `agent_quotas` - Quota tracking

### Policy Engine (OPA)

Capabilities are evaluated via:
- `agents/governance/action` - Main action authorization
- `agents/governance/misuse` - Misuse detection
- `agents/governance/data_classification` - Data access control
- `agents/governance/rate_limit` - Rate limiting

### Audit System

All capability checks are logged to:
- `agent_runs` - Run-level tracking
- `agent_actions` - Action-level tracking
- `agent_audit_log` - Lifecycle events

---

## References

- [Agent Audit Model](./AUDIT_MODEL.md)
- [Agent Governance Evidence Pack](./EVIDENCE_AGENT_GOVERNANCE.md)
- Database Schema: `db/migrations/017_agent_framework.sql`
- Policy Engine: `agents/governance/src/policy-engine/`
- Registry Implementation: `server/src/governance/agent-registry.ts`

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Status**: Authoritative
