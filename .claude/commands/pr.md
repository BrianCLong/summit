# Create Pull Request

Create a well-formatted pull request for the current changes following Summit conventions.

## Pre-PR Checklist

Before creating the PR, verify:

1. **Run all quality checks:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test:jest
   ```

2. **Run smoke tests:**
   ```bash
   pnpm smoke
   ```

3. **Check for uncommitted changes:**
   ```bash
   git status
   ```

4. **Review the diff:**
   ```bash
   git diff --stat origin/main...HEAD
   ```

## Creating the PR

1. **Push the branch:**
   ```bash
   git push -u origin $(git branch --show-current)
   ```

2. **Create PR with proper format:**

Use this PR template:

```markdown
## Summary
[1-3 bullet points describing what this PR does]

## Changes
- [List of specific changes made]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Smoke tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add any relevant screenshots]

## Related Issues
Closes #[issue number]

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No console.log or debug statements
- [ ] No secrets or credentials exposed
```

## Commit Message Format

Follow Conventional Commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

## After PR Creation

1. Request reviewers from the appropriate team
2. Add relevant labels (e.g., `area/api`, `type/feature`)
3. Link to any related issues
4. Monitor CI status and address any failures
