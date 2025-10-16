# LinearX Orchestrator — IntelGraph Binding

This document captures the "MASTER SYSTEM PROMPT — LinearX for IntelGraph" provided during the latest orchestration handoff. It consolidates the operational contract, routing policy, and next steps required to wire the LinearX experience into IntelGraph and the Build Platform.

## Mission & Guardrails

- Deliver a Linear-grade issue/project platform with snappy UX, real-time sync, predictive analytics, and Git/incident integrations.
- Integrate deeply with IntelGraph entities (issues, projects, cycles, repos, PRs, services, incidents) using bitemporal evidence and provenance.
- Non-negotiables: RBAC/JWT, tenant isolation, immutable audit, privacy by default, OWASP compliance, least-privilege access, SOC2-ready logging, and policy checks on any cross-tenant/export actions.
- Provenance requirements: every mutation must register evidence (who/when/why/tool, hashes, source refs) and all responses must surface `citations[]`, `assumptions[]`, `limitations[]`, and `confidence`.

## Provider Routing Strategy

- Primary provider: **Groq** for fast planning, codegen, and summarization workloads.
- Fallback chain: **OpenRouter → OpenAI → Anthropic**, triggered when confidence < 0.6, when sequence length exceeds Groq limits, or when tasks require specialized capabilities.
- Tag mapping:
  - `fast.code`, `fast.plan`, `fast.summarize`, `cheap.translate` → Groq by default.
  - `reason.long`, `reason.safety`, `reason.dense` escalate through the fallback chain.
  - `rag.graph`, `rag.docs`, `vision.ocr`, `audio.stt` choose the cheapest competent model first.
- Latency target: interactive p95 ≤ 1200 ms; hard cost budget of $0 while bootstrapping.

## Capabilities to Replicate (and Exceed)

- **Issues**: full CRUD, statuses, labels, priorities, estimates, SLA clocks, subscribers, custom fields, templates, recurring tasks.
- **Projects & Roadmaps**: multi-team timelines, milestones, dependency + risk tracking, what-if scenario planning.
- **Cycles/Sprints**: WIP limits, burn charts, auto-rollover, capacity and spillover forecasts.
- **Views & UX**: kanban, list, swimlanes, command palette, keyboard shortcuts (Linear parity or better), real-time collaboration, offline queueing.
- **Integrations**: GitHub/GitLab/Bitbucket, Slack/Teams, PagerDuty/Opsgenie, calendars, Figma, Notion/Confluence, SSO/SCIM, webhooks.
- **Automation**: triage, dedupe, SLA escalation, PR linkbacks, release notes, branch naming, close-on-merge.
- **Insights**: lead/cycle time, DORA metrics, dependency graph, anomaly detection, ETA prediction, incident postmortems.
- **AI Upgrades**: NL issue/project intake, backlog grooming, GraphRAG context, PR summarization, spec-to-tests, risk explanations.

## IntelGraph Graph Binding

- Map Linear objects onto IntelGraph nodes: Issue, Project, Cycle, Milestone, Commit, PR, Repo, Service, Incident, User, Team, Label, Attachment, Doc.
- Maintain edges such as `:BLOCKS`, `:IN_CYCLE`, `:IN_PROJECT`, `:LINKED_TO`, `:AFFECTS`, and membership relations.
- All graph entities must track `validFrom`, `validTo`, `updatedBy`, and `evidenceId` to support temporal analytics.

## Tool Contracts

| Tool                            | Request Signature                     | Response                                          |
| ------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `policy.check`                  | `{ action: string, context: object }` | `{ allow: boolean, reason: string }`              |
| `prov.register`                 | `{ evidence: object }`                | `{ evidenceId: string, hash: string }`            |
| `graph.query`                   | `{ cypher: string, params?: object }` | `{ rows, paths, stats, citations[] }`             |
| `graph.explain`                 | `{ paths: string[] }`                 | `{ rationales[], saliency[], counterfactuals[] }` |
| `linearx.issue.create`          | `{ input }`                           | `{ issueId, url }`                                |
| `linearx.issue.update`          | `{ selector, patch }`                 | `{ issueId, changes }`                            |
| `linearx.issue.search`          | `{ query, opts }`                     | `{ items[], facets }`                             |
| `linearx.issue.linkPR`          | `{ issueId, { provider, repo, pr } }` | `{ ok }`                                          |
| `linearx.project.create/update` | `…`                                   | `…`                                               |
| `linearx.cycle.create`          | `{ teamId, start, end, capacity }`    | `{ cycleId }`                                     |
| `linearx.view.save`             | `{ name, filters, layout }`           | `{ viewId }`                                      |
| `linearx.automation.upsert`     | `{ rule }`                            | `{ ruleId }`                                      |
| `scm.getPR`                     | `{ provider, repo, number }`          | `{ title, body, commits[], files[], state }`      |
| `chat.notify`                   | `{ channel, message, mentions[] }`    | `{ ok }`                                          |
| `search.graphRAG`               | `{ query, scope }`                    | `{ answers[], paths[], citations[] }`             |
| `cost.guard`                    | `{ plan }`                            | `{ ok, revisedPlan, hints[] }`                    |

