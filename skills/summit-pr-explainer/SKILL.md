---
name: summit-pr-explainer
description: "Summarize Summit pull requests with GA-criticality classification, evidence-first structure, and verification guidance. Use when a user requests a PR explainer, review summary, or a standardized PR comment for a PR number or branch."
---

# Summit PR Explainer

## Workflow

1. Collect PR context: title, description, changed files, checks, linked docs/tests.
2. Build UEF first with concrete entries grouped by area (docs/server/client/infra/policy).
3. Classify criticality:
   - `GA-support` for release-readiness, evidence-gate, CI-gate, or runtime-critical changes.
   - `post-GA` for non-critical or architecture/docs-only changes.
4. Write 3–7 bullets that answer: what changed, why it matters, how to verify.
5. End with one owner-routed next action and due time.

## Output Contract

```markdown
UEF

- Files Changed: <comma-separated file paths>
- Tests and Checks: <exact command names or workflow/check names>
- Evidence Artifacts: <paths or links>

Summary

- <Bullet 1: scope and major files>
- <Bullet 2: intent and impact>
- <Bullet 3: GA-criticality rationale>
- <Bullet 4: verification path>

GA Criticality: <GA-support|post-GA>
Verification:

- Local: <exact command>
- CI: <exact workflow/check>

Next Action: <owner> — <action> by <timestamp or SLA>
```

## Quality Bar

- Keep every statement source-linked and falsifiable.
- Do not use placeholder bullets or ellipses.
- Use exact command/check names in verification lines.
- Close decisively with owner and due time.
