# Codex Desktop Summit Workspace Guide

## Summit readiness assertion

Reference the Summit Readiness Assertion before executing any workflow: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Expected local layout

Use a stable workspace root and keep the Summit repo at a predictable path.

```
~/src/
  summit/            # BrianCLong/summit clone
  summit-work/       # optional scratch workspace
```

Bootstrap the repo if missing:

```
mkdir -p ~/src
cd ~/src

git clone git@github.com:BrianCLong/summit.git
cd summit
```

## Codex Desktop project setup

Create a repo-local Codex project descriptor so Codex Desktop consistently loads Summit-specific
skills, prompts, and automations.

**File:** `.codex/project.json`

```
{
  "name": "summit",
  "root": ".",
  "skills": [
    "./skills",
    "~/.codex/skills",
    "~/.agents/skills"
  ],
  "prompts": [
    "./prompts"
  ],
  "automations": [
    "summit-daily"
  ],
  "gitSafety": {
    "requireCommitConfirmation": true,
    "requirePushConfirmation": true,
    "disallowForcePush": true,
    "disallowBranchDelete": true
  }
}
```

Maintain this file as the authoritative project contract for Codex Desktop. Treat changes as
configuration updates that require code review.

## Skills discovery and binding

Discover skills locally from the global and project scopes:

```
find ~/.codex/skills ~/.agents/skills ./skills -name SKILL.md -maxdepth 3
```

### Recommended project skills

Create a minimal, composable set of project-scoped skills under `skills/summit/` and keep each
skill focused on one lane.

| Skill name | Purpose | Location |
| --- | --- | --- |
| `summit-daily` | Run the Summit daily loop automation and produce the daily note. | `skills/summit/summit-daily/SKILL.md` |
| `summit-ci-triage` | Review CI results, gate failures, and remediation steps. | `skills/summit/summit-ci-triage/SKILL.md` |
| `summit-security-observability` | Review security signals, observability dashboards, and alert posture. | `skills/summit/summit-security-observability/SKILL.md` |
| `summit-ux-investigation` | Drive investigation UX and front-end validation flows. | `skills/summit/summit-ux-investigation/SKILL.md` |
| `summit-angular-ui` | Angular component scaffolding and test helpers. | `skills/summit/summit-angular-ui/SKILL.md` |

These skills align to separate lanes and support the safe parallelism rule.

## Summit Daily automation flow

Implement the `summit-daily` skill as a deterministic, evidence-first routine.

1. **Open or create threads**
   - CI triage
   - Security/observability
   - Frontend/investigation UX

2. **Run a lightweight status pass**
   - `git status -sb`
   - `git branch --show-current`
   - `git log -5 --oneline`
   - `git remote -v`
   - `cat pr-open.json` and `cat prs.json` for open PR context

3. **Emit evidence bundle (UEF)**
   - Capture raw command output in a single fenced section labeled `EVIDENCE`.

4. **Summarize into a Summit Daily note**
   - Title: `Summit Daily | YYYY-MM-DD`
   - Sections:
     - Snapshot (repo status + branch)
     - CI posture (open gate failures, pending checks)
     - Security/observability posture (alerts, pending reviews)
     - UX lane (front-end tasks and blockers)

5. **Suggest 3–5 next actions**
   - Tag each action with a lane: `security`, `ux`, `infra`, `governance`, `ci`.

6. **Close the loop**
   - Declare the daily plan complete and ready for execution.

## Git safety settings

Enforce safe Git operations for Summit work.

### Local hooks (recommended)

Use a repo-scoped hook path and block non-fast-forward pushes or branch deletions.

```
mkdir -p .githooks

git config core.hooksPath .githooks
```

Create `.githooks/pre-push` to reject:

- Non-fast-forward updates
- Branch deletions

### Codex Desktop Git guardrails

Configure Codex Desktop to require explicit confirmation before commit or push. Treat all Git
operations as constrained, no-force, no-delete actions unless a human owner explicitly approves.

## MAESTRO threat model alignment

- **MAESTRO Layers:** Foundation, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, unsafe Git actions, evidence tampering.
- **Mitigations:** scoped skills, explicit Git confirmations, evidence-first outputs, hooks to
  reject unsafe push operations.

## Output guide: Summit Daily note template

```
Summit Daily | YYYY-MM-DD

Snapshot
- Branch: <name>
- Status: <git status -sb summary>

CI posture
- <summary>

Security/observability posture
- <summary>

UX lane
- <summary>

Next actions
- [lane: ci] <action>
- [lane: security] <action>
- [lane: ux] <action>
```

## Governance reminders

- Cite files, not opinions.
- Treat legacy bypasses as Governed Exceptions.
- Keep the golden path green.
