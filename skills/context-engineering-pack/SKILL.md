---
name: context-engineering-pack
version: 1.0.0
description: |
  Summit/IntelGraph context-engineering skill pack. Routes to the vendored
  Agent Skills for Context Engineering library via progressive disclosure,
  and applies repo-specific guardrails (atomic PRs, evidence, governance).
tags:
  - context-engineering
  - skills-routing
  - long-horizon
  - ga-readiness
license: MIT
dependencies:
  - skills/vendor/agent-skills-context-engineering
---

# Context Engineering Pack (Summit)

## Purpose

This pack integrates the upstream “Agent Skills for Context Engineering” library
as a vendored dependency and provides **routing rules** so agents load only the
minimum necessary instructions.

**Upstream location (vendored):**
`skills/vendor/agent-skills-context-engineering/skills/`

## Operating Rules (Summit-specific)

1. **Progressive disclosure only**
   - Do **NOT** load every skill into context.
   - Start with a directory scan + short descriptions, then load 1–3 relevant
     skills’ `SKILL.md` only when needed.

2. **Atomic PR surfaces**
   - Prefer changes that touch a single coherent file surface.
   - If multiple surfaces are needed, split into separate PR prompts.

3. **Evidence-first for GA**
   - When a change affects release/CI/security: include tests, checks, and
     “how to verify” steps.

## Routing Heuristics (when to consult upstream)

Use the upstream library when you see:

- long-running tasks / “agent gets worse over time”
- too much context / tool output spam / “lost in the middle”
- multi-agent coordination issues
- RAG/citations quality problems
- evaluation needs (LLM-as-judge, pairwise evals, bias mitigation)

## How to Load Upstream Skills (agent procedure)

1. List candidate skills:
   - Look in: `skills/vendor/agent-skills-context-engineering/skills/`
   - Identify 3–7 likely skill folders by name.

2. Read only metadata first:
   - For each candidate folder, open the first ~60 lines of `SKILL.md`
     (YAML + intro) to get name/description.

3. Select + load:
   - Choose the best 1–3 skills.
   - Load their `SKILL.md` fully.
   - Apply them to the current task.

4. If still failing:
   - Add at most 1 additional skill.
   - If context is bloated, summarize tool outputs and compress history.

## Common “first picks”

- context-fundamentals
- context-degradation
- context-optimization
- multi-agent-architecture
- evaluation / llm-as-judge (when judging outputs)
