# Runbook: Autonomous Coding Tools Selection

**ID:** RB-ACT-001
**Service:** Engineering Productivity
**Severity:** Operational (Planning)
**Owner:** Engineering Enablement
**SLO Impact:** None (planning only)

---

## 1. Detection

- **Trigger:** A team requests an autonomous coding tool or plans an agent-driven workflow.
- **Signal:** Issue-to-PR automation, multi-file refactors, or CI-integrated agents are in scope.

## 2. Triage

- **Impact:** Tool choice affects SDLC safety, review load, and CI stability.
- **Urgency:** Next business day unless tied to an active delivery blocker.
- **Dependencies:** Git hosting, CI system, IDE/terminal workflows, and secrets management.
- **Readiness anchor:** Reference the Summit Readiness Assertion before proceeding.

## 3. Decision Matrix (Use-Case Fit)

### Issue → PR (highest leverage)

- **GitHub Copilot coding agent**: Assign an issue, receive a PR for review.
- **Devin (Cognition)**: Autonomous teammate for refactors, bugs, tests, and tooling.

### Terminal-native agents

- **OpenAI Codex CLI**: Deterministic workflows with approval modes and MCP integration.
- **Claude Code**: Terminal-first agent for iterative refactors and repo-local work.
- **Aider**: Controlled file-scoped edits for existing repositories.

### Agentic IDEs

- **Cursor Agent**: Multi-file edits with terminal execution in-editor.
- **Windsurf + Cascade**: Tool calling + checkpoints for iterative work.
- **Continue**: Configurable agent in IDE or headless mode.

### Open-source autonomous SWE frameworks

- **SWE-agent / mini-swe-agent**: CI-style autonomous issue fixing.
- **OpenHands (OpenDevin)**: Customizable agent runtime for code + tool execution.

### App-from-scratch autonomy

- **Replit Agent**: Rapid greenfield app creation in hosted environments.

## 4. Guardrails (Non-Negotiable)

1. **Branch-only operation:** Agents must work on branches and produce PRs for review.
2. **Approval checkpoints:** Prefer tools with explicit approval or checkpoint modes.
3. **Secrets isolation:** No production secrets or long-lived tokens in agent runs.
4. **Prompt injection defense:** Treat unsafe file actions as security incidents.
5. **CI enforcement:** Require CI + code scanning before merge.
6. **Policy-as-code only:** Compliance logic must live in the policy engine, never ad hoc scripts.
7. **Decision logging:** Record compliance or ethics review decisions in the provenance ledger.

## 5. Governed Exceptions

- **Definition:** Any deviation from guardrails is a Governed Exception.
- **Requirements:** Written approval, scope-limited duration, and explicit rollback criteria.
- **Record:** Attach exception evidence to the run's decision log and escalation thread.

## 6. Selection Steps

1. **Confirm workflow anchor**: GitHub issue-to-PR, terminal-first, or IDE-first.
2. **Select automation depth**: High autonomy (issue → PR) vs. incremental edits.
3. **Validate compliance**: Ensure guardrails in Section 4 are enforced.
4. **Pilot**: Run a timeboxed trial on a non-critical repo or feature branch.
5. **Adopt**: Document the chosen tool in team onboarding material.

## 7. Verification

- **Success criteria:**
  - PRs are reviewable and scoped.
  - CI is green without manual patching.
  - No credential exposure or policy violations.

## 8. Escalation

- **Primary:** Engineering Enablement
- **Secondary:** Security Council for any policy or secret handling concerns.

## 9. References

- GitHub Copilot coding agent: https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- Devin: https://docs.devin.ai/
- Codex CLI: https://developers.openai.com/codex/cli/
- Claude Code: https://code.claude.com/docs/en/overview
- Aider: https://aider.chat/
- Cursor Agent: https://cursor.com/docs/agent/modes
- Windsurf Cascade: https://docs.windsurf.com/windsurf/cascade/cascade
- Continue: https://docs.continue.dev/
- SWE-agent: https://github.com/SWE-agent/SWE-agent
- OpenHands: https://github.com/OpenHands/OpenHands
- Replit Agent: https://docs.replit.com/replitai/agent
