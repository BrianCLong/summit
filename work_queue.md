# Post-Incident Development Recovery Plan
**Status:** Stabilized | **Date:** Feb 10, 2026 | **Target:** Resume Velocity by EOW

## 1. PR Queue Assessment
- **Total Open PRs:** 406
- **Strategy:** Prioritize merging low-risk dependency updates to clear the queue, then focus on feature PRs blocked during the incident window.
- **Top 10 Priority Candidates (Most Recent):**
  1. #1766 - `feat: add policy impact causal analyzer toolkit` (Codex)
  2. #1761 - `chore(deps): bump sharp` (Dependencies)
  3. #1756 - `chore(deps): bump chalk` (Dependencies)
  4. #1765 - `chore(deps): bump react-map-gl` (Dependencies)
  5. #1764 - `chore(deps-dev): bump @graphql-codegen/typescript` (Dependencies)
  6. #1763 - `chore(deps): bump canvas` (Dependencies)
  7. #1762 - `chore(deps): bump @turf/area` (Dependencies)
  8. #1760 - `feat: add iftc static analyzer` (Codex)
  9. #1746 - `feat: add RAALO policy aware active learning orchestrator` (Codex)
  10. #1748 - `feat: add coec cross-org experiment coordination` (Codex)

## 2. High Priority Development (Sprint 25)
Focus on the following Epics to recover velocity:

### 🚨 Critical Path (P0)
- **EPIC-A: Governance & Security**
  - Implement OPA Gatekeeper v2 (A-POL-002)
  - Establish Policy Dev Workflow (A-POL-003)
- **EPIC-B: Entity Resolution**
  - Merge Adjudication Queue (B-ER-010)
  - Auto-merge Confidence Bands (B-ER-011)

### 🚀 Feature Velocity (P1)
- **EPIC-G: Connectors**
  - Connector Scheduler & Backoff (G-CON-060)
  - 5 Connectors to PROD-Ready (G-CON-061)
- **EPIC-E: Performance**
  - p95 Targets & Killer Tuning (E-OPS-040)
  - Result Streaming & Caching (E-OPS-041)

## 3. CI Signal Validation
- **Status:** ✅ GREEN
- **Verification:** `pnpm test` passed for `@intelgraph/maestro-core` (11/11 Suites).
- **Environment:** `pnpm` version 10.0.0 confirmed.

## 4. Proactive Monitoring Actions
The following alert rules have been added to `monitoring/rules/alerts.yaml` to detect recurrence of incident patterns:
- **MergeLoopDetected:** Detection of >5 requeues/hour.
- **PnpmPathIssue:** Alert on missing `pnpm_check` job.
- **RunnerQueueHigh:** Alert on runner queue depth > 10.

**Action Required:**
- Implement the underlying metrics (`github_merge_queue_requeues_total`, `github_actions_runner_queue_depth`) in `dora/exporter.ts`.
- Configure the `pnpm_check` job in Prometheus targets.
