# Agent Archetypes Architecture

**Version:** 1.0
**Date:** November 20, 2025
**Status:** Design & Implementation

## Overview

Summit's agent archetypes are **named, opinionated AI agents** built on the existing AgentOrchestrator foundation. They provide pre-configured capabilities for specific business functions, competing directly with Dotwork's "Enterprise Agents," Soom's "AI COO," and Leapsome's "AI Copilot."

## Design Principles

1. **Human-in-Command:** Agents recommend, humans approve (respects existing approval engine)
2. **Graph-Native:** All agent actions create/query graph entities with full provenance
3. **Policy-Aware:** All agent decisions run through OPA policy evaluation
4. **Auditable:** Complete audit trail for every agent action
5. **Extensible:** New agent types can be added using the base architecture

## Architecture

### Base Agent Interface

```typescript
interface AgentArchetype {
  // Identity
  name: string;
  role: string;
  capabilities: string[];

  // Lifecycle
  initialize(): Promise<void>;
  execute(context: AgentContext): Promise<AgentResult>;
  shutdown(): Promise<void>;

  // Core Functions
  analyze(query: AgentQuery): Promise<AgentAnalysis>;
  recommend(analysis: AgentAnalysis): Promise<AgentRecommendation[]>;
  act(recommendation: AgentRecommendation): Promise<AgentAction>;

  // Integration Points
  getGraphEntities(): Promise<GraphEntity[]>;
  evaluatePolicy(action: AgentAction): Promise<PolicyResult>;
  createAuditLog(action: AgentAction): Promise<AuditRecord>;

  // Observability
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  getHealthCheck(): AgentHealth;
}
```

### Agent Context

```typescript
interface AgentContext {
  user: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  organization: {
    id: string;
    policies: PolicySet;
    graph: GraphHandle;
  };
  mode: 'analysis' | 'recommendation' | 'action' | 'monitor';
  timestamp: Date;
  requestId: string;
}
```

### Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────┐
│                      Switchboard UI                         │
│  (Command Palette, Agent Roster, Dashboard)                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agent Registry                            │
│  (COO, Chief of Staff, RevOps, Custom Agents)              │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│   COO    │ │  Chief   │ │ RevOps   │
│  Agent   │ │ of Staff │ │  Agent   │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Graph   │ │  Policy  │ │ Approval │
│   Core   │ │  Engine  │ │  Engine  │
└──────────┘ └──────────┘ └──────────┘
         │        │        │
         └────────┼────────┘
                  ▼
         ┌────────────────┐
         │  Audit Trail   │
         └────────────────┘
