# Summit GA Control Room — Automations & Threads

**Scope:** GA control room operations (daily automation, PR explainers, telemetry)
**Authority:** `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`
**Operating rule:** Never defend the past. Assert the present; dictate the future.

## 1) Morning GA Sweep (Automation or Thread)

**Thread/Automation Name:** `Morning GA Sweep`

**Objective:** Produce one deterministic daily GA status file from repeatable evidence sources.

### Required Inputs

- CI checks for `main` and active GA PRs.
- `docs/ops/READINESS_INDEX.md`
- `docs/ops/COMMAND_CENTER.md`
- `docs/ops/RELEASE_TEMPLATE.md`
- `docs/ops/EVIDENCE_INDEX.md`

### Execution Steps

1. Collect failing CI jobs for `main`; group by workflow and owning team.
2. Collect failing CI jobs for GA-tagged PRs; rank by blast radius.
3. Compare unresolved security/evidence gaps against prior daily status.
4. Validate pre-GA, GA-cut, and hypercare checklist freshness (`last_verified_at`).
5. Publish `docs/ops/GA_DAILY_STATUS_<date>.md` using the required output schema.

### Required Output Schema

- `ci.main_failures[]`: workflow, job, url, owner, failing_since.
- `ci.ga_pr_failures[]`: pr, workflow, job, url, owner, failing_since.
- `security.gaps[]`: id, severity, owner, remediation_link, status.
- `ops.checklists[]`: checklist, status, last_verified_at, owner.
- `decision.next_actions[]`: action, owner, due_by.

## 2) Summit PR Explainer (Saved Thread or Skill)

**Name:** `Summit PR Explainer`

**Input:** PR number or branch name.

**Behavior Contract**

- Fetch diff + referenced docs/tests.
- Explain change intent and impact.
- Classify GA-criticality (`GA-support` or `post-GA`).
- Emit local/CI verification guidance.
- Produce a paste-ready 3–7 bullet summary.

**Verification Anchors**

- `docs/ga/TESTING-STRATEGY.md`
- `docs/CI_STANDARDS.md`
- `docs/ops/OPS_VERIFY.md`

## 3) Agent Telemetry Board (On demand)

**Thread Name:** `Agent Telemetry Board`

**Objective:** Summarize latest execution artifacts from Jules, Gemini CLI, Antigravity, and Codex.

### Required Inputs

- PR and docs updates under `docs/`, `agents/`, and `.github/`.
- Artifacts under `artifacts/agent-runs/`, `governance/`, and `evidence/`.
- Telemetry standards in `docs/agents/agent-telemetry.md`.

### Required Output

- `docs/ops/AGENT_TELEMETRY.md` with evidence-first sections and owner-routed actions.

## 4) Scheduling & Escalation

- **Cadence:** once per day and at each release-manager handoff.
- **Escalation trigger:** any GA-blocking security gap or release-checklist drift.
- **Escalation rule:** reference `docs/SUMMIT_READINESS_ASSERTION.md` and assign a single accountable owner.

## 5) Governance Guardrails

- Evidence-first output is mandatory (UEF before narrative).
- Use explicit ownership on every blocking item.
- Treat missing data as a data-quality defect; open an owner-assigned follow-up action.
