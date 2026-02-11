---
name: summit-pr-explainer
description: "Summarize Summit pull requests with GA-criticality classification, evidence-first structure, and verification guidance. Use when a user requests a PR explainer, review summary, or a standardized PR comment for a PR number or branch."
---

# Summit PR Explainer

## Workflow

1. Collect PR context (title, description, diff, changed files, checks).
2. Build UEF section first:
   - changed files grouped by area
   - referenced tests/workflows
   - referenced docs/evidence artifacts
3. Classify criticality:
   - `GA-support` when release-readiness, evidence gates, or runtime-critical surfaces are affected
   - `post-GA` for non-critical/docs-only/deferred architecture work
4. Produce 3–7 summary bullets:
   - what changed
   - why it matters
   - how to verify
5. Close with owner-routed next action.

## Output Contract

```markdown
UEF

- Files: ...
- Tests/Checks: ...
- Evidence: ...

Summary

- ...
- ...
- ...

GA Criticality: <GA-support|post-GA>
Verification: <local commands + CI checks>
Next Action: <owner + action + due>
```

## Quality Bar

- Keep statements source-linked and concrete.
- Avoid placeholders and vague language.
- End with a decisive next action.