```

---

## Agent Archetype 1: AI Chief of Staff

### Role
Personal AI assistant that helps leaders manage their time, attention, and decision-making.

### Capabilities
- **Inbox Triage:** Prioritize emails, messages, notifications
- **Meeting Preparation:** Generate pre-reads, agenda, context
- **Follow-up Tracking:** Monitor action items, commitments, deadlines
- **Decision Support:** Synthesize options, risks, recommendations
- **Calendar Optimization:** Suggest focus time, meeting consolidation
- **Delegation Recommendation:** Identify tasks to delegate based on priority/skills

### Graph Entities
```typescript
// Chief of Staff creates/queries these entities
- Task (priority, deadline, owner, dependencies)
- Meeting (attendees, agenda, pre-read, follow-ups)
- Decision (options, criteria, recommendation, outcome)
- ActionItem (owner, due_date, status, source)
- Message (sender, urgency, category, triage_score)
- Calendar (events, conflicts, focus_blocks)
```

### Key Workflows
1. **Morning Briefing:**
   ```
   Input: User's calendar + inbox + pending tasks
   Analysis: Prioritize by urgency × impact
   Output: Top 5 priorities, conflicts, recommendations
   Policy Check: Calendar access, email read permissions
   Approval: None (read-only analysis)
   ```

2. **Meeting Prep:**
   ```
   Input: Meeting details + participant history + related docs
   Analysis: Generate context, talking points, questions
   Output: Pre-read summary + suggested agenda
   Policy Check: Document access, participant data
   Approval: None (read-only synthesis)
   ```

3. **Follow-up Tracking:**
   ```
   Input: Meeting transcript + chat history
   Analysis: Extract action items, owners, deadlines
   Output: Structured action items + reminders
   Policy Check: Task creation permissions
   Approval: Required if assigning tasks to others
   ```

### Switchboard Integration
- **Command Palette:**
  - `⌘K → "Brief me"` → Morning briefing
  - `⌘K → "Prep meeting: [name]"` → Meeting prep
  - `⌘K → "Show follow-ups"` → Action item dashboard

- **Agent Roster:**
  - Status: "Analyzing 47 messages, 12 meetings today"
  - Quick Actions: Brief, Prep, Triage, Delegate

- **Dashboard Tiles:**
  - Top Priorities (real-time)
  - Meeting Readiness Score
  - Open Action Items by Owner

### Metrics
- Messages triaged per day
- Meeting prep time saved
- Action items completed on time
- Calendar utilization rate
- Decision velocity (avg time to decide)

---

## Agent Archetype 2: AI COO (Chief Operating Officer)

### Role
Operations AI that monitors SLAs, incidents, approvals, and process health across the organization.

### Capabilities
- **SLA Monitoring:** Track service level agreements, alert on breaches
- **Incident Management:** Triage, route, track incidents to resolution
- **Approval Tracking:** Monitor approval queues, escalate blockers
- **Process Drift Detection:** Identify deviations from defined workflows
- **Resource Utilization:** Monitor team capacity, burnout signals
- **Operational Metrics:** Real-time dashboards for uptime, throughput, quality

### Graph Entities
```typescript
// COO creates/queries these entities
- Incident (severity, status, owner, timeline, impact)
- SLA (target, actual, breach_risk, dependencies)
- Approval (request, approvers, stage, elapsed_time)
- Process (definition, executions, drift_score)
- Resource (utilization, capacity, health_score)
- Metric (kpi, target, actual, trend)
```

### Key Workflows
1. **SLA Burn Rate Monitoring:**
   ```
   Input: SLA definitions + current performance
   Analysis: Calculate burn rate, predict breach time
   Output: Alerts for at-risk SLAs, mitigation options
   Policy Check: SLA read permissions
   Approval: None (monitoring only)
   Action: Create incident if breach imminent
   ```

2. **Incident Triage & Routing:**
   ```
   Input: Incident report (source, severity, description)
   Analysis: Classify severity, identify owner, suggest runbook
   Output: Triaged incident + owner assignment + runbook link
   Policy Check: Incident creation, assignment permissions
   Approval: Auto-assign if severity ≤ P3, require approval for P0-P2
   Action: Create incident entity, notify owner, start runbook
   ```

3. **Approval Queue Management:**
   ```
   Input: All pending approvals across org
   Analysis: Identify bottlenecks, stale approvals, escalation needs
   Output: Approval dashboard + escalation recommendations
   Policy Check: Approval read permissions
   Approval: Escalation requires manager approval
   Action: Send reminders, escalate per policy
   ```

4. **Process Drift Detection:**
   ```
   Input: Workflow definition + recent executions
   Analysis: Compare actual vs expected steps, timing, outcomes
   Output: Drift score + root cause hypothesis
   Policy Check: Workflow read/analysis permissions
   Approval: None (analysis only)
   Action: Create alert if drift > threshold
   ```

### Switchboard Integration
- **Command Palette:**
  - `⌘K → "Ops status"` → System health dashboard
  - `⌘K → "Triage incident"` → Incident creation wizard
  - `⌘K → "Approval bottlenecks"` → Approval queue analysis

- **Agent Roster:**
  - Status: "Monitoring 23 SLAs, 4 active incidents, 7 pending approvals"
  - Quick Actions: Triage, Escalate, Report, Alert

- **Dashboard Tiles:**
  - SLA Burn Rate (real-time)
  - Active Incidents by Severity
  - Approval Queue Aging
  - Process Health Score

### Metrics
- SLA compliance rate
- Mean time to resolution (MTTR)
- Incident triage accuracy
- Approval cycle time
- Process drift frequency
- Operational cost per workload

---

## Agent Archetype 3: AI RevOps (Revenue Operations)

### Role
Revenue AI that tracks pipeline health, forecast accuracy, attribution, and churn risk.

### Capabilities
- **Pipeline Sanity Checks:** Identify stale deals, missing data, unrealistic closes
- **Forecast Deltas:** Track changes in forecast, explain variance
- **Attribution Analysis:** Multi-touch attribution for marketing/sales
- **Churn Risk Prediction:** Identify at-risk accounts, recommend interventions
- **Lead Scoring:** Score and prioritize leads based on signals
- **Revenue Analytics:** Dashboards for ARR, pipeline coverage, win rates

### Graph Entities
```typescript
// RevOps creates/queries these entities
- Opportunity (amount, stage, close_date, health_score)
- Forecast (period, amount, commit_level, variance)
- Account (arr, health_score, churn_risk, engagement)
- Lead (score, source, touches, status)
- Attribution (touchpoint, influence, revenue_credit)
- Campaign (spend, leads, pipeline, roi)
```

### Key Workflows
1. **Pipeline Sanity Check:**
   ```
   Input: All open opportunities
   Analysis: Identify stale (>30d no activity), missing fields, unrealistic timelines
   Output: Pipeline health report + recommended actions
   Policy Check: CRM read permissions
   Approval: None (analysis only)
   Action: Create tasks for sales reps to update
   ```

2. **Forecast Variance Analysis:**
   ```
   Input: Current forecast + previous forecast + actual
   Analysis: Calculate delta, attribute to new/moved/won/lost deals
   Output: Waterfall chart + variance explanation
   Policy Check: Forecast read permissions
   Approval: None (analysis only)
   Action: Generate forecast report
   ```

3. **Churn Risk Prediction:**
   ```
   Input: Account engagement, support tickets, usage metrics
   Analysis: Calculate churn risk score using ML model
   Output: At-risk accounts ranked by risk × value
   Policy Check: Account read permissions, ML model usage
   Approval: None (prediction only)
   Action: Create intervention tasks for CSMs
   ```

4. **Multi-Touch Attribution:**
   ```
   Input: Opportunity + all marketing/sales touches
   Analysis: Calculate influence credit per touchpoint using attribution model
   Output: Attribution breakdown by channel/campaign/rep
   Policy Check: Opportunity + touch read permissions
   Approval: None (calculation only)
   Action: Update attribution entities
   ```

### Switchboard Integration
- **Command Palette:**
  - `⌘K → "Pipeline health"` → Pipeline sanity dashboard
  - `⌘K → "Forecast variance"` → Forecast waterfall
  - `⌘K → "Churn risks"` → At-risk account list

- **Agent Roster:**
  - Status: "Tracking $4.2M pipeline, 3 high churn risks, forecast +$200K"
  - Quick Actions: Analyze, Predict, Attribute, Report

- **Dashboard Tiles:**
  - Pipeline Health Score
  - Forecast Variance (week-over-week)
  - Top Churn Risks
  - Attribution by Channel

### Metrics
- Pipeline coverage ratio
- Forecast accuracy (% to plan)
- Win rate by source/stage
- Churn rate (logo, revenue)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `BaseAgentArchetype` abstract class
- [ ] Implement `AgentRegistry` for managing agent instances
- [ ] Build `AgentContext` provider with user/org/policy access
- [ ] Create `AgentResult` standard response format
- [ ] Wire into existing `AgentOrchestrator` as "archetype mode"

### Phase 2: Chief of Staff Agent (Week 1-2)
- [ ] Implement `ChiefOfStaffAgent` class
- [ ] Build inbox triage logic (priority scoring)
- [ ] Create meeting prep workflow
- [ ] Implement follow-up extraction from transcripts
- [ ] Add Switchboard command palette integration
- [ ] Create dashboard tiles for priorities/meetings/action items

### Phase 3: COO Agent (Week 2)
- [ ] Implement `COOAgent` class
- [ ] Build SLA burn rate calculator
- [ ] Create incident triage & routing logic
- [ ] Implement approval queue analyzer
- [ ] Add process drift detection
- [ ] Wire into existing approval engine
- [ ] Create ops dashboard tiles

### Phase 4: RevOps Agent (Week 2-3)
- [ ] Implement `RevOpsAgent` class
- [ ] Build pipeline sanity checker
- [ ] Create forecast variance analyzer
- [ ] Implement churn risk ML model (simple logistic regression to start)
- [ ] Add multi-touch attribution calculator
- [ ] Create RevOps dashboard tiles

### Phase 5: Integration & Testing (Week 3)
- [ ] Switchboard UI updates (agent roster, command palette)
- [ ] GraphQL mutations for agent actions
- [ ] Policy definitions for agent permissions
- [ ] Audit trail logging for all agent actions
- [ ] End-to-end testing of all 3 agents
- [ ] Documentation (usage guide, API reference)

---

## Security & Compliance

### Policy Enforcement
All agent actions must pass OPA policy checks:

```rego
# /policies/agent-archetypes.rego

