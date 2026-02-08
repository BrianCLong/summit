# Codex Desktop Summit Workspace Guide

## Summit Readiness Assertion (Escalation)

This workspace aligns to the Summit Readiness Assertion and is governed by the repository
standards. Review the readiness baseline before operating the workspace to keep the
Law of Consistency intact.

## Mode Declaration

**Mode:** Reasoning (analysis-focused, evidence-first, deterministic outputs).

## Purpose

Create a repeatable Codex Desktop workspace for `BrianCLong/summit` that anchors skills,
automations, and safe Git operations to a daily driver loop.

## Expected Local Directory Layout

```
~/src/summit/               # Primary repo checkout
~/src/summit/.codex/        # Codex Desktop project metadata (workspace-local)
~/.codex/skills/            # Global skills directory
~/.agents/skills/           # Legacy/global skills directory (if still used)
```

If the repo is not present, the deterministic bootstrap layout is:

```
mkdir -p ~/src
cd ~/src

git clone git@github.com:BrianCLong/summit.git
cd summit
```

## Codex Desktop Project Configuration (Workspace-Local)

Create a workspace-local project manifest so Codex Desktop always treats this repo
as Summit-aware. Recommended files:

```
.codex/project.json
.codex/skills/README.md
.codex/automation/
```

**Minimal `project.json` (example):**

```json
{
  "name": "summit",
  "root": ".",
  "skills": [
    "./skills",
    "~/.codex/skills",
    "~/.agents/skills"
  ],
  "automation": "./.codex/automation",
  "notes": [
    "docs/codex-desktop-summit.md",
    "docs/SUMMIT_READINESS_ASSERTION.md"
  ]
}
```

This design keeps the workspace deterministic, portable, and discoverable without
external dependencies.

## Skills: Discovery & Baseline Mapping

### Discovered Skills (Repository)

From `skills/` in this repo:

- `summit-skill-router`
- `summit-skill-router-ga-orchestrator`
- `summit-ga-preflight-hard-gate-auditor`
- `summit-pr-stack-sequencer`
- `react-best-practices-pack`
- `context-engineering-pack`

### Discovered Skills (Global)

From the global skill list in this environment:

- `skill-creator` (system)
- `skill-installer` (system)

### Angular/Summit Skills (Status)

Angular-specific skills are **deferred pending local installation**. None are
present in this repo or the system-provided skill list. Use `skill-installer`
when a vetted Angular skill pack is available locally.

## Recommended Always-On Skills (Minimal Set)

Bind these to the Summit workspace to keep daily operations consistent:

1. `summit-skill-router` - entrypoint for intent classification and minimal skill chaining.
2. `summit-ga-preflight-hard-gate-auditor` - evidence-first GA and policy gate scanning.
3. `summit-pr-stack-sequencer` - deterministic PR sequencing with rollback.
4. `react-best-practices-pack` - frontend conventions for web UI edits.
5. `context-engineering-pack` - structured prompt/context constraints for agent ops.

**Location:**
- Repository skills live in `skills/` and should always be indexed.
- Optional project-only overrides can live in `.codex/skills/`.
- Global skills live in `~/.codex/skills` or `~/.agents/skills`.

## Summit Daily Automation Flow (Meta-Skill Spec)

This is a concrete, implementable meta-skill called **Summit Daily**.

### Step-by-Step Flow

1. **Initialize Threads**
   - Create or focus threads:
     - `CI Triage`
     - `Security & Observability`
     - `Frontend & Investigation UX`
2. **Status Sweep (Local-Only)**
   - `git status -sb`
   - `git branch --show-current`
   - `git log -n 5 --oneline`
   - `git remote -v`
   - `gh pr list --limit 5` (if GitHub CLI configured; otherwise mark as deferred)
3. **Summit Daily Note (Deterministic)**
   - Write `docs/ops/SUMMIT_DAILY.md` or `.codex/automation/daily/SUMMIT_DAILY.md` with:
     - Repo status (clean/dirty)
     - Current branch
     - Last 5 commits
     - Open PRs summary (or deferred)
4. **Next Actions (3-5)**
   - Suggest 3-5 actions, each tagged to a lane:
     - `security`, `ux`, `infra`, `docs`, `ci`
5. **Escalation & Readiness Hook**
   - Link to `docs/SUMMIT_READINESS_ASSERTION.md` and note any
deviations as governed exceptions.

### Deterministic Deliverables

- `SUMMIT_DAILY.md` note
- Thread list
- Action list with lane tags

## Git Safety & Confirmation Controls

### Git Safety Defaults

- No force pushes (`git config --global receive.denyNonFastForwards true`).
- No branch deletion from automation (require manual `git branch -D`).
- Restrict large refactors (work on a single zone per PR; prefer docs-only changes for workspace setup).

### Explicit Confirmation for Writes

For any thread that can mutate Git state:

1. Require an explicit confirmation step before:
   - `git commit`
   - `git push`
   - `git rebase`
2. Require a human confirmation token in the prompt context, e.g.
   `CONFIRM_GIT_WRITE=YES`.

This aligns with hardened Git approval behavior and preserves auditability.

## MAESTRO Threat Model Alignment

When operating the Summit Daily flow, classify and mitigate threats as follows:

- **MAESTRO Layers:** Tools, Infra, Observability, Security
- **Threats Considered:** prompt injection, tool abuse, credential leakage, unsafe Git operations
- **Mitigations:** deterministic commands only, no external network calls, explicit write confirmation, no secrets in output, audit trail via daily note

## Proposed Repo Guide Outline (docs/codex-desktop-summit.md)

1. Purpose & readiness escalation
2. Local layout & Codex project config
3. Skills discovery and bindings
4. Summit Daily workflow (step-by-step)
5. Git safety and confirmation rules
6. MAESTRO alignment
7. Troubleshooting & rollback

## Troubleshooting & Rollback

- If skill discovery fails, fall back to `skills/` in-repo.
- If GitHub CLI is unavailable, mark PR listing as **Deferred pending GH CLI**.
- Rollback: remove `.codex/` folder and revert any workspace-only files.

## Status

This guide is deterministic and self-contained. It is ready for direct
Codex Desktop integration.
