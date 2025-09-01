# LLM-Driven Issue Orchestration System — Blueprint (v1)

## Goal

Build a production-ready orchestration system where AI agents coordinate with humans to triage, plan, implement, review, and ship work across Jira/GitHub/Linear/Asana, while keeping managers in control.

---

## Core Outcomes (OKRs)

- **O1: Cut lead time** from “issue opened → PR merged” by **30%** within 60 days.
- **O2: Raise throughput** (issues closed / week) by **25%** with equal or better quality (defect escape rate ≤ baseline).
- **O3: Reduce PM/Eng manager coordination time** by **50%** (Slack/meetings → agent updates).

Key metrics: cycle time, WIP, flow efficiency, blocked-time, PR review latency, reopen rate, NPS from devs.

---

## High-Level Architecture

```
┌──────────────┐         ┌─────────────────┐        ┌───────────────────────┐
│ Human UIs     │  Slack  │  Orchestrator   │  HTTP  │  Connectors            │
│ (Slack/Email/ │ <──────>│  (FastAPI+RQ)   │<──────>│  Jira / GitHub / CI/CD │
│  Web Console) │         └─────────────────┘        └───────────────────────┘
│                Events/Tasks  │                         ▲          ▲
└──────────────┘───────────────┼─────────────────────────┘          │
                                ▼                                    │
                           ┌────────┐                          Webhooks/Events
                           │ Queue  │ (Redis/RQ or Celery)           │
                           └───┬────┘                                │
                               │                             ┌─────────────────┐
                               ▼                             │ Observability   │
                        ┌──────────────┐                     │ (Langfuse+DB)  │
                        │ Agent Fleet  │                     └─────────────────┘
                        │ (stateless)  │
                        └──────────────┘
                          ▲   ▲   ▲
                          │   │   │
               ┌──────────┘   │   └───────────┐
               ▼              ▼               ▼
        Planner/Triage   Coder/Drafter   Reviewer/Tester

Vector Store (pgvector) + Postgres for memory, roles, projects, RAG
```

---

## Agents & Responsibilities (RACI)

- **Intake/Triage Agent (R)**: parses new issues, deduplicates, tags, estimates complexity, routes.
- **Planner Agent (R)**: converts issues → EPICs/Stories/Tasks, drafts acceptance criteria, dependencies.
- **Feasibility Agent (C)**: quick spike, flags risk & missing info.
- **Assigner Agent (A/R)**: maps work to people (skills, capacity, timezone), proposes backlog order.
- **Coder/Drafter Agent (R)**: scaffolds code/PRs, migration stubs, docstrings.
- **Reviewer Agent (C)**: static analysis hints, review checklists, summarizes diffs for humans.
- **Tester Agent (R)**: generates/updates tests, proposes CI jobs.
- **Release/Changelog Agent (R)**: composes release notes, user-facing summaries.
- **PM Console Agent (S)**: daily reports, burn-up/burndown, risk radar.

Humans remain **A** (Accountable) for merge/release decisions.

---

## Workflows (Happy Paths)

### A) New Issue → Planned

1. Webhook from Jira/GitHub issue created.
2. Intake dedup + classify (bug/feature/chore).
3. Planner drafts: user story, acceptance criteria, tasks, dependencies.
4. Assigner proposes owner + sprint slot; PM approves via Slack buttons.

### B) PR Assist

1. Dev opens PR → Reviewer Agent posts checklist & summarizes changes.
2. Tester Agent proposes tests or failing cases from coverage report.
3. Human reviewer approves/requests changes.

### C) Release Notes

1. On tag push, Release Agent compiles PR titles + labels → coherent notes.

---

## Data Model (Postgres + pgvector)

```sql
-- Projects, People, Issues, Tasks, Actions
projects(id, name, key, default_repo, default_board)
people(id, handle, email, skills jsonb, capacity int, timezone)
issues(id, external_id, source, title, body, labels text[], state, priority, created_at, updated_at)
plans(id, issue_id, summary, acceptance jsonb, estimate, dependencies jsonb)
tasks(id, plan_id, title, description, owner_id, status, due_at)
actions(id, subject_type, subject_id, agent, action, payload jsonb, created_at)
embeddings(id, object_type, object_id, vec vector(1536))
```

---

## Connectors (minimal viable)