package agents.archetypes

# Chief of Staff can read user's calendar/email
allow_chief_of_staff_read {
    input.agent.role == "chief_of_staff"
    input.action == "read"
    input.resource.owner_id == input.user.id
}

# COO can triage incidents up to P2 without approval
allow_coo_incident_triage {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity >= "P2"
}

# COO requires approval for P0/P1 incidents
require_approval_high_severity {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity < "P2"
}

# RevOps can read pipeline data but not modify
allow_revops_read_pipeline {
    input.agent.role == "revops"
    input.action == "read"
    startswith(input.resource.type, "opportunity")
}

deny_revops_modify_pipeline {
    input.agent.role == "revops"
    input.action in ["create", "update", "delete"]
    startswith(input.resource.type, "opportunity")
}
```

### Audit Trail
Every agent action creates an audit log:

```typescript
interface AgentAuditLog {
  timestamp: Date;
  requestId: string;
  agentType: 'chief_of_staff' | 'coo' | 'revops';
  agentInstanceId: string;
  action: string;
  input: any;
  output: any;
  policyResult: PolicyResult;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  userId: string;
  organizationId: string;
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET';
}
```

### Data Privacy
- Agents never store raw sensitive data (PII, credentials)
- All data access goes through graph API with ABAC
- Agent insights/recommendations logged separately from source data
- User can request deletion of all agent-generated data

---

## Success Metrics

### Product Adoption
- Active agents per organization
- Actions per agent per day
- User satisfaction score (NPS)
- Command palette usage rate

### Business Impact
- **Chief of Staff:** Meeting prep time saved, action item completion rate
- **COO:** SLA compliance improvement, MTTR reduction, approval cycle time
- **RevOps:** Forecast accuracy improvement, churn reduction, pipeline health score

### Technical Performance
- Agent response time (p50, p95, p99)
- Policy evaluation latency
- Graph query performance
- Approval engine integration latency

---

## Future Agent Archetypes

### Short-Term (3-6 months)
- **AI CFO:** Budget tracking, spend anomalies, financial planning
- **AI CISO:** Security posture, threat detection, compliance monitoring
- **AI People Ops:** Hiring pipeline, performance reviews, engagement signals

### Long-Term (6-12 months)
- **AI Product Manager:** Feature requests, usage analytics, roadmap prioritization
- **AI Customer Success:** Onboarding, adoption, expansion opportunities
- **AI Legal:** Contract review, compliance checks, risk assessment

### Custom Agents
- Partner/customer-built agents using Summit SDK
- Agent marketplace for discovering/installing agents
- Agent templates for common use cases

---

## File Structure

```
/src/agents/archetypes/
  ├── base/
  │   ├── BaseAgentArchetype.ts      # Abstract base class
  │   ├── AgentRegistry.ts           # Agent discovery/lifecycle
  │   └── AgentContext.ts            # Context provider
  ├── chief-of-staff/
  │   ├── ChiefOfStaffAgent.ts       # Main implementation
  │   ├── InboxTriageService.ts      # Inbox prioritization
  │   ├── MeetingPrepService.ts      # Meeting prep logic
  │   └── FollowUpTracker.ts         # Action item extraction
  ├── coo/
  │   ├── COOAgent.ts                # Main implementation
  │   ├── SLAMonitorService.ts       # SLA tracking
  │   ├── IncidentTriageService.ts   # Incident routing
  │   ├── ApprovalQueueService.ts    # Approval bottlenecks
  │   └── ProcessDriftDetector.ts    # Process compliance
  ├── revops/
  │   ├── RevOpsAgent.ts             # Main implementation
  │   ├── PipelineSanityService.ts   # Pipeline health
  │   ├── ForecastAnalyzer.ts        # Forecast variance
  │   ├── ChurnPredictor.ts          # Churn risk ML
  │   └── AttributionEngine.ts       # Multi-touch attribution
  └── index.ts                       # Export all agents