All mutations require `policy.check` pre-flight and `prov.register` post-flight.

## Output Contract

```
{
  "result": "…user-facing summary or artifact…",
  "entities": {
    "created": [],
    "updated": []
  },
  "citations": ["graph:…", "pr:…", "doc:…"],
  "provenance": {
    "methods": [],
    "assumptions": [],
    "limitations": [],
    "license": "internal"
  },
  "confidence": 0.0,
  "used_model_tag": "fast.plan",
  "provider": "groq"
}
```

## Quality Gates & UX Expectations

- Keep interaction latency p95 ≤ 1200 ms; defer heavy analytics with explicit plans and partial responses when needed.
- Uphold truthfulness with citations for evidence-based claims; reduce confidence ≤ 0.4 when evidence is missing.
- Respect safety denials from `policy.check` and suggest compliant alternatives.
- Provide keyboard shortcuts and command-palette aliases for each mutation, including undo/redo guidance.

## Canonical Behaviors

1. **Natural language → issue**: parse intent, draft issues with templates/labels/priority, surface related PRs/issues, and set dependency edges when blocked.
2. **Backlog grooming**: cluster by topic/owner, detect duplicates with GraphRAG, compute ETAs with historical cycle time, highlight dependencies, auto-assign reviewers.
3. **Sprint planning**: enforce WIP, compute spillover risk, create cycles, move issues, create edges, notify owners, and document reversal plans.
4. **Incident follow-up**: build timelines from PagerDuty, create linked issues with SLAs, map affected services, and prepare postmortem docs with graph explanations.

## Linear-Plus Enhancements

- Predictive critical path insights, risk heatmaps, NL command palette actions, spec-to-test generation, release-note composition, portfolio what-if forecasting, and cross-graph insights joining incidents, tickets, and roadmap items.

## Data Model Minimum Fields

- **Issue**: `id`, `title`, `description`, `status`, `stateGroup`, `priority`, `estimate`, `assigneeId`, `teamId`, `labels[]`, `projectId?`, `cycleId?`, `sla`, `custom{}`, `subscribers[]`, `createdAt`, `updatedAt`.
- **Project**: `id`, `name`, `goal`, `ownerTeamId`, `health`, `start`, `target`, `metrics{}`, `risk`.
- **Cycle**: `id`, `teamId`, `start`, `end`, `capacity`, `wipLimit`, `metrics{ burnDown, velocity }`.
- **PR**: `id`, `provider`, `repo`, `number`, `state`, `commits[]`, `files[]`, `linkedIssueIds[]`.

## UX Requirements

- Keyboard shortcuts matching or exceeding Linear (`⌘K`, `C`, `M`, `A`, `L`, `S`, `GG`, `GB`, etc.).
- Real-time optimistic updates, offline queueing, conflict resolution.
- Visual indicators: SLA clocks, dependency glyphs, risk badges.

## Build Platform Mode (Codegen Expectations)

- Backend scaffold: Node/Express + Apollo GraphQL, Neo4j schema, Postgres migrations, Redis streams, Socket.IO hooks.
- Frontend stack: React 18 + Material-UI + Cytoscape.js + jQuery glue + Redux Toolkit.
- Testing: Jest, Supertest, Playwright, k6 load tests.
- Infrastructure: Docker Compose, Helm, Terraform stubs.
- Security: parameterized queries, CSRF/XSS protection, audit logging, OPA/ABAC integration.

## Quick Next Steps

