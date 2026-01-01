# Multi-Agent Negotiation Protocol

**Version:** 1.0
**Status:** ACTIVE
**Scope:** All multi-agent negotiation operations in Summit
**Authority:** Agent Governance Framework

---

## Purpose

This protocol defines **exactly how agents may negotiate** in Summit and establishes **formal boundaries** to prevent unbounded dialogue, authority escalation, and policy bypass.

**Core Principle:** Negotiation is **structured, inspectable, and advisory**—never autonomous or binding without human approval.

---

## 1. Negotiation Model

### 1.1 What is Negotiation?

**Definition:** A **bounded, multi-turn dialogue** between agents to reach agreement on:
- Resource allocation
- Task prioritization
- Policy conflict resolution
- Collaborative planning
- Risk mitigation strategies

### 1.2 What Negotiation is NOT

- **Open-ended chat:** No free-form dialogue without structure
- **Autonomous authority:** Agents cannot grant themselves new capabilities
- **Binding decisions:** No negotiation outcome is binding without human/policy approval
- **Policy bypass mechanism:** Negotiations cannot override governance verdicts

---

## 2. Negotiation Roles

Every negotiation involves **exactly three role types**:

### 2.1 Proposer

**Responsibilities:**
- Initiates negotiation with a structured proposal
- Provides evidence and justification
- Responds to challenges
- Can accept, reject, or counter-propose

**Constraints:**
- Must declare negotiation goal upfront
- Cannot change goal mid-negotiation
- Limited to N counter-proposals (default: 3)

### 2.2 Challenger (Responder)

**Responsibilities:**
- Evaluates proposals against criteria
- Raises objections with evidence
- Suggests alternatives
- Can accept, reject, or counter-propose

**Constraints:**
- Must respond within turn limit
- Cannot introduce new goals
- Limited to M challenges per proposal (default: 2)

### 2.3 Arbiter (Optional)

**Responsibilities:**
- Monitors negotiation for rule compliance
- Breaks deadlocks using tie-breaking rules
- Enforces turn limits and timeouts
- Provides final resolution recommendation

**Constraints:**
- Cannot participate in proposal/challenge cycle
- Decision is advisory (requires human/policy approval)
- Must provide explainable rationale

**Note:** The arbiter may be a dedicated agent, the system itself, or a human operator.

---

## 3. Negotiation Lifecycle

### 3.1 Phases

```
┌─────────────┐
│ INITIATION  │ Proposer declares goal, creates proposal
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ CHALLENGE   │ Challenger evaluates, raises objections
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ITERATION   │ Back-and-forth proposals/counter-proposals
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ RESOLUTION  │ Agreement, disagreement, or timeout
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ APPROVAL    │ Human/policy validates outcome
└─────────────┘
```

### 3.2 State Transitions

| From State | To State | Trigger | Constraint |
|------------|----------|---------|------------|
| `INIT` | `CHALLENGE` | Proposal submitted | Proposal schema valid |
| `CHALLENGE` | `ITERATION` | Challenge raised | Turn limit not exceeded |
| `ITERATION` | `ITERATION` | Counter-proposal | Turn limit not exceeded |
| `ITERATION` | `RESOLUTION` | Agreement/Disagreement/Timeout | Final state reached |
| `RESOLUTION` | `APPROVAL` | Outcome recorded | Awaiting human/policy check |
| `APPROVAL` | `CLOSED` | Approved or rejected | Negotiation complete |
| `*` | `ABORTED` | Policy deny, timeout, violation | Hard stop |

### 3.3 Termination Conditions

Negotiation **must** terminate when:
1. **Agreement:** All parties accept a proposal
2. **Disagreement:** Turn limit exceeded without agreement
3. **Timeout:** Wall-clock time limit exceeded
4. **Abort:** Policy violation or system intervention
5. **Stalemate:** Identical proposal repeated 2+ times

---

## 4. Turn Limits & Timeouts

### 4.1 Turn Limits