/policies/
  └── agent-archetypes.rego          # Agent permissions

/apps/web/src/components/agents/
  ├── AgentRoster.tsx                # Agent list/status
  ├── AgentDashboard.tsx             # Agent-specific dashboards
  └── AgentCommandPalette.tsx        # ⌘K integration
```

---

## API Examples

### Invoke Chief of Staff
```typescript
POST /api/agents/chief-of-staff/brief
{
  "userId": "user_123",
  "timeframe": "today",
  "includeCalendar": true,
  "includeInbox": true,
  "includeTasks": true
}

Response:
{
  "briefing": {
    "topPriorities": [
      {
        "title": "Board deck review",
        "urgency": "high",
        "deadline": "2025-11-20T14:00:00Z",
        "reasoning": "Due in 2 hours, CEO flagged as critical"
      },
      ...
    ],
    "meetingReadiness": {
      "nextMeeting": "Product strategy review",
      "startsIn": "30 minutes",
      "prepStatus": "ready",
      "preRead": "https://summit.local/docs/prod-strategy-q4.md"
    },
    "inboxSummary": {
      "urgent": 3,
      "canDelegate": 12,
      "lowPriority": 27
    }
  },
  "requestId": "req_abc123"
}
```

### Invoke COO
```typescript
POST /api/agents/coo/triage-incident
{
  "source": "monitoring",
  "description": "API latency p99 > 5s",
  "severity": "P2",
  "affectedServices": ["api-gateway", "graph-core"]
}

