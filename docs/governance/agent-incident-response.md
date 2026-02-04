Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Agent Incident Response Playbook

**Status**: Active
**Severity**: High

This document defines the protocols for handling rogue, malfunctioning, or compromised AI agents within the Summit ecosystem.

## 1. The Kill-Switch Protocol

**Trigger Conditions**:

- **Agent creates infinite loops**: (e.g., recursive PR opening).
- **Agent modifies unauthorized files**: (Tier violation).
- **Agent leaks secrets or PII**.
- **Agent exhibits "hallucinations"**: that threaten data integrity (e.g., mass deletions).

### 1.1 Immediate Action: The `panic:kill-switch` Label

To immediately halt an agent's activity:

1. **Apply Label**: Add the label `panic:kill-switch` to ANY open Pull Request or Issue controlled by the agent.
   - _Effect_: The `incident-automation.yml` workflow (or equivalent) will detect this label.
   - _Action_: It will close the PR, lock the thread, and suspend the agent's token/permissions if possible.

2. **Emergency Branch Delete**:
   - If the agent is pushing to a branch (e.g., `agentic/feature-x`), **DELETE** the branch immediately.
   - `git push origin --delete agentic/feature-x`

### 1.2 Automated Kill-Switch

The CI system monitors for:

- **Rate Limits**: >10 PRs per hour from a single agent identity.
- **Destruction**: Deletion of >5% of the codebase in a single commit.
- **Policy Violation**: Modification of `docs/governance/CONSTITUTION.md` without `governance:override` token.

**Action**: The `security-autopilot.yml` workflow will automatically block the user and alert DevOps.

## 2. Rollback Procedures

If bad code has been merged:

### 2.1 Automated Rollback

- Trigger the `auto-rollback.yml` workflow.
- **Input**: `PR_ID` or `COMMIT_SHA`.
- **Mechanism**: `git revert`, strictly verifying the inverse diff.

### 2.2 Manual Hard Reset (Break Glass)

Only explicitly authorized Admins (Tier 4 Humans) may perform this.

1. `git checkout main`
2. `git reset --hard <last-known-good-commit>`
3. `git push -f origin main`
4. **Log Incident**: Must be recorded in `docs/audit/INCIDENTS.md`.

## 3. Post-Incident Audit

After containment:

1. **Generate Report**: Use the `docs/audit/incident-template.md`.
2. **Evidence**: Collect logs from `agentic-lifecycle` run.
3. **Root Cause Analysis (RCA)**:
   - Was it a prompt injection?
   - Was it a context hallucination?
   - Was it a permission misconfiguration?
4. **Remediation**: Update `docs/governance/permission-tiers.md` to prevent recurrence.

## 4. Emergency Contacts

- **Governance Lead**: [Insert Contact]
- **Security Ops**: [Insert Contact]
- **AI Oversight**: `ai-oversight@companyos.io`
