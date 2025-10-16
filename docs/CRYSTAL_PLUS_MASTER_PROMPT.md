# Master Implementation Prompt — “Crystal++” in IntelGraph MC

**You are the Codex Engineering squad.** Your mission is to deliver **Crystal++**, an IntelGraph-native superset of Crystal v0.3, implemented as services, UI, and CI/CD that slot into the MC build platform & fabric. Ship feature parity with v0.3 and extend it per the roadmap below, while satisfying IntelGraph defaults (SLOs, privacy/security, provenance, cost). Treat this prompt as the canonical spec.

## 0) Operating frame (org defaults you MUST enforce)

- **SLOs (gate in CI):**
  GraphQL gateway reads p95 ≤ 350 ms / p99 ≤ 900 ms; writes p95 ≤ 700 ms / p99 ≤ 1.5 s. Subscriptions p95 ≤ 250 ms. Graph ops: 1-hop ≤ 300 ms; 2–3 hop filtered path ≤ 1,200 ms. Ingest: ≥ 1,000 events/s per pod; pre-storage p95 ≤ 100 ms.
  **Error budgets:** API 0.1%; Ingest 0.5%.
  **Cost guardrails (alert at 80%):** Dev ≤ $1k/mo; Staging ≤ $3k/mo; Prod starter ≤ $18k/mo, LLM ≤ $5k/mo.
- **Security & privacy defaults:** OIDC + JWT; ABAC via OPA; mTLS; field-level encryption; immutable audit/provenance ledger; purpose tags & retention tiers (PII → short-30d unless legal-hold).
- **Release & cadence:** Trunk-based, weekly → staging, biweekly → prod; PR gates for lint/type/tests/SBOM/policy simulation; tagged vX.Y.Z with evidence bundle.

## 1) Product objective (parity + supersets)

Recreate and surpass Crystal v0.3 capabilities inside IntelGraph:

**Parity (from v0.3):**

- **Multi-assistant sessions**: Run multiple coding agents in parallel, each isolated in its own **Git worktree** & branch; session persistence; one-click **squash & rebase to main**; rebase-from-main; change tracking/diff viewer; notifications; project-level **run scripts** to test changes in-app. ([GitHub][1])
- **Assistants**: **Claude Code** + **OpenAI Codex** support (both first-class). ([GitHub][1])
- **Panel-based workspace**: Multiple agent and terminal panels inside a single session. ([GitHub][1])
- **Attachments & shortcuts**: Text & image attachments at session start; **Cmd+Click** to launch a new session. **Clipboard actions** for messages and run-script logs. ([GitHub][1])
- **UX/perf fixes to keep**: Session names allow spaces; centralized **PATH** handling; improved diff scroll; queued/safe worktree deletion. ([GitHub][1])
- **Security hardening**: Session validation; **mutex locks**; **DB transactions** to prevent cross-session data leaks. ([GitHub][1])
- **Distribution**: macOS via **Homebrew cask** and DMG; Windows build-from-source. ([GitHub][2])

**Superset / roadmap (from repo plans):**
Implement and integrate the planned panels & abstractions as IntelGraph components:

- **Diff Panel** (advanced): richer side-by-side, commit navigation, hunk staging, blame, semantic diff hooks. ([GitHub][3])
- **Editor Panel**: in-app code edits with LSP, quick-fixes, and review comments flowing back to session threads. ([GitHub][4])
- **Logs Panel**: structured logs for agent runs, scripts, and system; copy/export; searchable with filters. ([GitHub][5])
- **Tool Panel**: pluggable tools (formatter, linter, test runner, SBOM scanner, license checker) with clean contracts. ([GitHub][6])
- **Rich Output Abstraction**: unified renderer for tables/diagrams/test reports across assistants. ([GitHub][7])
- **Enterprise deployments**: env-based configuration to support provider backends (e.g., Bedrock flags) and corporate infra. ([GitHub][2])
- **Dark mode & theming**: parity with Crystal site marketing. ([Stravu][8])

## 2) Architecture & integration (design-for-IntelGraph)

