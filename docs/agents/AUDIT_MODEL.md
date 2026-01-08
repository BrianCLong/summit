# Agent Audit Model

## Overview

This document defines the **comprehensive audit model** for all autonomous agent operations. Every agent run must emit a tamper-evident audit record that enables complete reconstruction of who did what, under which permission, and why.

**Design Principle**: Complete traceability. Every action is auditable, every decision is attributable, every outcome is verifiable.

---

## Audit Architecture

### Three-Tier Audit System

```
┌─────────────────────────────────────────────┐
│  Tier 1: Run-Level Audit                   │
│  (agent_runs table)                         │
│  - What agent ran, when, under what trigger │
│  - High-level outcome and resource usage    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│  Tier 2: Action-Level Audit                │
│  (agent_actions table)                      │
│  - Every action proposed and executed       │
│  - Policy decisions and approval tracking   │
│  - Risk assessment and authorization        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│  Tier 3: Lifecycle Audit                   │
│  (agent_audit_log table)                    │
│  - Configuration changes                    │
│  - Credential operations                    │
│  - Status transitions                       │
│  - Administrative actions                   │
└─────────────────────────────────────────────┘
```

---

## Tier 1: Run-Level Audit

Every agent execution creates a **run record** with complete context.

### Run Audit Schema

```typescript
interface AgentRunAudit {
  // Identification
  id: string; // UUID - unique run ID
  agent_id: string; // Agent identity
  agent_version: string; // Agent version at execution time
  trace_id: string; // Distributed trace ID
  span_id: string; // Span ID for correlation

  // Context
  tenant_id: string; // Tenant context
  project_id?: string; // Project context
  user_id?: string; // Triggering user (if applicable)
  organization_id: string; // Organization context

  // Trigger Information
  trigger_type: TriggerType; // What initiated the run
  trigger_source: string; // Source identifier
  trigger_payload_hash: string; // SHA-256 of trigger payload

  // Operation Mode
  operation_mode: OperationMode; // SIMULATION | DRY_RUN | ENFORCED

  // Timing
  started_at: Date; // Run start time
  completed_at?: Date; // Run completion time
  duration_ms: number; // Total duration

  // Actions
  actions_proposed: ActionSummary[]; // All actions agent proposed
  actions_executed: ActionSummary[]; // Actions actually executed
  actions_denied: ActionSummary[]; // Actions denied by policy

  // Outcome
  status: RunStatus; // Final status
  outcome: RunOutcome; // Structured outcome
  error?: ErrorDetails; // Error details if failed

  // Resource Usage
  tokens_consumed: number; // Total tokens used
  api_calls_made: number; // API calls made
  cost_usd: number; // Estimated cost
  memory_peak_mb: number; // Peak memory usage

  // Capabilities Used
  capabilities_declared: string[]; // Capabilities from registry
  capabilities_used: string[]; // Capabilities actually invoked

  // Policy Decisions
  policy_evaluations: PolicyEvaluationSummary[];
  policy_violations: PolicyViolation[];

  // Provenance
  input_hash: string; // SHA-256 of inputs (redacted)
  output_hash: string; // SHA-256 of outputs (redacted)
  artifact_signatures: ArtifactSignature[]; // SLSA/cosign signatures
}

enum TriggerType {
  MANUAL = "manual", // User-initiated
  SCHEDULED = "scheduled", // Cron/schedule
  EVENT = "event", // Event-driven
  API = "api", // API call
  WEBHOOK = "webhook", // Webhook trigger
  AGENT_TO_AGENT = "agent_to_agent", // Inter-agent delegation
}

enum RunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout",
  LIMIT_EXCEEDED = "limit_exceeded",
  POLICY_DENIED = "policy_denied",
}

interface RunOutcome {
  success: boolean;
  result_summary: string;
  metrics: Record<string, number>;
  recommendations?: string[];
  next_steps?: string[];
}

interface ActionSummary {
  action_type: string;
  action_target: string;
  risk_level: RiskLevel;
  timestamp: Date;
}
```

### Run Audit Example

