# Workflow: Documentation

Use this workflow when updating documentation.

---

## Scope Guardrails

- **One topic per PR** - Don't mix unrelated docs
- **Accurate only** - Don't speculate; verify claims
- **No code changes** - Unless fixing doc examples
- **Check links** - Ensure all links work

---

## Steps

### 1. Identify the Gap

```
What documentation is missing or wrong?
- Outdated information
- Missing howto/guide
- Incorrect examples
- Broken links
```

### 2. Research Current State

```
Verify the current behavior:
- Read the actual code
- Run the commands yourself
- Test the examples
```

### 3. Write/Update Documentation

```
Make the changes:
- Use clear, concise language
- Include working examples
- Add screenshots if helpful
- Link to related docs
```

### 4. Verify Examples Work

```bash
# If the doc includes commands, run them
<paste example commands from doc>

# If the doc includes code, ensure it compiles
pnpm typecheck
```

---

## Local Commands

```bash
# Check markdown formatting (if linter exists)
pnpm lint -- --ext .md

# Verify any code examples compile
pnpm typecheck

# Before PR
make claude-preflight
```

---

## PR Body Template

```markdown
## Summary

Updates documentation for <topic>

## Changes

- <file1>: <what changed>
- ...

## Why

<Explain why this doc update is needed>

## Verification

- [ ] All examples tested and work
- [ ] Links verified
- [ ] Spelling/grammar checked

### Commands Run
```

<any commands you ran to verify examples>
```

## Risk

Low - Documentation only

## Rollback

Revert this commit: `git revert <sha>`

## Follow-ups

- [ ] <any follow-up tasks, or "None">

```

---

## Checklist Before PR

- [ ] Examples are accurate and work
- [ ] All links are valid
- [ ] No code changes (unless fixing examples)
- [ ] Clear and concise language
- [ ] Spelling/grammar checked
```
