# Codex Incident Mode (GA)

**Status:** Active during GA windows.
**Authority:** Summit Readiness Assertion and Incident Response policy.
**Principle:** Minimal, reversible, and evidence-first fixes only.

## Incident Mode Policy

- **Git access:** Read-only by default (`git status`, `git fetch`, `gh pr view`, `gh run view`).
- **Write permissions:** Allowed only on branches named `incident/GA-YYYYMMDD-*`.
- **PR labeling:** All incident PRs carry `incident-fix` and a change classification label (`patch`, `minor`, or `major`).
- **Human approval:** Required by CODEOWNERS before merge.
- **PR metadata:** Must include the AGENT-METADATA fenced JSON block from `.github/pull_request_template.md`.

## Incident Mode Profile (Reference)

```yaml
incidentMode:
  enabled: true
  git:
    mode: "read-only"
    allowedCommands:
      - "git status"
      - "git fetch"
      - "gh pr view"
      - "gh run view"
  writePolicy:
    branchPrefix: "incident/GA-"
    prLabel: "incident-fix"
```

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** Goal manipulation, prompt injection, tool abuse, unsafe rollback, evidence loss.
- **Mitigations:** Read-only default, branch/label restrictions, focused tests, explicit rollback steps.

## Incident Mode in Codex (Runbook)

1) **Capture incident context**
   - Collect failing checks, error logs, and dashboards.
   - Record artifacts and timestamps in the incident notes.

2) **Propose a minimal fix branch**
   - Create `incident/GA-YYYYMMDD-<short-desc>`.
   - Document scope boundaries and reversibility.

3) **Implement a reversible fix**
   - Touch the smallest set of files.
   - Avoid refactors or non-essential changes.

4) **Run focused tests only**
   - Execute the narrowest tests that prove the fix.
   - Record commands and outputs as evidence.

5) **Open a PR with rollback instructions**
   - Include rollback triggers and steps.
   - Assign `incident-fix` + change classification label.
   - Include the AGENT-METADATA block.

6) **Hand back to human owner**
   - Summarize impact, evidence, and rollback plan.
   - Defer final decision pending human approval.

## Exit Criteria

Incident Mode ends when:
- The triggering GA blocker is resolved, or
- A Governed Exception is recorded with rollback triggers and monitoring.