```json
{
  "id": "run-123e4567-e89b-12d3-a456-426614174000",
  "agent_id": "agent-code-reviewer",
  "agent_version": "2.1.0",
  "trace_id": "trace-abc123",
  "span_id": "span-def456",
  "tenant_id": "tenant-xyz",
  "project_id": "project-789",
  "user_id": "user-alice",
  "organization_id": "org-acme",
  "trigger_type": "webhook",
  "trigger_source": "github:pull_request.opened",
  "trigger_payload_hash": "sha256:9f86d081...",
  "operation_mode": "ENFORCED",
  "started_at": "2025-12-31T10:00:00Z",
  "completed_at": "2025-12-31T10:02:30Z",
  "duration_ms": 150000,
  "actions_proposed": [
    {
      "action_type": "code:analyze",
      "action_target": "pr-456",
      "risk_level": "low",
      "timestamp": "2025-12-31T10:00:05Z"
    },
    {
      "action_type": "comment:create",
      "action_target": "pr-456",
      "risk_level": "low",
      "timestamp": "2025-12-31T10:02:20Z"
    }
  ],
  "actions_executed": [
    {
      "action_type": "code:analyze",
      "action_target": "pr-456",
      "risk_level": "low",
      "timestamp": "2025-12-31T10:00:05Z"
    },
    {
      "action_type": "comment:create",
      "action_target": "pr-456",
      "risk_level": "low",
      "timestamp": "2025-12-31T10:02:20Z"
    }
  ],
  "actions_denied": [],
  "status": "completed",
  "outcome": {
    "success": true,
    "result_summary": "Code review completed. 3 suggestions provided.",
    "metrics": { "lines_reviewed": 450, "issues_found": 3 },
    "recommendations": ["Consider adding unit tests for error handling"]
  },
  "tokens_consumed": 12500,
  "api_calls_made": 8,
  "cost_usd": 0.15,
  "memory_peak_mb": 128,
  "capabilities_declared": ["repository:read", "comment:write"],
  "capabilities_used": ["repository:read", "comment:write"],
  "policy_evaluations": [
    {
      "policy": "agents/governance/action",
      "decision": "allow",
      "timestamp": "2025-12-31T10:00:01Z"
    }
  ],
  "policy_violations": [],
  "input_hash": "sha256:a1b2c3d4...",
  "output_hash": "sha256:e5f6g7h8...",
  "artifact_signatures": []
}
```

---

## Tier 2: Action-Level Audit

Every action (proposed or executed) creates an **action record**.

### Action Audit Schema

```typescript
interface AgentActionAudit {
  // Identification
  id: string; // UUID - unique action ID
  run_id: string; // Parent run
  agent_id: string; // Agent identity
  sequence_number: number; // Order within run

  // Action Details
  action_type: string; // Type of action (e.g., "database:write")
  action_target: string; // Target resource
  action_payload: unknown; // Action parameters (may be redacted)
  action_payload_hash: string; // SHA-256 of full payload

  // Risk Assessment
  risk_level: RiskLevel; // Computed risk level
  risk_factors: string[]; // Why this risk level
  risk_score: number; // Numeric risk score (0-100)

  // Policy Decision
  policy_decision: PolicyDecisionRecord;
  policy_path: string; // OPA policy path evaluated
  policy_version: string; // Policy version
  policy_input_hash: string; // SHA-256 of policy input

  // Authorization
  authorization_status: AuthorizationStatus;
  authorization_reason: string;
  capabilities_required: string[]; // Capabilities needed
  capabilities_matched: boolean; // Whether agent has capabilities

  // Approval Workflow
  requires_approval: boolean;
  approval_id?: string; // Link to approval record
  approved_by?: string; // Approver user ID
  approved_at?: Date; // Approval timestamp
  approval_reason?: string; // Approval justification

  // Execution
  executed: boolean; // Whether action was executed
  execution_started_at?: Date; // Execution start
  execution_completed_at?: Date; // Execution completion
  execution_duration_ms?: number; // Execution duration
  execution_result?: unknown; // Execution result (may be redacted)
  execution_result_hash?: string; // SHA-256 of result
  execution_error?: ErrorDetails; // Error if failed

  // Audit Trail
  created_at: Date;
  updated_at: Date;
}

interface PolicyDecisionRecord {
  decision: PolicyDecision; // allow | deny | conditional
  obligations: Obligation[]; // Required obligations
  reason: string; // Human-readable reason
  evaluation_time_ms: number; // Policy evaluation time
}

enum AuthorizationStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  DENIED = "denied",
  EXPIRED = "expired",
  REVOKED = "revoked",
}
```

### Action Audit Example

