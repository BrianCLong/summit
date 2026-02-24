---
name: summit-skill-router
description: Route Summit/IntelGraph/CompanyOS repository requests to the best existing skills, compose multi-skill plans, and produce deterministic, reviewer-friendly outputs. Use when a request concerns Summit repo work, GA readiness, CI/CD checks, security/supply chain, releases, agent ops, or Summit docs/communications.
---

# Summit Skill Router (GA Orchestrator)

## Mission

Act as the single entrypoint for Summit repo work. Classify intent, discover relevant skills, select and chain the minimum set, and return a concise deterministic plan with reviewer-ready deliverables.

## Operating Rules

- Prefer existing skills over manual work when a relevant skill exists.
- Enumerate available skills at the start of each run and build a capability map.
- Choose the minimum set of skills and avoid redundant steps.
- Keep outputs deterministic: no timestamps, random IDs, or nondeterministic content in artifacts. If runtime metadata is required, emit a separate `stamp.json`.
- Never claim to have run commands or accessed files unless you actually did.
- Surface governance constraints (GA gates, evidence IDs, policy constraints) when applicable.

## Workflow

1. Build capability map
   - Use `scripts/build_capability_map.py` when local skill roots are available.
   - Otherwise, enumerate skills from the environment-provided skill list.
2. Classify intent
   - Use taxonomy in `references/routing-taxonomy.md`.
3. Select skills
   - Prefer Summit/IntelGraph/GA/Evidence/OPA/Merge/CI/Security skills if present.
   - Chain only what is required to satisfy the request.
4. Identify inputs
   - List required files, commands, logs, URLs, or env constraints.
5. Produce response
   - Use the output template in `references/output-template.md`.

## Determinism Checklist

- Sort lists alphabetically where ordering is not semantically meaningful.
- Avoid timestamps; if needed, place in `stamp.json` only.
- Use stable filenames and deterministic ordering in outputs.

## Governance Awareness

- Map outputs to GA gates and evidence IDs when requested or implied.
- Call out required checks, policy constraints, or provenance expectations.
- If coverage is missing, recommend creating a new skill with a name, purpose, and I/O.
