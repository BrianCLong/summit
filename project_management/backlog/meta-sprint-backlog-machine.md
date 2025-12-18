# Meta-Sprint: Canonical Backlog + Delivery Machine

This playbook turns the current sprawl of promises, docs, and experiments into a single, enforced delivery system. It mirrors the four phases outlined by the requester and is ready to run immediately with GitHub Issues as the canonical backlog.

## Phase 0 – Guardrails (Canonical Backlog + Definition of Done)

### Canonical backlog
- **System of record:** GitHub Issues (one backlog project that aggregates issues across repos). Use the `summit-meta`/`companyos-meta` repo if a dedicated meta repo is required.
- **Standard fields:**
  - Title – concise, actionable.
  - Component/Initiative – Summit, CompanyOS, Maestro, Switchboard, IntelGraph, etc.
  - Epic – parent grouping.
  - Type – feature, tech_debt, spike, doc, ops.
  - Status – Idea → Ready → In Progress → In Review → In Prod → Validated.
  - Spec link – URL to RFC/design doc.
  - Acceptance criteria – bullet list of testable outcomes.
  - Evidence – tests/logs/demos/usage notes once delivered.

### Shared definition of “Totally Delivered”
Add this checklist to every issue (also wired into the backlog-item issue template):
- ✅ Code merged to `main`.
- ✅ Tests exist and pass (unit + at least one integration/E2E where applicable).
- ✅ Feature exposed via appropriate surface (UI/API/CLI).
- ✅ Docs updated (user-facing + internal runbook).
- ✅ Telemetry (metrics/logs/traces, feature flag wiring when used).
- ✅ Deployed to staging + prod.
- ✅ Validated with at least one real or simulated usage; feedback captured.

## Phase 1 – Capture the backlog from all sources (time-boxed discovery)

### Sources to sweep (3–5 day capture window)
- Docs & specs: Notion, Google Docs/Slides, `/docs`, `/design`, `/rfcs`, `/notes`, sprint plans, old roadmaps.
- Code & repos: `TODO`/`FIXME`/`XXX`/`HACK` comments, feature flags stuck in rollout, `v1`/`beta`/`experimental` modules.
- Issue trackers: existing GitHub/Linear issues (open + closed-won’t-fix that still matter), incomplete milestones.
- Conversations: ChatGPT threads, Slack/email threads, whiteboard photos/notes.

### Capture template (staging bucket)
Use `project_management/backlog/backlog-capture-template.csv` as the staging sheet. Columns:
- Raw Source (URL/path/thread)
- Rough Title
- Notes (copy/paste of the snippet)
- Confidence (High/Medium/Low)
- Scope class (Tiny/Small/Medium/Large/Epic)
- Component (Summit/CompanyOS/Maestro/Switchboard/IntelGraph/etc.)

### LLM-assisted extraction prompt
Use this prompt for each long doc/thread and paste the JSON rows into the staging CSV or pipe into an issue-creation script:
```
You are helping convert our design/strategy docs into actionable engineering issues.
Read the text below and output a JSON array of backlog items.
Each item must include:
- title
- description
- component (Summit, CompanyOS, Maestro, Switchboard, IntelGraph, CI/CD, etc.)
- type (feature, tech_debt, spike, doc)
- suggested_acceptance_criteria (3–7 bullet points)
- dependencies (free text)
- rough_size (tiny/small/medium/large/epic).
Text: "<PASTE DOC OR CHAT SEGMENT HERE>"
```

## Phase 2 – Groom and normalize
- **Deduplicate & cluster:** merge overlaps; cluster by epic/initiative (e.g., CompanyOS: Decision Spine, Maestro: Orchestration core, Switchboard: tri-pane operator console, IntelGraph: entity modeling, CI/CD & Release Integrity).
- **Specs:** ensure each epic has a short RFC (problem, goals/non-goals, key flows/APIs, data model, rollout/risks). Link in `Spec link`.
- **Acceptance criteria:** make them testable. Example for orchestration graph v1: executable 5-node graph w/ conditional edges, persisted state/resume, failures captured with type/message/timestamp, metrics for jobs_started/succeeded/failed, integration test proving order/metrics/retries.
- **Prioritize:** label every issue P0–P3 with horizons (`now`, `this quarter`, `later`, `parking lot`). Build a cross-track top 20 “must do” list anchored in platform leverage, user impact, and risk mitigation.

## Phase 3 – Implement in thin, verifiable slices
- **Ready checklist per item:** owner assigned, dependencies listed, acceptance criteria finalized, telemetry expectations defined, rollout/validation plan captured.
- **Implementation steps (repeatable):** data/schema updates → core logic → surface wiring (API/CLI/UI) → tests (unit + integration/E2E) → migrations (if any) → telemetry (logs/metrics/traces/flags) → docs/runbook.
- **Evidence of done:** link merged PR(s), CI/test runs, screenshot/recording of end-to-end usage, and short validation note (“Validated by X via scenario Y on DATE”). Make evidence mandatory before moving to `In Prod` and `Validated`.
- **Parallel tracks (still 1 global priority queue):**
  1) Core Platform Features (Summit/CompanyOS/Maestro core)
  2) Operator UX & Switchboard
  3) Data & IntelGraph
  4) CI/CD, Reliability, Guardrails

## Phase 4 – Keep docs and backlog in lockstep
- **Design → Issues rule:** every new doc/sprint note includes a `Backlog` section with `[ ] BL-1234 – ...` bullets and a `Backlog linked: YES/NO` flag. Use a script/bot to scan docs for `Backlog:` blocks and warn when issues are missing.
- **Repo guardrails:**
  - CI check to block new `docs/*.md` TODOs without linked issue IDs (e.g., `#TODO [#1234]`).
  - PR template must include linked issues and “Evidence added (tests/docs/metrics): YES/NO”.
  - Scheduled job generates a weekly completeness report: items in `In Prod` lacking tests/docs/metrics labels.
- **Backlog health dashboard:** track counts by status, doc-only items, lead time Ready→Validated, distribution by component. Present in Grafana/Sheets/Notion for executive visibility.

## Operational usage
- Start the discovery sprint with a small capture crew; time-box to 3–5 days.
- Convert staging rows to GitHub issues via script (fields above).
- Stand up weekly triage to re-cluster, prioritize, and enforce Definition of Done on any item moving to Ready.
- Use the backlog-item issue template for every new work item to enforce consistency from day 1.