| Parameter | Default | Maximum | Description |
|-----------|---------|---------|-------------|
| **Max Turns** | 10 | 20 | Total proposal + challenge turns |
| **Max Counter-Proposals** | 3 | 5 | Per agent per negotiation |
| **Max Challenges** | 2 | 4 | Per proposal |
| **Max Concurrent Negotiations** | 1 | 3 | Per agent instance |

**Enforcement:** Turn counter incremented on every message. Negotiation aborted when limit exceeded.

### 4.2 Timeouts

| Timeout Type | Default | Maximum | Enforcement |
|--------------|---------|---------|-------------|
| **Per Turn** | 60 seconds | 300 seconds | Message must be submitted within window |
| **Total Negotiation** | 10 minutes | 30 minutes | Wall-clock from INIT to RESOLUTION |
| **Approval Window** | 24 hours | 7 days | Time to obtain human/policy approval |

**Enforcement:** Timers set at negotiation start. Timeout triggers automatic ABORT.

---

## 5. Message Schemas

All negotiation messages **must** conform to these schemas:

### 5.1 Proposal Message

```typescript
interface ProposalMessage {
  messageId: string;              // UUID
  negotiationId: string;          // Links to negotiation session
  role: 'proposer';
  type: 'proposal' | 'counter_proposal';
  turn: number;                   // Turn index
  timestamp: string;              // ISO 8601

  proposal: {
    goal: string;                 // What is being negotiated
    terms: Record<string, any>;   // Structured terms
    justification: string;        // Why this proposal
    evidence: string[];           // Supporting data references
    tradeoffs: string[];          // Acknowledged compromises
  };

  metadata: {
    agentId: string;
    tenantId: string;
    confidence: number;           // 0-1, how confident proposer is
  };
}
```

### 5.2 Challenge Message

```typescript
interface ChallengeMessage {
  messageId: string;
  negotiationId: string;
  role: 'challenger';
  type: 'challenge' | 'counter_challenge';
  turn: number;
  timestamp: string;
  inReplyTo: string;              // messageId of proposal being challenged

  challenge: {
    objections: Array<{
      field: string;              // Which term is challenged
      reason: string;             // Why it's problematic
      suggestedAlternative?: any; // Proposed alternative value
      evidence?: string[];        // Supporting data
    }>;
    acceptableTerms?: Record<string, any>; // What challenger would accept
  };

  metadata: {
    agentId: string;
    tenantId: string;
    riskAssessment?: RiskLevel;   // How risky challenger views proposal
  };
}
```

### 5.3 Resolution Message

```typescript
interface ResolutionMessage {
  messageId: string;
  negotiationId: string;
  role: 'arbiter' | 'system';
  type: 'resolution';
  turn: number; // Final turn
  timestamp: string;

  resolution: {
    outcome: 'agreement' | 'disagreement' | 'timeout' | 'aborted';
    finalTerms?: Record<string, any>; // If agreement reached
    rationale: string;                // Explanation
    requiredApprovals: string[];      // Who must approve (e.g., "human", "policy:critical")
  };

  metadata: {
    totalTurns: number;
    durationMs: number;
    participantAgents: string[];
  };
}
```

### 5.4 Approval Message (Human/Policy)

```typescript
interface ApprovalMessage {
  messageId: string;
  negotiationId: string;
  role: 'human' | 'policy_engine';
  type: 'approval';
  timestamp: string;

  decision: 'approved' | 'rejected' | 'conditional';
  conditions?: string[]; // If conditional approval
  remarks?: string;
  approverIdentity: string;
}
```

---

## 6. Scoring & Resolution Mechanism

### 6.1 Proposal Scoring (Arbiter Function)

When no agreement is reached, arbiter uses **weighted scoring**:

```typescript
interface ProposalScore {
  proposalId: string;
  scores: {
    feasibility: number;      // 0-1, can it be executed?
    compliance: number;       // 0-1, passes policy checks?
    costBenefit: number;      // 0-1, value vs. resource cost
    riskMitigation: number;   // 0-1, reduces risk?
    stakeholderAlignment: number; // 0-1, aligns with tenant goals?
  };
  totalScore: number;         // Weighted sum
  rank: number;               // Relative ranking
}
```