- **Service split:**
  1. **Session Orchestrator** (Node/TS): manages agents, worktrees, run-scripts, mutexes, validations.
  2. **Worktree Engine**: a sandboxed git operator (exec wrapper) with queued operations, relocation-safe paths, and rate-limited IO.
  3. **Assistant Adapters**: `adapter-claude-code`, `adapter-codex`, plus a generic **LLM adapter** contract (MCP-ready) for future models.
  4. **Provenance & Audit**: write every action/commit to the provenance ledger with claim→evidence links.
  5. **UI Shell**: React 18 + Material-UI with **panel system** (Agent/Terminal/Diff/Editor/Logs/Tools).
  6. **Gateway**: Apollo GraphQL; subscriptions for live diffs/run logs; OPA-backed ABAC.

- **Observability:** OpenTelemetry traces; Prometheus metrics per session/agent/worktree op; logs to ELK; dashboards + SLO burn alerts wired to budgets.
- **Storage:** Postgres (sessions, runs, attachments metadata); object store (attachments, artifacts); Redis (queues, locks).
- **Security:** mTLS between services; scoped secrets per tenant; SCIM for user lifecycle; WebAuthn optional for elevation.
- **Offline/air-gapped:** bundle assets; file-drop ingestion; immutable local ledger with later resync.

## 3) Key behaviors (must-haves)

- **Parallel sessions** with backpressure: never starve the system; observe p95 responsiveness in UI while N agents run.
- **Worktree isolation**: each session gets its own branch/worktree; **safe creation/deletion queue**; preview git commands before execution; honor **git repair/relative paths** for portability. ([GitHub][2])
- **Run scripts** per project with per-session overrides; structured log capture; copy-to-clipboard. ([GitHub][2])
- **Diff viewer** with infinite-scroll commit view and semantic chunking; smooth scroll perf retained. ([GitHub][1])
- **Assistant neutrality**: feature parity across Claude Code and Codex adapters (prompting, attachments, continuation, retries). ([GitHub][1])
- **Session validation + locking**: ensure no cross-session bleed; enforce **mutex + DB tx** around all writes. ([GitHub][1])
- **Installers**: ship macOS cask + DMG; scripted Windows build path. ([Homebrew Formulae][9])

## 4) APIs & contracts

- **GraphQL SDL (gateway):** Sessions, Panels, Worktrees, Runs, Diffs, Attachments, Agents, Adapters.
- **Adapter contract:** `init()`, `capabilities()`, `startThread()`, `sendMessage()`, `attach({type: text|image|file})`, `streamTokens()`, `stop()`, `summarizeThread()`.
- **Worktree ops:** `create`, `status`, `rebaseFromMain`, `squashAndRebaseToMain(message)`, `deleteQueued`, `preview(command)`; all return provenance IDs.

## 5) Security, privacy, and policy

- **Data minimization:** only store required artifacts; default retention **standard-365d**; PII in **short-30d** unless legal-hold.
- **Purpose tags:** investigation, benchmarking, training, demo, etc., attached to sessions for policy reasoning.
- **License/TOS scanning:** bundle SBOM + license classifier; block **Restricted-TOS** model usage if policy denies.
- **Provenance everywhere:** session creation → agent messages → file writes → git operations → run results; hash manifests exported with releases.

## 6) UX requirements

- **Panel layout** with drag-to-split and preset arrangements (compare-three preset).
- **Cmd+Click** → new session from selected prompt/snippet; remembers dialog preferences; allows **promptless session**. ([GitHub][1])
- **Attachments** at start and during threads (text + image + file); inline render via Rich Output abstraction. ([GitHub][1])
- **Clipboard icons** on messages and logs. ([GitHub][1])
- **Dark mode** toggle, theme tokens (WCAG AA). ([Stravu][8])

## 7) Acceptance criteria (evidence-backed)

