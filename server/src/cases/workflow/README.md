# Case Workflow Engine

> **Production-Grade Case Management & Workflow System for IntelGraph**
>
> Complete workflow automation with state machines, SLA tracking, approvals, and audit trails.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Data Model](#data-model)
5. [Quick Start](#quick-start)
6. [Usage Examples](#usage-examples)
7. [API Reference](#api-reference)
8. [Event System](#event-system)
9. [SLA Management](#sla-management)
10. [Security & Compliance](#security--compliance)
11. [Integration Guide](#integration-guide)

---

## Overview

The Case Workflow Engine is a production-ready system for managing intelligence cases with:

- **State Machine Workflow**: Configurable stages with transition guards
- **Task Management**: Assignments, dependencies, and completion tracking
- **SLA Tracking**: Automated breach detection and escalation
- **Approval Workflows**: 4-eyes, N-eyes, and role-based approvals
- **Role-Based Access**: Participant roles with fine-grained permissions
- **Event System**: Reactive hooks for integrations (Copilot, Analytics)
- **Audit Trail**: Complete history of all state changes

### Key Features

✅ **No Business Rules in UI** - All workflow logic lives in the engine
✅ **Versioned Stages** - Migrate workflows without breaking active cases
✅ **SLA Auto-Timers** - Breach/at-risk detection runs automatically
✅ **4-Eyes Enforcement** - Required approvals for sensitive transitions
✅ **Graph Entity References** - Link cases to graph nodes (opaque IDs only)
✅ **Fully Auditable** - Who, what, when for every transition

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  CaseWorkflowService                        │
│  (Main business logic layer)                                │
└───────┬─────────────────────────────────────────────────────┘
        │
        ├─► WorkflowStateMachine  (Stage transitions + guards)
        ├─► SLATracker            (Breach detection + timers)
        ├─► TaskRepo              (Task CRUD operations)
        ├─► ParticipantRepo       (Roles + assignments)
        ├─► ApprovalRepo          (4-eyes, N-eyes approvals)
        ├─► CaseRepo              (Base case operations)
        └─► AuditAccessLogRepo    (Immutable audit logs)
```

### Database Schema

**Core Tables:**
- `maestro.cases` - Extended with workflow fields (priority, stage, jurisdiction)
- `maestro.case_roles` - System + custom roles
- `maestro.case_participants` - User-case-role assignments
- `maestro.case_stages` - Stage definitions per case type
- `maestro.case_state_history` - Immutable transition log
- `maestro.case_tasks` - Tasks with dependencies
- `maestro.case_slas` - SLA definitions and status
- `maestro.case_approvals` - Approval requests
- `maestro.case_approval_votes` - Individual votes
- `maestro.case_graph_references` - Graph entity links

---

## Core Concepts

### 1. Case Types

A **case type** (e.g., `investigation`, `compliance_review`) determines:
- Available stages
- Allowed transitions
- Default SLA targets

Define new case types by inserting stages into `maestro.case_stages`.

### 2. Stages

A **stage** represents a step in the workflow:
- `intake` → `analysis` → `review` → `approved` → `completed`

Stages have:
- `order_index` - Sequence order
- `is_initial` - Can be first stage
- `is_terminal` - Auto-closes case when reached
- `required_role_id` - Role needed to enter stage
- `sla_hours` - Default SLA for this stage
- `allowed_transitions` - Array of next stages

### 3. Transition Guards

Guards control who can transition and when:

**Types:**
- `role` - User must have specific role
- `authority` - Requires warrant/legal authority
- `data` - Case data must meet conditions (e.g., `priority == 'high'`)
- `approval` - Requires completed approval

### 4. Tasks

**Tasks** are work items within a case:
- Assigned to users
- Can depend on other tasks
- Have due dates (auto-create SLAs)
- Store completion results

**Task Types:**
- `standard` - General task
- `approval` - Requires approval
- `review` - Review/validation task
- `data_collection` - Gather data
- `analysis` - Analysis task

### 5. SLAs (Service Level Agreements)

SLAs track time-based targets:

**SLA Types:**
- `case_completion` - Entire case completion
- `stage_completion` - Current stage completion
- `task_completion` - Individual task
- `first_response` - Initial response time

**SLA States:**
- `active` - Running, on track
- `at_risk` - Approaching due date (within threshold)
- `breached` - Past due date
- `met` - Completed on time
- `cancelled` - Cancelled

### 6. Approvals

**Approval Types:**
- `4-eyes` - Requires exactly 2 approvals (1 rejection fails)
- `n-eyes` - Requires N approvals
- `role-based` - Approver must have specific role
- `authority-based` - Requires legal authority

**Approval Flow:**
1. Request approval (status: `pending`)
2. Users submit votes (`approve`, `reject`, `abstain`)
3. Auto-completes when threshold met
4. Trigger fires to update status

---

## Data Model

### Case (Extended)

```typescript
interface CaseWithWorkflow {
  // Base fields
  id: string;
  tenantId: string;
  title: string;
  status: 'open' | 'active' | 'closed' | 'archived';

  // Workflow fields
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentStage?: string;
  caseType: string;
  jurisdiction?: string;
  authorityReference?: string;
  warrantId?: string;
  dueDate?: Date;
  tags: string[];

  // Relationships
  participants?: CaseParticipant[];
  tasks?: CaseTask[];
  slas?: CaseSLA[];
  approvals?: CaseApproval[];
}
```

### Task

```typescript
interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  taskType: 'standard' | 'approval' | 'review' | 'data_collection' | 'analysis';
  status: 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: Date;
  dependsOnTaskIds: string[];
  resultData: Record<string, any>;
}
```

---

## Quick Start

### 1. Initialize Service

```typescript
import { Pool } from 'pg';
import { CaseWorkflowService } from './cases/workflow';

const pg = new Pool({ /* ... */ });
const workflowService = new CaseWorkflowService(pg);
```

### 2. Add Participant to Case

```typescript
// Get investigator role
const investigatorRole = await workflowService.getRoleByName('investigator');

// Add user to case
await workflowService.addParticipant({
  caseId: 'case-123',
  userId: 'user-456',
  roleId: investigatorRole.id,
  assignedBy: 'manager-789',
});
```

### 3. Transition Case Stage

```typescript
const result = await workflowService.transitionStage(
  {
    caseId: 'case-123',
    toStage: 'analysis',
    userId: 'user-456',
    reason: 'Initial assessment complete, moving to analysis',
    legalBasis: 'investigation',
  },
  {
    legalBasis: 'investigation',
  }
);

if (result.success) {
  console.log(`Case now in stage: ${result.newStage}`);
} else {
  console.error('Transition failed:', result.errors);
}
```

### 4. Create Task with SLA

```typescript
const task = await workflowService.createTask(
  {
    caseId: 'case-123',
    title: 'Review financial records',
    taskType: 'review',
    priority: 'high',
    assignedTo: 'analyst-001',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    createdBy: 'investigator-456',
  },
  {
    legalBasis: 'investigation',
    reason: 'Financial review required',
  }
);

// SLA automatically created for task
```

### 5. Request 4-Eyes Approval

```typescript
const approval = await workflowService.requestApproval({
  caseId: 'case-123',
  approvalType: '4-eyes',
  requestedBy: 'investigator-456',
  reason: 'Escalating to law enforcement requires dual approval',
});

// Two users must approve
await workflowService.submitApprovalVote({
  approvalId: approval.id,
  approverUserId: 'supervisor-001',
  decision: 'approve',
  reason: 'Evidence supports escalation',
});

await workflowService.submitApprovalVote({
  approvalId: approval.id,
  approverUserId: 'supervisor-002',
  decision: 'approve',
  reason: 'Agreed, escalation warranted',
});

// Approval auto-completes when 2 approvals reached
```

---

## Usage Examples

### Example 1: Complete Case Lifecycle

```typescript
// 1. Create case (handled by CaseService, not shown here)

// 2. Set initial stage
await workflowService.transitionStage({
  caseId: 'case-123',
  toStage: 'intake',
  userId: 'intake-agent',
  reason: 'Case opened from alert',
}, { legalBasis: 'investigation' });

// 3. Add investigator
const investigatorRole = await workflowService.getRoleByName('investigator');
await workflowService.addParticipant({
  caseId: 'case-123',
  userId: 'inv-001',
  roleId: investigatorRole.id,
  assignedBy: 'intake-agent',
});

// 4. Create tasks
await workflowService.createTask({
  caseId: 'case-123',
  title: 'Initial assessment',
  taskType: 'analysis',
  priority: 'high',
  assignedTo: 'inv-001',
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdBy: 'intake-agent',
}, { legalBasis: 'investigation', reason: 'Initial task' });

// 5. Complete task
await workflowService.completeTask(
  'task-id',
  'inv-001',
  { findings: 'Suspicious activity detected' }
);

// 6. Transition to analysis stage
await workflowService.transitionStage({
  caseId: 'case-123',
  toStage: 'analysis',
  userId: 'inv-001',
  reason: 'Initial assessment complete',
}, { legalBasis: 'investigation' });

// 7. Eventually close case
await workflowService.transitionStage({
  caseId: 'case-123',
  toStage: 'completed',
  userId: 'inv-001',
  reason: 'Investigation concluded',
}, { legalBasis: 'investigation' });
```

### Example 2: SLA Monitoring (Run Periodically)

```typescript
// Cron job: Run every 5 minutes
async function checkSLAs() {
  // Check for breaches
  const breaches = await workflowService.checkBreachedSLAs();
  for (const breach of breaches) {
    console.error(`SLA BREACH: Case ${breach.caseId}, ${breach.slaType}`);
    // Send notification, create ticket, etc.
  }

  // Check for at-risk SLAs
  const atRisk = await workflowService.checkAtRiskSLAs();
  for (const sla of atRisk) {
    console.warn(`SLA AT RISK: Case ${sla.caseId}, ${sla.hoursRemaining}h remaining`);
    // Send warning notification
  }
}
```

### Example 3: Event-Driven Integration

```typescript
// Register event handlers for Copilot integration
workflowService.on('case.stage_changed', async (event) => {
  console.log(`Case ${event.caseId} moved to stage ${event.data.toStage}`);

  // Trigger Copilot to generate stage summary
  await copilotService.generateStageSummary(event.caseId, event.data.toStage);
});

workflowService.on('sla.breached', async (event) => {
  console.error(`SLA BREACH: Case ${event.caseId}`);

  // Escalate to supervisor
  await notificationService.escalateSLABreach(event.caseId, event.data);
});

workflowService.on('task.completed', async (event) => {
  // Check if all tasks in current stage are complete
  const tasks = await workflowService.listTasks({
    caseId: event.caseId,
    status: ['pending', 'assigned', 'in_progress'],
  });

  if (tasks.length === 0) {
    console.log(`All tasks complete for case ${event.caseId}`);
    // Auto-suggest stage transition
  }
});
```

### Example 4: Custom Transition Guards

```typescript
// In StateMachine.ts, extend evaluateGuard to support custom guards

// Example: Require warrant before escalating to law enforcement
const stages = [
  {
    name: 'escalated',
    guards: [
      {
        type: 'authority',
        config: {
          requiresWarrant: true,
          requiresAuthority: true,
        },
      },
    ],
  },
];

// Transition will fail if case.warrantId is null
```

---

## API Reference

### CaseWorkflowService

#### Workflow Transitions

```typescript
transitionStage(request: WorkflowTransitionRequest, auditContext): Promise<WorkflowTransitionResult>
getAvailableTransitions(caseId: string, userId: string): Promise<string[]>
```

#### Task Management

```typescript
createTask(input: CaseTaskInput, auditContext): Promise<CaseTask>
assignTask(taskId: string, userId: string, assignedBy: string): Promise<CaseTask | null>
completeTask(taskId: string, userId: string, resultData?): Promise<CaseTask | null>
updateTask(input: CaseTaskUpdateInput): Promise<CaseTask | null>
listTasks(filters: TaskListFilters): Promise<CaseTask[]>
getOverdueTasks(caseId: string): Promise<OverdueTask[]>
```

#### Participant Management

```typescript
addParticipant(input: CaseParticipantInput): Promise<CaseParticipant>
removeParticipant(caseId, userId, roleId, removedBy): Promise<CaseParticipant | null>
getCaseParticipants(caseId: string): Promise<CaseParticipant[]>
```

#### Approval Management

```typescript
requestApproval(input: CaseApprovalInput): Promise<CaseApproval>
submitApprovalVote(input: CaseApprovalVoteInput): Promise<CaseApprovalVote>
getPendingApprovalsForUser(userId: string): Promise<PendingApproval[]>
```

#### SLA Management

```typescript
createSLA(input: CaseSLAInput): Promise<CaseSLA>
getCaseSLAs(caseId: string): Promise<CaseSLA[]>
getCaseSLASummary(caseId: string): Promise<CaseSLASummary>
checkBreachedSLAs(): Promise<SLABreachEvent[]>
checkAtRiskSLAs(): Promise<SLAAtRiskEvent[]>
```

#### Event System

```typescript
on(eventType: CaseEventType, handler: EventHandler): void
```

---

## Event System

### Event Types

```typescript
type CaseEventType =
  | 'case.created'
  | 'case.updated'
  | 'case.closed'
  | 'case.stage_changed'
  | 'case.participant_added'
  | 'case.participant_removed'
  | 'task.created'
  | 'task.assigned'
  | 'task.completed'
  | 'task.overdue'
  | 'sla.breached'
  | 'sla.at_risk'
  | 'sla.met'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected';
```

### Registering Handlers

```typescript
workflowService.on('case.stage_changed', async (event: CaseEvent) => {
  console.log('Stage changed:', event.data);
  // Your logic here
});
```

### Event Structure

```typescript
interface CaseEvent {
  type: CaseEventType;
  caseId: string;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}
```

---

## SLA Management

### SLA Lifecycle

1. **Creation**: Auto-created when:
   - Case enters stage with `sla_hours` defined
   - Task created with `dueDate`
   - Manually via `createSLA()`

2. **Active**: SLA is running, status = `active`

3. **At Risk**: Approaching due date (within `at_risk_threshold_hours`)
   - Status changes to `at_risk`
   - `sla.at_risk` event emitted

4. **Breached**: Past due date
   - Status changes to `breached`
   - `sla.breached` event emitted
   - `breached_at` timestamp set

5. **Met**: Completed on time
   - Status changes to `met`
   - `completed_at` timestamp set

6. **Cancelled**: Manually cancelled

### SLA Monitoring

**Recommended Setup:**

```typescript
// Cron job: Every 5 minutes
setInterval(async () => {
  await workflowService.checkBreachedSLAs();
  await workflowService.checkAtRiskSLAs();
}, 5 * 60 * 1000);
```

**Database Function:**

The `maestro.update_sla_status()` trigger runs on INSERT/UPDATE to auto-update status based on due date.

---

## Security & Compliance

### Audit Trail

**All state changes logged to:**
- `maestro.case_state_history` - Stage/status transitions
- `maestro.audit_access_logs` - All case access (via `AuditAccessLogRepo`)

**Required Fields:**
- `reason` - Human-readable justification
- `legalBasis` - Legal authority (enum)
- `transitioned_by` - User ID

### Immutability

- State history is **append-only** (no UPDATE/DELETE triggers)
- Audit logs are cryptographically chained (SHA-256 hashes)
- Tamper detection via `verifyIntegrity()` method

### Authorization

**Role-Based:**
- Participants assigned to cases with specific roles
- Transition guards check role requirements
- Task assignments respect `required_role_id`

**Policy-Based:**
- Cases have `compartment` and `policy_labels`
- Integration with Governance service for ABAC

---

## Integration Guide

### Integration with Graph Core

**Do NOT:**
- ❌ Query Neo4j directly from workflow engine
- ❌ Create foreign key constraints to graph entities
- ❌ Embed graph-specific logic

**Do:**
- ✅ Store graph entity IDs as opaque strings in `case_graph_references`
- ✅ Store entity labels for UI display
- ✅ Use events to notify Graph Core of case changes

**Example:**

```typescript
// Link case to graph entity
await pg.query(
  `INSERT INTO maestro.case_graph_references (
    case_id, graph_entity_id, entity_type, entity_label, relationship_type, added_by
  ) VALUES ($1, $2, $3, $4, $5, $6)`,
  ['case-123', 'entity-456', 'person', 'John Doe', 'subject', 'inv-001']
);
```

### Integration with Copilot

**Event-Driven:**

```typescript
workflowService.on('case.stage_changed', async (event) => {
  // Copilot generates summary when stage changes
  await copilotService.generateContextSummary({
    caseId: event.caseId,
    stage: event.data.toStage,
  });
});

workflowService.on('task.completed', async (event) => {
  // Copilot analyzes task results
  await copilotService.analyzeTaskResults({
    caseId: event.caseId,
    taskId: event.data.task.id,
    results: event.data.resultData,
  });
});
```

### Integration with Analytics

**Event-Driven:**

```typescript
workflowService.on('sla.breached', async (event) => {
  // Track SLA metrics
  await analyticsService.recordSLABreach({
    caseId: event.caseId,
    slaType: event.data.slaType,
    breachDuration: event.data.breachDurationHours,
  });
});
```

---

## Database Views

### Active Cases Summary

```sql
SELECT * FROM maestro.v_active_cases_summary
WHERE tenant_id = 'tenant-123'
ORDER BY breached_sla_count DESC, at_risk_sla_count DESC;
```

Columns:
- `participant_count`
- `open_task_count`
- `breached_sla_count`
- `at_risk_sla_count`
- `pending_approval_count`

### User Workload

```sql
SELECT * FROM maestro.v_user_workload
WHERE user_id = 'user-456';
```

Columns:
- `total_tasks`
- `in_progress_tasks`
- `pending_tasks`
- `overdue_tasks`
- `active_case_count`

---

## Best Practices

### 1. Always Provide Reason

```typescript
// ❌ Bad
await workflowService.transitionStage({
  caseId: 'case-123',
  toStage: 'analysis',
  userId: 'user-456',
  reason: 'Update', // Too vague!
}, { legalBasis: 'investigation' });

// ✅ Good
await workflowService.transitionStage({
  caseId: 'case-123',
  toStage: 'analysis',
  userId: 'user-456',
  reason: 'Initial assessment complete. Found 3 suspicious transactions requiring deeper analysis.',
}, { legalBasis: 'investigation' });
```

### 2. Use Task Dependencies

```typescript
const task1 = await workflowService.createTask({
  caseId: 'case-123',
  title: 'Collect financial records',
  // ...
}, auditContext);

const task2 = await workflowService.createTask({
  caseId: 'case-123',
  title: 'Analyze financial records',
  dependsOnTaskIds: [task1.id], // Task 2 depends on Task 1
  // ...
}, auditContext);

// Check if dependencies met before starting task
const canStart = await workflowService.taskRepo.areDependenciesMet(task2.id);
```

### 3. Monitor SLAs Proactively

```typescript
// Dashboard: Show at-risk SLAs
const atRiskSLAs = await workflowService.slaTracker.getAllAtRiskSLAs('tenant-123');

// Notification: Alert on breach
workflowService.on('sla.breached', async (event) => {
  await sendEmail({
    to: 'supervisor@example.com',
    subject: `SLA BREACH: Case ${event.caseId}`,
    body: `SLA breached by ${event.data.breachDurationHours} hours`,
  });
});
```

### 4. Use Events for Cross-Service Communication

```typescript
// ❌ Bad: Direct service calls
workflowService.transitionStage(...);
copilotService.generateSummary(...); // Tight coupling!

// ✅ Good: Event-driven
workflowService.on('case.stage_changed', async (event) => {
  await copilotService.generateSummary(event.caseId);
});

workflowService.transitionStage(...); // Copilot called automatically
```

---

## Testing

### Unit Tests

Test state machine transitions:

```typescript
describe('WorkflowStateMachine', () => {
  it('should allow transition from intake to analysis', async () => {
    const allowed = await stateMachine.isTransitionAllowed(
      'investigation',
      'intake',
      'analysis'
    );
    expect(allowed).toBe(true);
  });

  it('should reject invalid transition', async () => {
    const allowed = await stateMachine.isTransitionAllowed(
      'investigation',
      'intake',
      'completed' // Skipping stages
    );
    expect(allowed).toBe(false);
  });
});
```

Test SLA breach detection:

```typescript
describe('SLATracker', () => {
  it('should detect breached SLAs', async () => {
    // Create overdue SLA
    await slaTracker.createSLA({
      caseId: 'case-123',
      slaType: 'case_completion',
      targetHours: -1, // Already past due
    });

    const breaches = await slaTracker.checkBreachedSLAs();
    expect(breaches.length).toBe(1);
    expect(breaches[0].caseId).toBe('case-123');
  });
});
```

### Integration Tests

Test complete case lifecycle:

```typescript
describe('Case Workflow Lifecycle', () => {
  it('should complete full investigation workflow', async () => {
    // 1. Create case
    // 2. Add participant
    // 3. Transition to intake
    // 4. Create tasks
    // 5. Complete tasks
    // 6. Transition through stages
    // 7. Close case
    // 8. Verify state history
  });
});
```

---

## Troubleshooting

### Issue: Transition Rejected

**Error:** "Transition from 'intake' to 'completed' is not allowed"

**Solution:**
- Check `allowed_transitions` for current stage
- Use `getAvailableTransitions()` to see valid next stages
- May need to go through intermediate stages

### Issue: SLA Not Creating

**Problem:** Task has `dueDate` but no SLA created

**Solution:**
- Check if `dueDate` is in the past (negative target hours)
- Ensure `createTask()` is called through `CaseWorkflowService` (not directly via repo)

### Issue: Approval Not Completing

**Problem:** Submitted 2 votes but approval still pending

**Solution:**
- Check if votes are `approve` decisions (not `abstain`)
- Verify `required_approvers` count
- Check database trigger `check_approval_completion` is enabled

---

## Migration Guide

### Migrating Existing Cases

If you have existing cases in `maestro.cases`, run:

```sql
-- Add default values for new workflow fields
UPDATE maestro.cases
SET priority = 'medium',
    case_type = 'investigation',
    tags = '{}',
    current_stage = 'intake'
WHERE priority IS NULL;
```

### Adding New Case Types

1. Define stages in `maestro.case_stages`:

```sql
INSERT INTO maestro.case_stages (case_type, name, order_index, allowed_transitions, sla_hours)
VALUES
  ('compliance_review', 'intake', 1, '["assessment"]', 24),
  ('compliance_review', 'assessment', 2, '["approved", "rejected"]', 72),
  ('compliance_review', 'approved', 3, '[]', NULL),
  ('compliance_review', 'rejected', 4, '[]', NULL);
```

2. Use new case type:

```typescript
await caseRepo.create({
  tenantId: 'tenant-123',
  title: 'Compliance Review #001',
  caseType: 'compliance_review', // New type
  // ...
});
```

---

## Performance Considerations

### Indexing

All critical queries are indexed:
- `idx_cases_current_stage`
- `idx_case_tasks_case_id`
- `idx_case_slas_due_at`
- `idx_case_participants_user_id`

### SLA Check Frequency

- **Breaches**: Check every 5 minutes (low volume)
- **At-Risk**: Check every 15 minutes (higher volume)
- Use database triggers for real-time status updates

### Event Handler Performance

Keep event handlers async and non-blocking:

```typescript
// ❌ Bad: Blocking handler
workflowService.on('task.completed', (event) => {
  // Synchronous, slow operation
  const result = heavyComputation();
});

// ✅ Good: Async, non-blocking
workflowService.on('task.completed', async (event) => {
  // Queue for background processing
  await jobQueue.enqueue('process-task-result', event);
});
```

---

## Support

For issues or questions:
- **Documentation**: This file
- **API Routes**: `server/src/routes/case-workflow.ts`
- **Database Schema**: `server/src/db/migrations/postgres/015_case_workflow_engine.sql`
- **Tests**: `server/src/tests/case-workflow.test.ts` (to be created)

---

**Last Updated**: 2025-11-24
**Version**: 1.0.0
**Owner**: Case Management & Workflow Engineering Team