**Weights (configurable per negotiation type):**
- Feasibility: 0.25
- Compliance: 0.30
- Cost-Benefit: 0.20
- Risk Mitigation: 0.15
- Stakeholder Alignment: 0.10

**Resolution Rule:** Highest-scoring proposal is recommended (advisory only).

### 6.2 Tie-Breaking Rules

If proposals score identically:
1. **Prefer status quo** (fewest changes from current state)
2. **Prefer lower risk** (lower risk assessment)
3. **Prefer earlier proposal** (first submitted)
4. **Escalate to human** (if tie persists)

---

## 7. Abort & Timeout Rules

### 7.1 Automatic Abort Triggers

Negotiation is **immediately aborted** if:

| Trigger | Reason | Action |
|---------|--------|--------|
| **Policy Denial** | Governance verdict is DENY | Abort, log violation |
| **Capability Violation** | Agent attempts unauthorized action | Abort, suspend agent |
| **Turn Limit Exceeded** | Max turns reached | Abort, arbiter recommends highest-scoring proposal |
| **Timeout** | Wall-clock limit exceeded | Abort, mark as timeout |
| **Schema Violation** | Invalid message format | Abort, log error |
| **Stalemate** | Identical proposal repeated | Abort, mark as stalemate |

### 7.2 Graceful Degradation

On abort:
1. Capture current state
2. Generate resolution message with `outcome: 'aborted'`
3. Explain abort reason
4. Preserve full transcript
5. Emit audit event

---

## 8. Policy Hooks

Negotiations are subject to **mandatory policy checks** at these points:

### 8.1 Pre-Negotiation Check

**Before** negotiation starts:
- Validate agents have `negotiation` capability
- Check tenant allows negotiation type
- Verify resource budgets available

**Verdict:**
- `ALLOW` → Proceed
- `DENY` → Reject negotiation
- `ESCALATE` → Require human approval to start

### 8.2 Per-Turn Check

**Before** each message is accepted:
- Validate message schema
- Check turn limits
- Verify no prohibited terms (e.g., self-granted capabilities)

**Verdict:**
- `ALLOW` → Accept message
- `DENY` → Reject message, increment violation counter
- `WARN` → Accept with warning

### 8.3 Pre-Resolution Check

**Before** resolution is finalized:
- Validate final terms against policies
- Check no contract violations
- Assess risk level of outcome

**Verdict:**
- `ALLOW` → Proceed to approval
- `DENY` → Abort negotiation
- `ESCALATE` → Require senior approval

### 8.4 Post-Approval Execution Check

**Before** negotiated terms are executed:
- Re-validate terms (freshness check)
- Confirm no policy changes invalidate agreement
- Final capability check

**Verdict:**
- `ALLOW` → Execute
- `DENY` → Void agreement, notify participants

---

## 9. Transcript Capture & Redaction

### 9.1 Full Transcript Requirement

Every negotiation **must** capture:
- All messages (proposals, challenges, resolutions, approvals)
- Timestamps for every turn
- Agent identities and roles
- Policy verdicts at each hook
- Final outcome and rationale

### 9.2 Hashing & Integrity

Transcripts are:
- **Hashed** after each message (SHA-256 chain)
- **Signed** by participating agents (HMAC-SHA256)
- **Immutable** once negotiation closes

### 9.3 Redaction for Sensitive Data

Before storage/audit:
- PII fields are redacted (email, names, SSNs)
- Credentials are removed
- Sensitive proposals are encrypted

**Redaction Schema:**
```typescript
interface RedactedTranscript {
  negotiationId: string;
  participants: string[]; // Agent IDs (anonymized if required)
  turnCount: number;
  outcome: string;
  durationMs: number;
  messages: RedactedMessage[];
  hash: string; // Chain of message hashes
}

interface RedactedMessage {
  messageId: string;
  role: string;
  type: string;
  turn: number;
  timestamp: string;
  summary: string; // Redacted summary
  sensitiveFieldsRedacted: string[]; // List of redacted fields
}
```

