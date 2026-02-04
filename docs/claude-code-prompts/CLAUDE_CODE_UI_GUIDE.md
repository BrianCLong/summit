# Claude Code UI: Best Prompts & Patterns

> **Purpose**: Strong, copy-paste prompts you can use in Claude Code UI right now, depending on what "now" means in your workflow.

If you're unsure where to start, begin with **Prompt #1** ("Repo intake + next move")—it reliably forces a good baseline.

---

## 1) Best default prompt: Repo intake + recommend next steps

Paste this first when you've just opened the repo or you're not sure what to do next:

```text
You are a senior software engineer working inside this repo.

Step 1: Quickly orient.
- Read README / docs and inspect the top-level structure.
- Identify language/runtime, build system, test runner, lint/format tools, and any dev scripts.
- Produce a concise "repo map" (key dirs/files and what they do).

Step 2: Verify the project.
- Determine the minimal commands to install dependencies, run the app, and run tests.
- If commands are missing/unclear, infer likely commands from package files and scripts.

Step 3: Propose the next best 3 tasks.
- Choose high-leverage tasks (fix failing tests, improve DX, remove sharp edges, close obvious bugs, add missing tests, etc.).
- For each task: why it matters, estimated risk, and exact acceptance criteria.

Step 4: Execute the single best task end-to-end.
- Make small, safe changes; keep diffs minimal.
- Add/update tests where appropriate.
- Update documentation if you change behavior.
- At the end, provide: what changed, why, and the exact commands to validate.

If you need clarification, ask at most 3 pointed questions; otherwise proceed with sensible defaults.
```

---

## 2) If you already know the feature: Implement with acceptance criteria

Use this when you know what you want built:

```text
Implement the following feature in this repo:

FEATURE:
<describe what the user should be able to do>

ACCEPTANCE CRITERIA:
- <criterion 1>
- <criterion 2>
- <criterion 3>

CONSTRAINTS:
- Do not introduce new major dependencies unless necessary.
- Keep backward compatibility where possible.
- Prefer small, readable changes over cleverness.
- Add or update tests to cover the new behavior.
- Update docs/README if usage changes.

PROCESS:
1) Find the best integration point(s) in the codebase and explain your plan briefly.
2) Implement in small steps.
3) Show what files changed and why.
4) Provide commands to run tests and a quick manual verification path.
```

**Tip**: The more explicit your acceptance criteria, the better the outcome.

---

## 3) If something is broken: Debug and fix a failing error/test

Use this when you have a stack trace or failing test:

```text
We have a failure to fix.

FAILURE OUTPUT (stack trace / logs / failing test):
<paste here>

TASK:
- Reproduce the issue (identify the command to trigger it).
- Find the root cause (point to the specific code path).
- Fix it with the smallest safe change.
- Add/adjust tests to prevent regression.
- Summarize: root cause, fix, and validation commands.

Important: avoid speculative rewrites; keep the patch tight and well-justified.
```

---

## 4) If you want a cleanup pass: Refactor with guardrails

```text
Perform a targeted refactor focused on maintainability, WITHOUT changing external behavior.

SCOPE:
- <module/dir or feature area>

GOALS:
- Improve readability and reduce complexity.
- Remove dead code or duplicated logic.
- Strengthen typing/interfaces (if applicable).
- Improve test coverage in this area.

GUARDRAILS:
- No behavior changes unless you explicitly call them out.
- Keep diffs small and incremental.
- Ensure tests pass; add tests if missing.

Deliverables:
- Before/after summary of structure
- Key diffs
- Commands to validate
```

---

## 5) If you need tests: Add coverage strategically

```text
Add high-value tests for this repo.

TARGET AREA:
<file/feature/module>

REQUIREMENTS:
- Identify current test framework and conventions.
- Add tests that cover core logic + edge cases.
- Prefer deterministic tests (avoid time/network flakiness).
- If the repo lacks tests, scaffold a minimal test setup consistent with the stack.

Output:
- List of new tests with rationale
- Commands to run tests
- Any small refactors needed to make code testable
```

---

## 6) If you want a fast "ship it" PR: One prompt that yields a PR-ready result