1. **Feature parity audit** with Crystal v0.3 release notes passes 100%; evidence: side-by-side checklist with screencaps & provenance IDs. ([GitHub][1])
2. **Assistants**: Claude Code + Codex both run N≥4 concurrent sessions each without cross-session data leaks; locks + DB tx verified by chaos tests. ([GitHub][1])
3. **Worktree ops**: safe queueing; no orphaned dirs after forced termination; relocation-safe paths verified by moving repo + worktrees together. ([Stack Overflow][10])
4. **Diff/Editor/Logs/Tool panels**: implemented as modular panels; functional tests cover rendering, navigation, copy actions, search/filter. ([GitHub][3])
5. **Rich Output** abstraction demonstrably renders tables/diagrams/test reports from both adapters. ([GitHub][7])
6. **Run scripts**: project + session override; logs captured & copyable; exit codes propagate to UI & provenance. ([GitHub][2])
7. **SLOs**: all gateway endpoints meet p95/p99 targets under load (k6 + synthetic token streams); alerts wired to budget.
8. **Security**: OIDC/OPA ABAC enforced; mTLS; secrets scoped; SBOM + license/NOTICES generated automatically (block on non-compliance). ([GitHub][2])
9. **Install**: `brew install --cask stravu-crystal` parity (for our app name), DMG notarized; Windows build script reproducible. ([Homebrew Formulae][9])
10. **Docs & runbooks** shipped: deploy/upgrade; on-call triage; provenance verify; rollback.

## 8) Testing & validation

- **Unit/integration/e2e** (Jest/Playwright) + **load** (k6) + **chaos** (network jitter, adapter timeouts, git lock contention).
- **Golden fixtures**: repos with flaky tests, merge conflicts, bin files, large diffs.
- **Security tests**: model/adapter sandboxing, prompt injection probes, file exfiltration guards, cross-session access attempts.

## 9) Deliverables

- Code (services + UI), Helm/Terraform overlays, GraphQL SDL, adapters, tests, dashboards, SBOM/NOTICES, user docs, ADRs, release notes, evidence bundle (SLO & policy reports + provenance manifests).

---

### Appendix — Source truths used for parity/superset mapping

- Crystal **v0.3.0** release notes (Codex support; panel workspace; attachments; Cmd+Click; clipboard; UX/perf; security hardening). ([GitHub][1])
- README (multi-assistant sessions; worktrees; run scripts; diff; squash/rebase; third-party deployment envs; licensing). ([GitHub][2])
- Planned panel/abstraction docs (Diff, Editor, Logs, Tool, Rich Output; Validation). ([GitHub][3])
- Homebrew cask (install parity). ([Homebrew Formulae][9])

---

If you want, I can also spit out a ready-to-run **Backlog & RACI** (epics → stories → tasks) and an **ADR set** for the adapter contract & worktree engine—but this prompt alone is enough to brief the team and start implementation.

[1]: https://github.com/stravu/crystal/releases/tag/v0.3.0 'Release 0.3.0 · stravu/crystal · GitHub'
[2]: https://github.com/stravu/crystal 'GitHub - stravu/crystal: Run multiple Claude Code AI sessions in parallel git worktrees. Test, compare approaches & manage AI-assisted development workflows in one desktop app.'
[3]: https://github.com/stravu/crystal/blob/main/DIFF_PANEL_PLAN.md 'crystal/DIFF_PANEL_PLAN.md at main · stravu/crystal · GitHub'
[4]: https://github.com/stravu/crystal/blob/main/EDITOR_PANEL_PLAN.md 'crystal/EDITOR_PANEL_PLAN.md at main · stravu/crystal · GitHub'
[5]: https://github.com/stravu/crystal/blob/main/LOGS_PANEL_PLAN.md 'crystal/LOGS_PANEL_PLAN.md at main · stravu/crystal · GitHub'
[6]: https://github.com/stravu/crystal/blob/main/TOOL_PANEL_DESIGN.md 'crystal/TOOL_PANEL_DESIGN.md at main · stravu/crystal · GitHub'
[7]: https://github.com/stravu/crystal/blob/main/RICH_OUTPUT_ABSTRACTION_PLAN.md 'crystal/RICH_OUTPUT_ABSTRACTION_PLAN.md at main · stravu/crystal · GitHub'
[8]: https://stravu.com/crystal?utm_source=chatgpt.com 'Crystal for Claude Code'
[9]: https://formulae.brew.sh/cask/stravu-crystal?utm_source=chatgpt.com 'stravu-crystal'
[10]: https://stackoverflow.com/questions/66635437/git-worktree-with-relative-path?utm_source=chatgpt.com 'git worktree with relative path?'
