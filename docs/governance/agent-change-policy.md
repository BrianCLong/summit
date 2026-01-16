Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Agent Output Governance Policy

**Effective Date:** Post-GA
**Applies To:** All automated agents (Jules, Codex, etc.)

## 1. Intent Declaration

Every agent-generated PR must explicitly declare its intent in the PR description.

- **Goal:** What is being achieved?
- **Scope:** What specific files/modules are touched?
- **Context:** Which prompt or issue triggered this?

## 2. Scope Containment

Agents must adhere to the **Safe Parallel Zones** defined in `AGENTS.md`.

- No cross-zone changes without explicit "Multi-Zone" declaration.
- No editing of `AGENTS.md` or Governance policies unless specifically tasked (Self-Modification Ban).

## 3. Metadata Requirement

Agent PRs must include a metadata footer:

```yaml
agent:
  name: "Jules"
  version: "v1.2"
  prompt_id: "post-ga-velocity"
  lane: "Standard"
```

## 4. Review Gates

- **Auto-Review:** Agents cannot self-approve.
- **Drift Check:** Documentation agents must run a drift check against the codebase.
- **Attribution:** Every line of code must be attributable to a specific agent execution (via commit history).

## 5. Revert Policy

If an agent introduces a regression that breaks the "Trust Surface" (CI, Policy, Docs), the PR is immediately reverted, and the agent is suspended from that lane until retrained/prompt-corrected.