```json
{
  "id": "action-789abc-def012",
  "run_id": "run-123e4567",
  "agent_id": "agent-code-reviewer",
  "sequence_number": 2,
  "action_type": "comment:create",
  "action_target": "github:pr-456",
  "action_payload": {
    "comment": "Consider adding error handling...",
    "file": "src/app.ts",
    "line": 42
  },
  "action_payload_hash": "sha256:1a2b3c4d...",
  "risk_level": "low",
  "risk_factors": ["low_impact", "read_only_context"],
  "risk_score": 15,
  "policy_decision": {
    "decision": "allow",
    "obligations": [{ "type": "audit_enhanced" }],
    "reason": "Agent has 'comment:write' capability within scope",
    "evaluation_time_ms": 12
  },
  "policy_path": "agents/governance/action",
  "policy_version": "1.2.0",
  "policy_input_hash": "sha256:5e6f7g8h...",
  "authorization_status": "authorized",
  "authorization_reason": "Capability match and policy approval",
  "capabilities_required": ["comment:write"],
  "capabilities_matched": true,
  "requires_approval": false,
  "executed": true,
  "execution_started_at": "2025-12-31T10:02:20Z",
  "execution_completed_at": "2025-12-31T10:02:21Z",
  "execution_duration_ms": 1000,
  "execution_result": { "comment_id": "comment-999" },
  "execution_result_hash": "sha256:9i0j1k2l...",
  "created_at": "2025-12-31T10:02:19Z",
  "updated_at": "2025-12-31T10:02:21Z"
}
```

---

## Tier 3: Lifecycle Audit

All agent configuration and administrative changes are logged.

### Lifecycle Audit Schema

```typescript
interface AgentLifecycleAudit {
  // Identification
  id: string; // UUID
  agent_id: string; // Agent affected

  // Event Classification
  event_type: LifecycleEventType;
  event_category: EventCategory;
  event_severity: EventSeverity;

  // Actor Information
  actor_id: string; // Who made the change
  actor_type: ActorType; // User, system, or agent
  actor_context: ActorContext; // Additional context

  // Change Details
  changes: ChangeRecord; // Before/after state
  change_reason?: string; // Justification
  change_request_id?: string; // Link to change request

  // Context
  metadata: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;

  // Timing
  timestamp: Date;

  // Cryptographic Integrity
  previous_record_hash?: string; // Hash chain for tamper detection
  record_signature?: string; // HMAC signature
}

enum LifecycleEventType {
  // Agent Lifecycle
  AGENT_CREATED = "agent_created",
  AGENT_UPDATED = "agent_updated",
  AGENT_DELETED = "agent_deleted",
  STATUS_CHANGED = "status_changed",
  VERSION_DEPLOYED = "version_deployed",

  // Capabilities
  CAPABILITY_ADDED = "capability_added",
  CAPABILITY_REMOVED = "capability_removed",
  CAPABILITY_MODIFIED = "capability_modified",

  // Credentials
  CREDENTIAL_CREATED = "credential_created",
  CREDENTIAL_ROTATED = "credential_rotated",
  CREDENTIAL_REVOKED = "credential_revoked",
  CREDENTIAL_EXPIRED = "credential_expired",

  // Scope Changes
  SCOPE_EXPANDED = "scope_expanded",
  SCOPE_RESTRICTED = "scope_restricted",
  TENANT_ADDED = "tenant_added",
  TENANT_REMOVED = "tenant_removed",

  // Security Events
  CERTIFICATION_GRANTED = "certification_granted",
  CERTIFICATION_REVOKED = "certification_revoked",
  SECURITY_VIOLATION = "security_violation",
  MISUSE_DETECTED = "misuse_detected",

  // Administrative
  QUOTA_MODIFIED = "quota_modified",
  POLICY_ATTACHED = "policy_attached",
  POLICY_DETACHED = "policy_detached",
  APPROVAL_REQUIRED = "approval_required",
  EMERGENCY_SHUTDOWN = "emergency_shutdown",
}

enum EventCategory {
  LIFECYCLE = "lifecycle",
  SECURITY = "security",
  ACCESS = "access",
  CONFIGURATION = "configuration",
  EXECUTION = "execution",
  COMPLIANCE = "compliance",
}

enum EventSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

enum ActorType {
  USER = "user",
  SYSTEM = "system",
  AGENT = "agent",
  API = "api",
}

interface ActorContext {
  user_roles?: string[];
  api_key_id?: string;
  service_account?: string;
  request_source?: string;
}

interface ChangeRecord {
  before?: unknown; // State before change
  after?: unknown; // State after change
  fields_changed: string[]; // Which fields changed
  diff?: string; // Human-readable diff
}
```