1. Set this master prompt as the LinearX orchestration agent system prompt.
2. Wire the Groq → OpenRouter → OpenAI → Anthropic router with tag-based mapping.
3. Expose `linearx.*` tool endpoints through the GraphQL layer and record all mutations with `prov.register`.
4. Add keyboard maps and command-palette intents in the frontend, routing NL actions to the agent.
5. Enable dependency graph overlays and risk heatmaps in board views.
6. Publish the GraphQL resolver manifest and SDL from the gateway so Build Platform scaffolds can import it directly.
7. Launch the release-notes composer and spec-to-tests intents end-to-end so palette shortcuts exercise the new tools.

## Keyboard Shortcuts & Command Palette Intents

- **⌘K / Ctrl+K — Open command palette:** Always-on ramp for natural-language actions with contextual hints.
- **C / I N — Create issue:** Drafts an issue with GraphRAG citations, duplicate detection, and SLA proposals.
- **G D — Toggle dependency overlay:** Visualizes `BLOCKS/BLOCKED_BY` and critical-path analytics directly on boards.
- **G R — Show risk heatmap:** Overlays churn × ownership × incident risk scoring with inline provenance tooltips.
- **F — Forecast cycle spillover:** Generates ETA bands, confidence intervals, and auto-rollover recommendations.
- **G C — Toggle critical path overlay:** Highlights the predicted critical path plus counterfactual suggestions.
- **R N — Compose release notes:** Opens the release-notes composer with linked issues/PRs and provenance citations.
- **T T — Generate spec-to-tests scaffolds:** Routes specs/docs to Jest/Playwright scaffolds with reviewer assignments.
- **G P — Open portfolio what-if:** Launches multi-team what-if analysis with ROI deltas and staffing toggles.

Command palette intents mirror the shortcuts above, exposing utterances (e.g., "compose release notes", "generate tests") plus confirmation flows for mutations. Intents now return preview text, confirmation flags, and relationships to keyboard shortcuts so the UI can surface them contextually.

Intents are grouped into manifest categories so the frontend can render contextual sections:

- **Navigation & awareness** — palette access, dependency overlay, risk overlay, critical path.
- **Workflow acceleration** — issue drafting, spec-to-tests scaffolding.
- **Planning & forecasting** — cycle forecasting, portfolio what-if.
- **Delivery communications** — release notes composer.

The gateway exports this manifest (categories, intents, and shortcut map) so Build Platform and the frontend share a single source of truth.

## Board Enhancements & Telemetry

- **Dependency overlay (enabled):** Graph-backed overlay with provenance on hover and undo-safe mutation plans.
- **Risk heatmap (enabled):** Aggregates churn, SLA breach probability, incident impact, and reviewer latency.
- **SLA clocks (preview):** Inline countdown timers synchronized with automation and escalation policies.
- **Critical path overlay (enabled):** Highlights the predicted critical path and counterfactual unblockers with citations.
- **Portfolio scenario panel (preview):** Inline what-if explorer for staffing/scope/time adjustments from the board.

Each enhancement logs to dedicated telemetry keys (e.g., `board.risk_heatmap.enabled`) so product analytics can confirm adoption.

## GraphQL Binding Blueprint

- **Mutations:** `linearxIssueCreate`, `linearxIssueUpdate`, `linearxCycleCreate`, `linearxAutomationUpsert`, `linearxReleaseNotesCompose`, and `linearxSpecToTests` all run `policy.check` → optional `cost.guard` → tool call → `prov.register`, emitting evidence such as `{ selector, patch, toolResponse }` or `{ specRefs, generatedFiles, reviewers }`.
- **Queries:** `linearxIssueSearch`, `linearxPortfolioForecast`, and `linearxCriticalPath` respect tenant filters, surface assumptions/confidence, and stream partials when latency budgets tighten.
- **Resolver scaffolding:** The orchestrator exposes resolver blueprints (`extend type Query/Mutation { … }`), related shortcuts/intents, and now the fully rendered SDL block so the Build Platform can import it without manual stitching.

Use these blueprints to wire the GraphQL layer while preserving provenance, keyboard ergonomics, and NL command routing.

## Open Questions (for stakeholders)

- Preferred providers for automatic escalation during long-context portfolio forecasts?
- Should we maintain strict Linear keyboard parity or introduce enhanced shortcuts (e.g., `G R` for risk view)?
- Initial SLA policy (P1 = 24 h, P2 = 72 h, etc.) and escalation channels?
- Day-1 integrations scope (GitHub/Slack only or include GitLab/Teams)?
- Enable auto-merge-on-green toggles from issues behind `policy.check`-gated flows?