```text
Goal: produce a PR-ready improvement.

Pick ONE meaningful improvement you can complete quickly (bug fix, missing validation, flaky test fix, DX improvement, performance hotspot, etc.). Then:
- Explain the problem and proposed fix briefly.
- Implement with a minimal diff.
- Add/adjust tests.
- Update docs if needed.
- Provide a PR description: summary, motivation, testing, and risk notes.

Do not ask questions unless absolutely necessary.
```

---

## The Single Best "Now" Prompt

If you want us to pick just one: use **Prompt #1 (Repo intake + recommend next steps)**.

It forces orientation, validation, and then action—exactly what you want when you're at "what next?" without a crisp task.

---

## Prompt Selection Guide

### By Situation

| Situation | Use Prompt |
|-----------|-----------|
| **Just opened repo / unsure what to do** | #1 (Repo intake) |
| **Know exactly what feature to build** | #2 (Feature + acceptance criteria) |
| **Have failing test or error** | #3 (Debug & fix) |
| **Want to clean up messy code** | #4 (Refactor with guardrails) |
| **Need better test coverage** | #5 (Add tests strategically) |
| **Want quick win for PR** | #6 (Fast ship-it) |

### By Goal

| Goal | Best Prompt | Why |
|------|------------|-----|
| **Understanding codebase** | #1 | Maps structure + proposes next steps |
| **Implementing new feature** | #2 | Clear criteria + constraints |
| **Fixing bugs** | #3 | Tight focus on root cause |
| **Improving code quality** | #4 | Safe refactor with guardrails |
| **Increasing test coverage** | #5 | Strategic test additions |
| **Getting PR ready** | #6 | End-to-end ownership |

---

## Best Practices

### General Guidelines

1. **Be specific**: The more context and constraints you provide, the better the results
2. **Set clear acceptance criteria**: Define what "done" looks like
3. **Keep diffs small**: Prefer incremental changes over large rewrites
4. **Always include tests**: Testing should be part of every prompt
5. **Update documentation**: If behavior changes, docs should too

### When to Iterate

Sometimes you'll need to run prompts sequentially:

**Example: New feature workflow**
1. Start with #1 (Repo intake) to understand codebase
2. Use #2 (Feature implementation) to build the feature
3. Apply #5 (Add tests) to ensure coverage
4. Run #4 (Refactor) if code needs cleanup
5. Finish with #6 (Ship it) to prepare PR

### Customizing Prompts

Feel free to adapt these prompts to your needs:
- Add project-specific constraints
- Adjust acceptance criteria
- Include team conventions
- Reference specific files or patterns

---

## Related Resources

### Project-Specific Prompts

See [README.md](./README.md) for IntelGraph-specific prompts covering:
- Infrastructure setup
- GraphQL gateway
- Neo4j data modeling
- Security & compliance
- Observability & testing

### Documentation

- [CLAUDE.md](../../CLAUDE.md) - Project conventions
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [TESTING.md](../../TESTING.md) - Testing guidelines

---

## Tips for Success

### Do's
- ✅ Provide clear context and constraints
- ✅ Define explicit acceptance criteria
- ✅ Ask for tests and documentation
- ✅ Request validation commands
- ✅ Keep changes focused and minimal

### Don'ts
- ❌ Vague requests without acceptance criteria
- ❌ Skip testing "to save time"
- ❌ Ask for large rewrites without constraints
- ❌ Omit documentation updates
- ❌ Forget to specify validation steps

---

## Quick Reference Card

### When starting fresh
```
Use: Prompt #1 (Repo intake + recommend next steps)
```

### When you know what to build
```
Use: Prompt #2 (Feature + acceptance criteria)
Fill in: FEATURE, ACCEPTANCE CRITERIA, CONSTRAINTS
```

### When something's broken
```
Use: Prompt #3 (Debug & fix)
Paste: Stack trace or error message
```

### When code is messy
```
Use: Prompt #4 (Refactor with guardrails)
Specify: SCOPE and GOALS
```

### When tests are missing
```
Use: Prompt #5 (Add tests strategically)
Specify: TARGET AREA
```

### When you want quick PR
```
Use: Prompt #6 (Fast ship-it)
Let Claude pick the improvement
```

---

**Remember**: These prompts are tools to help you work faster and more effectively. Adapt them to your workflow and team conventions. The best prompt is one that gets you to shipping quality code quickly. 🚀