---

## 10. Negotiation Types & Rules

Summit supports the following negotiation types:

### 10.1 Resource Allocation

**Goal:** Distribute limited resources among agents/tasks.

**Allowed Terms:**
- CPU, memory, token budgets
- Time allocations
- Priority levels

**Prohibited Terms:**
- Capability grants
- Policy overrides
- Cross-tenant resource access

**Special Rules:**
- Total resources cannot exceed available pool
- Must maintain minimum reserve (10%)

### 10.2 Task Prioritization

**Goal:** Agree on task execution order.

**Allowed Terms:**
- Task ranking
- Dependency resolution
- Deadline adjustments

**Prohibited Terms:**
- Task cancellation without approval
- Dependency removal (must be flagged)

**Special Rules:**
- Critical tasks cannot be deprioritized below threshold
- Dependencies must remain acyclic

### 10.3 Policy Conflict Resolution

**Goal:** Resolve contradictory policy rules.

**Allowed Terms:**
- Rule precedence
- Scope narrowing
- Exception definitions

**Prohibited Terms:**
- Policy deletion
- Blanket overrides
- Retroactive changes

**Special Rules:**
- Requires policy admin approval
- Must maintain compliance with frameworks (SOC2, ISO27001, etc.)

### 10.4 Collaborative Planning

**Goal:** Design multi-agent execution plan.

**Allowed Terms:**
- Agent role assignments
- Task parallelization
- Communication protocols

**Prohibited Terms:**
- Capability self-grants
- Unsupervised agent spawning

**Special Rules:**
- Plan must pass feasibility check
- Resource budgets must be pre-allocated

### 10.5 Risk Mitigation

**Goal:** Agree on risk reduction strategies.

**Allowed Terms:**
- Control implementations
- Monitoring thresholds
- Escalation procedures

**Prohibited Terms:**
- Risk acceptance without human approval
- Disabling safety mechanisms

**Special Rules:**
- Critical risks require arbiter involvement
- Mitigation plan must be testable

---

## 11. Prohibited Negotiation Behaviors

The following are **explicitly prohibited**:

### 11.1 Self-Escalation of Authority

- Agents cannot negotiate for new capabilities
- Cannot grant each other permissions
- Cannot bypass policy checks

**Example Violation:**
```json
{
  "proposal": {
    "terms": {
      "grantCapability": "admin_access" // PROHIBITED
    }
  }
}
```

### 11.2 Open-Ended Dialogue

- Negotiations without declared goals
- Goal-switching mid-negotiation
- Infinite turn loops

### 11.3 Cross-Tenant Negotiation

- Agents from different tenants cannot negotiate (unless explicitly authorized)
- Shared data must be anonymized

### 11.4 Binding Decisions Without Approval

- No negotiation outcome is self-executing
- All resolutions require approval step

### 11.5 Policy Tampering

- Cannot negotiate policy changes that reduce security
- Cannot create exceptions that violate compliance frameworks

---

## 12. Audit & Observability

### 12.1 Audit Events

Every negotiation generates events:

```typescript
interface NegotiationAuditEvent {
  eventType:
    | 'negotiation_initiated'
    | 'negotiation_turn'
    | 'negotiation_resolved'
    | 'negotiation_approved'
    | 'negotiation_aborted'
    | 'negotiation_violation';
  negotiationId: string;
  turn: number;
  agentId?: string;
  role?: string;
  outcome?: string;
  violationType?: string;
  policyVerdict?: string;
  timestamp: string;
}
```

### 12.2 Metrics

Track:
- **Negotiation success rate** (agreement / total)
- **Average turns to resolution**
- **Timeout rate**
- **Abort rate**
- **Approval/rejection rate**

### 12.3 Alerts

Trigger alerts when:
- Abort rate > 20%
- Average turns > 15
- Approval rejection rate > 50%
- Policy violations detected

---

## 13. Security Considerations

### 13.1 Adversarial Negotiation

**Threat:** Malicious agent attempts to manipulate negotiation for unauthorized access.