- **Jira/Linear**: REST for issues, transitions, comments.
- **GitHub/GitLab**: Issues, PRs, reviews, checks, commit diffs.
- **CI**: status webhooks → feed Tester insights.
- **Slack**: interactive approvals (Approve / Needs Info / Reassign).

---

## Guardrails & Policy

- **Human-in-the-loop** for scope, estimates, merges.
- **Read-only by default**; write actions require explicit approval.
- **Audit log**: every agent action recorded in `actions`.
- **PII/code secrecy**: org-scoped keys, repo allowlist, no external data egress without approval.

---

## Prompts (starter templates)

**Planner**

```
System: You draft engineering plans. Return JSON only.
User: Issue: "{title}\n{body}". Output fields: story, acceptance[], tasks[], risks[], dependencies[], estimate (t-shirt).
```

**Reviewer**

```
System: You review PRs for correctness and clarity. Be concise.
User: Diff summary: {diff_summary}. Repo rules: {rules}. Output: findings[], severity, checklists[], files_to_focus[].
```

**Assigner**

```
System: You propose the best assignee and sprint based on skills & capacity.
User: Task: {task}. People: {people_json}. Constraints: {constraints}. Output JSON: assignee_id, rationale, suggested_sprint.
```

---

## API Sketch (FastAPI)

```http
POST /webhooks/github          # issues, PRs, reviews
POST /webhooks/jira            # issue created/updated
POST /commands/slack           # interactive actions
POST /orchestrate/{issue_id}   # manual trigger
GET  /reports/daily            # PM digest
```

---

## Orchestrator Pseudocode

```python
@app.post('/webhooks/jira')
def on_issue(event):
    issue = upsert_issue(event)
    enqueue('triage', issue_id=issue.id)

@worker('triage')
def triage(issue_id):
    cls = intake_classify(issue_id)
    plan = call_agent('planner', issue=issue)
    save_plan(plan)
    proposal = call_agent('assigner', plan=plan, people=load_people())
    post_slack_approval(proposal)

@app.post('/commands/slack')
def on_slack(cmd):
    if cmd.action == 'approve_assignment':
        assign_and_update_jira(cmd.issue_id, cmd.assignee)
```

````

---

## MVP Scope (2 sprints)
**Sprint 1 (2 weeks)**
- GitHub + Slack integration, Intake → Planner → Slack approval.
- Store plans in Postgres; daily PM digest.

**Sprint 2 (2 weeks)**
- Add Assigner + Reviewer (PR summary + checklist).
- Basic Tester suggestions from diff & coverage.

Stretch: Release Agent & Jira connector.

---

## Quality & Evaluation
- **Shadow mode**: agents comment only; compare against human decisions.
- **A/B**: half of issues use Planner; measure plan acceptance & rework.
- **Defect tracking**: link escaped bugs to originating plans.

---

## Security & Compliance
- SSO (SAML/OIDC). Per-connector service accounts.
- Secrets via Vault/Parameter Store. Least-privilege scopes.
- Redaction middleware for logs. Opt-out projects.

---

## Cost Controls
- Cache LLM calls (Redis) keyed by prompt hash.
- Use small models for classify/summarize; route up to bigger only when needed.
- Batch operations (e.g., label multiple issues in one call).

---

## Risks & Mitigations
- **Hallucinated steps** → enforce JSON schema, validate with linters.
- **Over-assignment** → capacity model + WIP limits per person.
- **Tool drift** → nightly sync jobs reconcile states.

---

## Next Steps (Actionable)
1. Provision: Postgres+pgvector, Redis, FastAPI skeleton.
2. Implement GitHub + Slack connectors.
3. Ship Planner agent w/ JSON schema validation.
4. Run shadow mode on one repo for 1 week; review metrics.
5. Expand to Assigner + Reviewer.

---

## Appendix: Example JSON Schemas
```json
{
  "$id": "planner.schema.json",
  "type": "object",
  "required": ["story", "acceptance", "tasks", "estimate"],
  "properties": {
    "story": {"type": "string"},
    "acceptance": {"type": "array", "items": {"type": "string"}},
    "tasks": {"type": "array", "items": {"type": "string"}},
    "risks": {"type": "array", "items": {"type": "string"}},
    "dependencies": {"type": "array", "items": {"type": "string"}},
    "estimate": {"type": "string", "enum": ["XS","S","M","L","XL"]}
  }
}
````

