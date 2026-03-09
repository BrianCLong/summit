# Code Review Command

Perform a comprehensive code review of the specified files or changes.

## Instructions

### Review Current Changes
```bash
git diff --name-only HEAD~1
```

Then read and analyze each changed file for:

1. **Correctness**
   - Logic errors
   - Edge cases not handled
   - Null/undefined checks

2. **Security**
   - Input validation
   - SQL/NoSQL injection risks
   - XSS vulnerabilities
   - Secrets exposure
   - Authentication/authorization checks

3. **Performance**
   - N+1 queries
   - Unnecessary re-renders
   - Memory leaks
   - Large bundle impacts

4. **Code Quality**
   - TypeScript types (avoid `any`)
   - Error handling
   - Code duplication
   - Function complexity

5. **Testing**
   - Adequate test coverage
   - Edge cases tested
   - No `.only()` or `.skip()`

6. **Documentation**
   - Complex logic explained
   - API changes documented
   - Types/interfaces clear

## Review Checklist

```markdown
## Code Review Findings

### Critical Issues
- [ ] Issue 1...

### Suggestions
- [ ] Suggestion 1...

### Positive Observations
- Highlight good patterns found

### Summary
Overall assessment and recommendation (approve/request changes)
```

## Common Patterns to Flag

**Security Issues:**
- `eval()` or `Function()` usage
- Unvalidated user input
- Hardcoded secrets
- Missing auth checks

**Performance Issues:**
- Queries inside loops
- Large objects in state
- Synchronous blocking operations

**TypeScript Issues:**
- `any` types that could be specific
- Missing null checks
- Inconsistent error types

## Provide Actionable Feedback

For each issue found, provide:
1. **Location**: File and line number
2. **Problem**: What's wrong
3. **Impact**: Why it matters
4. **Solution**: How to fix it