### Lifecycle Audit Example

```json
{
  "id": "audit-456def-789ghi",
  "agent_id": "agent-code-reviewer",
  "event_type": "capability_added",
  "event_category": "configuration",
  "event_severity": "info",
  "actor_id": "user-admin-bob",
  "actor_type": "user",
  "actor_context": {
    "user_roles": ["admin", "agent_manager"],
    "request_source": "web_ui"
  },
  "changes": {
    "before": {
      "capabilities": ["repository:read"]
    },
    "after": {
      "capabilities": ["repository:read", "comment:write"]
    },
    "fields_changed": ["capabilities"],
    "diff": "+ comment:write"
  },
  "change_reason": "Added commenting capability for PR feedback",
  "change_request_id": "cr-12345",
  "metadata": {
    "capability_risk_level": "low",
    "approval_required": false
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-12-31T09:00:00Z",
  "previous_record_hash": "sha256:abc123...",
  "record_signature": "hmac-sha256:def456..."
}
```

---

## Audit Record Retention

### Retention Policies

| Record Type        | Retention Period              | Archive Strategy             |
| ------------------ | ----------------------------- | ---------------------------- |
| Run Audit          | 90 days (hot), 7 years (cold) | TimescaleDB compression      |
| Action Audit       | 90 days (hot), 7 years (cold) | TimescaleDB compression      |
| Lifecycle Audit    | Indefinite                    | Append-only with compression |
| Policy Evaluations | 30 days (hot), 2 years (cold) | Aggregated summaries         |
| Error Logs         | 180 days                      | Full retention               |

### Compliance Mappings

- **SOC 2**: All audit records retained for audit period + 1 year
- **GDPR**: PII redacted, hashes retained for 7 years
- **HIPAA**: Full audit trail for 6 years
- **ISO 27001**: Security events retained indefinitely

---

## Tamper-Evident Audit

### Cryptographic Integrity

```typescript
interface AuditIntegrity {
  // Hash Chain
  record_id: string;
  record_hash: string; // SHA-256 of record content
  previous_record_hash: string; // Hash chain link
  chain_sequence: number; // Sequence in chain

  // Signature
  signature: string; // HMAC-SHA256 signature
  signature_algorithm: string; // Algorithm used
  signing_key_id: string; // Key ID (not key itself)

  // Merkle Tree (for batch verification)
  merkle_root?: string; // Merkle root hash
  merkle_proof?: string[]; // Merkle proof path

  // Timestamp
  signed_at: Date; // Signature timestamp
  notary_witness?: string; // Optional timestamp authority
}
```

### Verification

```bash
# Verify audit record integrity
POST /api/v1/audit/verify
{
  "record_id": "audit-123",
  "verify_chain": true,
  "verify_signature": true
}

# Response
{
  "valid": true,
  "chain_intact": true,
  "signature_valid": true,
  "verified_at": "2025-12-31T10:00:00Z"
}
```

---

## Audit Retrieval API

### Query Audit Records

```typescript
interface AuditQuery {
  // Filters
  agent_id?: string;
  run_id?: string;
  tenant_id?: string;
  event_type?: string[];
  event_category?: string[];
  actor_id?: string;

  // Time Range
  start_time?: Date;
  end_time?: Date;

  // Pagination
  limit: number;
  offset: number;

  // Sorting
  sort_by: "timestamp" | "severity" | "event_type";
  sort_order: "asc" | "desc";

  // Filters
  include_redacted?: boolean; // Include redacted payloads
  include_signatures?: boolean; // Include crypto signatures
}

interface AuditQueryResponse {
  records: AuditRecord[];
  total_count: number;
  has_more: boolean;
  query_time_ms: number;
}
```

### Example Queries

```bash
# Get all runs for an agent
GET /api/v1/audit/runs?agent_id=agent-code-reviewer&limit=100

# Get all policy denials in last 24h
GET /api/v1/audit/actions?authorization_status=denied&start_time=2025-12-30T10:00:00Z

# Get all security events
GET /api/v1/audit/lifecycle?event_category=security&sort_by=severity

# Get complete audit trail for a run
GET /api/v1/audit/run/{run_id}/complete
```

