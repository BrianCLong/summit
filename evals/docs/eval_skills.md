# Eval Skills Framework

This framework runs skill evaluations by executing a prompt set, capturing a normalized trace, and grading outputs with deterministic and rubric checks. It produces machine-readable evidence bundles (trace JSONL, grader JSON, JUnit, and Markdown summaries) for CI gates.

## Directory Layout

```
evals/
  skills/
    <skill>/
      skill.md
      prompts.csv
      configs/run.yaml
      graders/
        deterministic.ts
        rubric.schema.json
        rubric_prompt.txt
        rubric.ts
      artifacts/ (gitignored)
      baselines/ (history)
  runner/
    run_skill_eval.ts
    run_skills_changed.ts
    run_skill_suite.ts
    trace-event.schema.json
  docs/
    eval_skills.md
```

## Trace Format

Trace events conform to `evals/runner/trace-event.schema.json` and are stored as JSONL for deterministic scanning. Event categories cover run start/end, case execution, command invocation, file changes, and metrics.

## Deterministic Checks

Deterministic graders inspect trace events and artifacts to verify:
- Trigger accuracy (positive and negative controls)
- Required artifacts exist (and forbidden paths were untouched)
- Command execution outcomes and boundaries

The output is machine-readable:

```json
{
  "overall_pass": true,
  "score": 100,
  "checks": [
    { "id": "trigger-case-1", "pass": true, "notes": "..." }
  ]
}
```

## Rubric Checks

Rubric graders enforce qualitative checks (documentation completeness, prompt coverage, governance alignment). They emit JSON constrained by `rubric.schema.json` for each skill.

## Running Locally

```
make eval-skill SKILL=create-app-module
make eval-skills-changed
make eval-skills-all
```

## CI Gate

The eval-skills workflow executes changed-skill runs on pull requests and the full suite nightly. Artifacts are stored under each skill’s `artifacts/` directory and emitted as CI evidence bundles (trace JSONL, grader JSON, JUnit, summary).

## Adding a New Skill

1. Create `evals/skills/<skill>/skill.md` with Definition, Success Criteria, Constraints, and Definition of Done.
2. Add 10–20 prompts (include negative controls) in `prompts.csv`.
3. Implement deterministic and rubric graders.
4. Update `configs/run.yaml` with command, allowed tools, and forbidden paths.
5. Run `make eval-skill SKILL=<skill>` to generate artifacts and confirm checks.
