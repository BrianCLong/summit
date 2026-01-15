# Taxonomy & Schema Definition

## 1. Hierarchy

### Initiative (Theme)
Top-level strategic grouping. Example: "GA Readiness", "Security Hardening".
- Maps to: Jira Project / Linear Project / Notion Database Property

### Epic
Mid-level deliverable. Example: "RBAC Implementation", "Multi-LLM Orchestration".
- Maps to: Jira Epic / Linear Project (or big issue) / Notion Page

### Story / Task
Atomic unit of work. Deliverable within a sprint.
- Maps to: Jira Story / Linear Issue / Notion Item

### Sub-task
Implementation detail.
- Maps to: Jira Sub-task / Linear Sub-issue / Notion Checkbox

## 2. Classification

### Priority
| Level | Description | SLA |
|-------|-------------|-----|
| **P0** | Critical. Blocker for release or major outage. | 24h |
| **P1** | High. Must have for upcoming milestone. | Sprint |
| **P2** | Medium. Nice to have, or technical debt. | Quarter |
| **P3** | Low. Backlog candidate. | Best Effort |
| **P4** | Backlog. Unscheduled ideas. | N/A |

### Status
- **Backlog**: Not started, not scheduled.
- **Todo**: Scheduled for current cycle.
- **In Progress**: Active development.
- **In Review**: PR open / QA.
- **Done**: Merged and verified.
- **Canceled**: Won't do.

### Domains (Labels)
- `Infrastructure`: Cloud, K8s, Terraform
- `Security`: Auth, Crypto, Compliance
- `AI/ML`: Models, RAG, Prompts
- `UI/UX`: Frontend, Design
- `DevOps`: CI/CD, Tooling
- `Data`: DB, Schema, Migrations

## 3. Data Schema (JSON)

```json
{
  "id": "SUM-1234",
  "title": "Implement WebAuthn support",
  "description": "Full description with ACs",
  "status": "In Progress",
  "priority": "P1",
  "type": "Story",
  "labels": ["Security", "Auth"],
  "assignee": "jules@example.com",
  "estimate": 3,
  "sprint": "Sprint 25",
  "created_at": "2023-10-27T10:00:00Z"
}
```

## 4. Integration Strategy

### Linear <-> Jira
- **Sync Direction**: Bidirectional for Status; One-way (Linear -> Jira) for Title/Desc.
- **Field Mapping**:
  - Linear `State` -> Jira `Status`
  - Linear `Priority` -> Jira `Priority`
  - Linear `Estimate` -> Jira `Story Points`

### Linear <-> GitHub
- **Trigger**: PR Open/Close/Merge
- **Action**: Move Linear issue to In Review / Done.
- **Convention**: PR Title must contain `[SUM-1234]`.