---

## Audit Analytics

### Pre-Computed Metrics

```typescript
interface AuditMetrics {
  // Time Period
  period_start: Date;
  period_end: Date;

  // Run Metrics
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  denied_runs: number;

  // Action Metrics
  total_actions: number;
  actions_executed: number;
  actions_denied: number;
  high_risk_actions: number;
  critical_risk_actions: number;

  // Policy Metrics
  policy_evaluations: number;
  policy_denials: number;
  policy_violations: number;

  // Resource Metrics
  total_tokens_consumed: number;
  total_cost_usd: number;
  avg_duration_ms: number;

  // Top Agents
  top_agents_by_runs: AgentRunCount[];
  top_agents_by_cost: AgentCostCount[];

  // Error Analysis
  error_rate: number;
  errors_by_type: Record<string, number>;
}
```

### Forensic Queries

```bash
# Reconstruct complete agent run
GET /api/v1/audit/forensic/run/{run_id}

# Returns:
{
  "run": { /* complete run record */ },
  "actions": [ /* all action records */ ],
  "policy_evaluations": [ /* all policy decisions */ ],
  "approvals": [ /* approval workflow */ ],
  "lifecycle_events": [ /* related lifecycle events */ ],
  "timeline": [ /* chronological event timeline */ ],
  "resource_graph": { /* resource access graph */ }
}

# Find all actions by actor
GET /api/v1/audit/forensic/actor/{actor_id}

# Detect anomalies
GET /api/v1/audit/forensic/anomalies?agent_id=agent-xyz
```

---

## Audit Event Streaming

### Real-Time Audit Stream

```typescript
// Subscribe to audit events
const auditStream = subscribe("/audit/stream", {
  filters: {
    event_category: ["security", "execution"],
    event_severity: ["warning", "critical"],
  },
});

auditStream.on("event", (event: AuditEvent) => {
  console.log("Audit event:", event);
});
```

### Webhook Notifications

```yaml
# Configure webhook for critical events
webhook:
  url: "https://siem.example.com/ingest"
  events:
    - security_violation
    - misuse_detected
    - emergency_shutdown
  signing_key: "webhook_secret_key"
  retry_policy:
    max_retries: 3
    backoff: exponential
```

---

## Redaction Policy

### Sensitive Data Handling

```typescript
interface RedactionPolicy {
  // Always Redacted
  credentials: "REDACTED"; // API keys, passwords
  pii: "HASHED"; // Personal information
  secrets: "REDACTED"; // Secret manager contents

  // Conditionally Redacted
  payload_size_threshold: 10000; // Redact payloads > 10KB
  retain_hash: true; // Always keep SHA-256 hash
  retain_schema: true; // Keep structure, redact values

  // Never Redacted
  metadata: "FULL"; // Metadata always kept
  timing: "FULL"; // Timestamps always kept
  identifiers: "FULL"; // IDs always kept
}
```

### Redacted Example

```json
{
  "action_payload": "REDACTED_SIZE_EXCEEDED",
  "action_payload_hash": "sha256:abc123...",
  "action_payload_schema": {
    "type": "object",
    "properties": ["database_query", "parameters"]
  }
}
```

---

## Compliance Reports

### Pre-Built Reports

1. **Agent Activity Report**
   - All agent runs in period
   - Success/failure rates
   - Resource consumption
   - Cost attribution

2. **Security Incident Report**
   - All security events
   - Policy violations
   - Misuse detections
   - Response actions

3. **Approval Audit Report**
   - All approval workflows
   - Approval/denial rates
   - Average approval time
   - Overridden approvals

4. **Capability Usage Report**
   - Capabilities by agent
   - High-risk capability usage
   - Unauthorized access attempts
   - Capability grants/revocations

---

## References

- [Agent Capability Model](./CAPABILITY_MODEL.md)
- [Agent Governance Evidence Pack](./EVIDENCE_AGENT_GOVERNANCE.md)
- Advanced Audit System: `server/src/audit/advanced-audit-system.ts`
- Database Schema: `db/migrations/017_agent_framework.sql`
- Audit API: `server/src/routes/agentic-telemetry.ts`

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Status**: Authoritative
