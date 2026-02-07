# Prompt: Sitrep 2026-02-06 IO/Espionage Docs Pack (v1)

## Objective
Produce the documentation pack for the sitrep-2026-02-06 IO/espionage pipeline, including:
- repo assumptions
- standards doc
- data-handling doc
- ops runbook
- roadmap status update

## Scope
- Files: repo_assumptions.md, docs/standards/sitrep-2026-02-06-io-espionage.md,
  docs/security/data-handling/sitrep-2026-02-06-io-espionage.md,
  docs/ops/runbooks/sitrep-2026-02-06-io-espionage.md,
  docs/roadmap/STATUS.json.
- Update prompts/registry.yaml and add a task-spec JSON under agents/examples.

## Constraints
- Use “source reports” phrasing for attribution.
- Keep evidence artifacts deterministic and timestamp-free inside JSON.
- Feature flag must default OFF.
- End with final, no open questions.