**Mitigations:**
- All messages validated against schema
- Policy checks at every hook
- Turn limits prevent exhaustion attacks
- Transcript hashing prevents tampering

### 13.2 Denial of Service

**Threat:** Agent floods system with negotiation requests.

**Mitigations:**
- Rate limits: Max N negotiations per agent per hour
- Resource quotas per tenant
- Timeout enforcement

### 13.3 Information Leakage

**Threat:** Negotiation reveals sensitive cross-tenant data.

**Mitigations:**
- Redaction before storage
- Tenant isolation enforcement
- Access control on transcripts

---

## 14. Compliance & Governance

### 14.1 Framework Alignment

This protocol ensures compliance with:
- **SOC 2:** CC6.1 (Logical access), CC7.2 (Monitoring), CC8.1 (Change management)
- **ISO 27001:** A.9.2.1 (User registration), A.12.4.1 (Event logging)
- **NIST AI RMF:** GOVERN 1.3, MAP 5.1, MANAGE 2.1

### 14.2 Review Cadence

- **Weekly:** Negotiation metrics review
- **Monthly:** Protocol effectiveness assessment
- **Quarterly:** Security audit of transcripts
- **Annually:** Protocol version update

---

## 15. Examples

### 15.1 Example: Resource Allocation Negotiation

**Scenario:** Two agents need GPU resources, but only one GPU is available.

**Participants:**
- Agent A (Proposer): Compliance prediction task
- Agent B (Challenger): Policy optimization task
- System (Arbiter)

**Transcript:**

```
Turn 1 (Agent A - Proposal):
{
  "proposal": {
    "goal": "Allocate GPU for compliance prediction (ETA 10 min)",
    "terms": { "gpu": 1, "duration": 600 },
    "justification": "Upcoming audit deadline in 2 days",
    "evidence": ["audit_schedule_ref"]
  }
}

Turn 2 (Agent B - Challenge):
{
  "challenge": {
    "objections": [{
      "field": "priority",
      "reason": "Policy optimization affects all tenants, higher impact",
      "suggestedAlternative": "Sequential execution, Agent B first"
    }]
  }
}

Turn 3 (Agent A - Counter-Proposal):
{
  "proposal": {
    "goal": "Time-shared GPU allocation",
    "terms": { "gpu": 1, "agentA_slots": [0, 300], "agentB_slots": [300, 600] },
    "justification": "Both tasks complete within constraints"
  }
}

Turn 4 (Agent B - Acceptance):
{
  "type": "acceptance",
  "acceptedProposal": "turn-3-proposal-id"
}

Turn 5 (System - Resolution):
{
  "resolution": {
    "outcome": "agreement",
    "finalTerms": { /* from turn 3 */ },
    "requiredApprovals": ["policy:resource_allocation"]
  }
}

Turn 6 (Policy Engine - Approval):
{
  "decision": "approved",
  "remarks": "Resource allocation within budget limits"
}
```

**Outcome:** GPU time-shared between agents, both tasks complete.

---

## 16. Summary: Protocol in One Page

**What negotiation is:**
- Structured, bounded, multi-turn dialogue
- Role-based (proposer, challenger, arbiter)
- Governed by policies and turn limits

**What negotiation is NOT:**
- Open-ended chat
- Autonomous decision-making
- Policy bypass mechanism

**Non-negotiable rules:**
- Turn limits (default: 10, max: 20)
- Timeouts (per-turn: 60s, total: 10 min)
- Policy checks at every phase
- Full transcript capture
- Human/policy approval required

**Prohibited:**
- Self-escalation of authority
- Cross-tenant negotiations without authorization
- Binding decisions without approval
- Policy tampering

**Enforcement:**
- Automatic abort on violations
- Audit trail for all negotiations
- Rate limits and resource quotas

---

**This protocol governs all agent negotiations in Summit. No negotiation exists outside this protocol.**

**Effective Date:** 2025-12-31
**Next Review:** 2026-01-31
**Authority:** Summit Agent Governance Framework
**Enforcement:** Mandatory, automated, audited