Response:
{
  "incident": {
    "id": "inc_789",
    "severity": "P2",
    "owner": "oncall-sre-team",
    "runbook": "https://summit.local/runbooks/api-latency",
    "estimatedImpact": "20% of API requests affected",
    "triageReasoning": "Assigned to SRE per on-call rotation, linked runbook for API latency issues"
  },
  "approvalRequired": false,
  "policyResult": {
    "allowed": true,
    "policy": "agents.archetypes.allow_coo_incident_triage"
  },
  "auditLogId": "audit_xyz"
}
```

### Invoke RevOps
```typescript
POST /api/agents/revops/analyze-pipeline
{
  "period": "current_quarter",
  "includeChurnRisk": true,
  "includeForecastVariance": true
}

Response:
{
  "pipelineHealth": {
    "score": 72,
    "issues": [
      {
        "type": "stale_opportunity",
        "count": 8,
        "totalValue": "$450K",
        "recommendation": "Reach out to update status or close"
      },
      {
        "type": "missing_close_date",
        "count": 3,
        "totalValue": "$180K",
        "recommendation": "Add close dates for forecast accuracy"
      }
    ]
  },
  "forecastVariance": {
    "delta": "+$200K",
    "changes": {
      "new": "$350K",
      "moved_in": "$100K",
      "moved_out": "$150K",
      "won": "$200K",
      "lost": "$100K"
    }
  },
  "churnRisks": [
    {
      "accountId": "acc_456",
      "accountName": "Acme Corp",
      "arr": "$120K",
      "churnRiskScore": 0.72,
      "signals": ["declining_usage", "support_tickets_up", "no_executive_engagement_60d"],
      "recommendation": "Schedule executive business review, assign CSM"
    }
  ]
}
```

---

## Conclusion

These three agent archetypes—**Chief of Staff, COO, and RevOps**—provide immediate, tangible business value while showcasing Summit's unique strengths in governance, provenance, and AI-first architecture. They compete directly with Finna, Dotwork, and Soom while leveraging Summit's existing orchestration, approval, and policy infrastructure.

**Next:** Implement Phase 1 (Core Infrastructure) to enable rapid development of all three agents.
