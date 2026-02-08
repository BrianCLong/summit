# Summit Ops & Incident Console (Codex Desktop)

## Summit Ops Project Definition

**Project name:** `Summit Ops`

**Trusted root:** `~/src/summit` (or `/workspace/summit` in container environments)

**Expected layout:**

```
~/src/summit/
├── .codex/
│   ├── config.toml
│   ├── profiles/
│   │   ├── workspace-write.toml
│   │   ├── read-only.toml
│   │   └── incident-mode.toml
│   ├── automations/
│   │   └── summit-ops-monitoring.toml
│   └── threads/
│       ├── ci-governance.md
│       ├── security-observability.md
│       ├── release-train.md
│       └── frontend-ux-playwright.md
├── docs/
│   └── ops/
│       └── summit-ops-console.md
└── ...
```

**Notes:**
- `.codex/` lives at the project root and is the authoritative configuration boundary.
- `threads/*.md` are optional short descriptors used by the desktop app to seed thread goals.
- No automation should write to the repo without explicit human approval.

### Standing Threads

| Thread | Default Goals | Auto-Loaded Skills | Git Operations |
| --- | --- | --- | --- |
| **CI & Governance** | Monitor CI status, required checks, evidence bundles, and governance gates. Summarize deltas daily and after failed runs. | `summit-ci-governance-summarizer`, `summit-pr-status-sentry` | Read-only Git (`git status`, `git diff`, `git log`). No write operations. |
| **Security & Observability** | Watch security scans, audit logs, telemetry anomalies, and observability regressions. Queue findings for review. | `summit-security-signal-watch`, `summit-observability-signal-watch` | Read-only Git only; no commits or branch operations. |
| **Release Train** | Track release readiness, merge-train throughput, and readiness assertion status. Publish a daily readiness brief. | `summit-release-readiness-brief` | Read-only Git; no tagging or release actions. |
| **Frontend UX / Playwright** | Track UI regressions, build health, and e2e results. Capture screenshots for UI deltas only. | `summit-ui-playwright-triage` | Read-only Git. No UI changes without explicit approval. |

## Skills & Automations

### Skill Concepts (Instruction-Only)

1. **`summit-ci-governance-summarizer`**
   - Inputs: last 24h CI runs, failing checks, evidence artifacts.
   - Output: concise bullet summary + “Deferred pending X” for unknowns.
   - Behavior: never runs mutations; posts only to `CI & Governance` thread.

2. **`summit-pr-status-sentry`**
   - Inputs: open PR list, required checks, stale PRs, merge-queue health.
   - Output: queue health, stalled PRs, and required-check deltas.

3. **`summit-security-signal-watch`**
   - Inputs: security scans, audit logs, CodeQL summaries, gitleaks reports.
   - Output: alerts list with severity, routed into `Security & Observability` thread.
   - Behavior: queues items only; no remediation without explicit instruction.

4. **`summit-observability-signal-watch`**
   - Inputs: SLO/SLI dashboards, log anomaly summaries, infra drift signals.
   - Output: list of regressions with suggested owners.

### Background Automation (Human-Approval Only)

**Automation:** `summit-ops-monitoring` (weekday schedule)

- **Schedule:** 09:00, 12:00, 16:00 local time.
- **Reads only**: CI status, PR metadata, security scan summaries, SLO dashboards.
- **Posts**: updates into `CI & Governance` and `Security & Observability` threads.
- **Approval policy**: any Git write, branch change, or file edit requires explicit human approval.
- **No migrations or refactors**: automation may only summarize and queue decisions.

## Safe Git + Sandbox Profiles

### Recommended `config.toml` (project root)

```toml
[project]
name = "Summit Ops"
root = "~/src/summit"
trusted = true

[profiles.workspace-write]
approval_policy = "on-request"
sandbox_mode = "default"
allow_network = false

[profiles.read-only]
approval_policy = "never"
sandbox_mode = "default"
allow_network = false

[profiles.incident-mode]
approval_policy = "on-request"
sandbox_mode = "default"
allow_network = false

[git]
# Commands that are auto-approved in workspace-write profile only.
safeCommands = [
  "git status",
  "git diff",
  "git log",
  "git branch --show-current",
  "pnpm lint",
  "pnpm test",
  "pnpm typecheck"
]

# Destructive operations must always require explicit approval.
denyCommands = [
  "git push --force",
  "git push --force-with-lease",
  "git branch -D",
  "git branch -d",
  "git tag -d",
  "git reset --hard",
  "git clean -fdx"
]
```

**Operational rules:**
- Default profile: `workspace-write` with `approval_policy = "on-request"`.
- `read-only` profile is used for investigation-only tasks and incident triage.
- Any branch deletion, force-push, or history rewrite is **never** auto-approved.

## Summit Incident Mode (Step-by-Step)

1. **Start Session**
   - Open the `Summit Ops` project.
   - Select `read-only` profile for initial triage.
   - Open the `CI & Governance` or `Security & Observability` thread depending on trigger.

2. **Run a /plan Pass First**
   - Request a plan-only pass: identify symptoms, suspected causes, and data sources.
   - Require a short evidence list before any proposed changes.

3. **Evidence Collection**
   - Summarize CI failures, security alerts, or release gate failures.
   - No remediation steps yet. Output must be deterministic and cite file evidence.

4. **Propose Fix as Diffs**
   - Switch to `workspace-write` profile only after review.
   - Generate a diff-only proposal with rollback steps.
   - Require explicit approval before applying changes.

5. **Verification**
   - Run scoped checks only (targeted tests, smoke checks if required).
   - Record evidence bundle IDs and a brief validation summary.

6. **Closure**
   - Post a final incident summary and mark actions as complete.
   - If unresolved: state “Deferred pending X” and open a follow-up entry.

### Incident Summary Standard (Required Output)

- **Timeline:** key timestamps and events.
- **Primary Signal:** CI red, security alert, or release gate failure.
- **Root-Cause Hypothesis:** concise and testable; if incomplete use “Deferred pending X.”
- **Candidate Fix:** minimal change set with risk level.
- **Verification Steps:** exact commands and expected results.
- **Rollback Plan:** triggers and exact commands.
- **Owner / Next Steps:** accountable owner + next action.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, goal manipulation, tool misuse, unauthorized Git writes.
- **Mitigations:** read-only defaults, explicit approval gates, denylist for destructive commands,
  deterministic evidence-first summaries, and incident-mode diff-only proposals.
