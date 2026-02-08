---
name: summit-ops-incident-console
description: "Configure and operate a Summit Ops & Incident Console in Codex Desktop, including project/thread setup, safe Git/sandbox profiles, monitoring automations, and standardized incident-mode workflows with evidence-first reporting. Use when defining Codex Desktop projects/threads, authoring ops skills, or planning incident response for the Summit repo."
---

# Summit Ops & Incident Console

## Scope

Define a Summit Ops project, standing threads, safe Git profiles, monitoring automations, and an incident-mode workflow for the `BrianCLong/summit` repo. Keep outputs precise, actionable, and evidence-first.

## Required workflow

1. Confirm the project root layout and Codex configuration expectations. Use `references/project-setup.md`.
2. Define standing threads with default goals, auto-loaded skills, and allowed Git operations. Use `references/project-setup.md`.
3. Specify monitoring skills and automations that summarize CI/PR/security signals without taking automated action. Use `references/automations.md`.
4. Provide safe Git/sandbox profile recommendations including `safeCommands` and explicit approval requirements. Use `references/config-profiles.toml`.
5. Deliver an incident-mode procedure that starts in read-only, runs a /plan pass, then proposes diffs. Use `references/incident-mode.md`.

## Output format

- Present a structured plan with the four deliverables in order.
- Include a short “Evidence” block listing files and commands referenced.
- End with a single-sentence finality statement.

## Guardrails

- Do not suggest auto-running migrations, mass refactors, or branch rewrites.
- Require human approval for any Git mutations outside explicit `safeCommands`.
- Keep all recommendations aligned with Summit governance and MAESTRO layering.

## References

- Project + threads: `references/project-setup.md`
- Monitoring skills/automations: `references/automations.md`
- Profiles + safe commands: `references/config-profiles.toml`
- Incident mode procedure: `references/incident-mode.md`
