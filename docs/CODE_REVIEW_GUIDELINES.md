# Code Review Guidelines - Summit/IntelGraph

> **Purpose**: Establish consistent, high-quality code review standards for the Summit/IntelGraph platform
> **Last Updated**: 2025-11-20

## Table of Contents

- [Overview](#overview)
- [Code Review Philosophy](#code-review-philosophy)
- [Review Process](#review-process)
- [What to Look For](#what-to-look-for)
- [Review Checklist](#review-checklist)
- [Common Issues](#common-issues)
- [Best Practices](#best-practices)
- [Review Etiquette](#review-etiquette)
- [Tools & Automation](#tools--automation)

---

## Overview

Code reviews are essential for:
- **Quality Assurance**: Catch bugs and issues before production
- **Knowledge Sharing**: Spread understanding across the team
- **Consistency**: Maintain coding standards and patterns
- **Mentorship**: Help team members grow and learn
- **Security**: Identify security vulnerabilities early

### Goals

✅ **DO**:
- Ensure code quality and correctness
- Share knowledge and best practices
- Maintain project standards
- Provide constructive feedback
- Approve code that improves the codebase

❌ **DON'T**:
- Block progress with nitpicks
- Demand perfection on first attempt
- Make it personal
- Review code you don't understand without asking questions
- Approve without careful review

---

## Code Review Philosophy

### The Golden Path Principle

Every change must maintain the golden path:
```bash
make bootstrap && make up && make smoke
```

If a PR breaks this workflow, it should not be merged.

### Production-Ready MVP

- Every commit should maintain production readiness
- No "we'll fix it later" - address issues now or create tracking issues
- Technical debt should be intentional and documented

### Reviewer Responsibility

As a reviewer, you share responsibility for the code. Only approve changes you would be comfortable maintaining yourself.

---

## Review Process

### 1. Initial Review (5-10 minutes)

**Quick Scan:**
- [ ] Read the PR description and understand the goal
- [ ] Check the type of change (bug fix, feature, refactor, etc.)
- [ ] Review the diff size - large PRs may need to be broken up
- [ ] Check that CI is green before detailed review
- [ ] Verify the PR checklist is complete

**Decision Point:**
- If PR is too large (>500 lines), request it be broken up
- If PR description is unclear, request clarification
- If CI is red, ask author to fix before review

### 2. Detailed Review (15-45 minutes)

**Code Analysis:**
- Review each file systematically
- Understand the logic and flow
- Check for edge cases and error scenarios
- Verify tests cover the changes
- Look for security issues
- Check performance implications

**Testing:**
- Pull the branch locally
- Run tests: `pnpm test`
- Run smoke tests: `make smoke`
- Test manually if UI/UX changes
- Verify golden path still works

### 3. Feedback & Discussion

**Provide Feedback:**
- Leave inline comments on specific lines
- Use GitHub's suggestion feature for quick fixes
- Group related comments together
- Distinguish between "must fix" and "nice to have"
- Explain the "why" behind your comments

**Categorize Comments:**
- 🔴 **Blocker**: Must be fixed before merge
- 🟡 **Suggestion**: Should be considered but not required
- 🟢 **Nitpick**: Optional improvement
- 💡 **Idea**: Alternative approach for consideration
- ❓ **Question**: Clarification needed

### 4. Approval or Request Changes

**Approve when:**
- Code is correct and well-tested
- Standards are met
- No security/performance issues
- Golden path maintained
- All blockers addressed

**Request Changes when:**
- Bugs or logic errors found
- Tests insufficient or missing
- Security vulnerabilities present
- Standards not followed
- Breaking changes not justified

**Comment (no approval) when:**
- Minor suggestions that don't block merge
- Questions for clarification
- Nice-to-have improvements

---

## What to Look For

### 1. Correctness

**Logic & Implementation:**
- [ ] Code does what the PR description claims
- [ ] Logic is sound and handles edge cases
- [ ] Error handling is comprehensive
- [ ] No obvious bugs or issues
- [ ] Async code handled properly
- [ ] Race conditions avoided

**Example Issues:**
```typescript
// ❌ Bad: No error handling
const user = await getUserById(id);
user.updateProfile(data);

// ✅ Good: Proper error handling
try {
  const user = await getUserById(id);
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  await user.updateProfile(data);
} catch (error) {
  logger.error('Failed to update user profile', { id, error });
  throw error;
}
```

### 2. Testing

**Test Coverage:**
- [ ] Unit tests for new functions/methods
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Coverage meets 80%+ threshold

**Test Quality:**
- [ ] Tests are clear and well-named
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests use proper assertions
- [ ] No `.only()` or `.skip()` committed
- [ ] Mocks used appropriately

**Example:**
```typescript
// ❌ Bad: Vague test name, no cleanup
test('it works', async () => {
  const result = await doSomething();
  expect(result).toBeTruthy();
});

// ✅ Good: Clear name, proper setup/cleanup
describe('UserService.updateProfile', () => {
  let user: User;
  
  beforeEach(async () => {
    user = await userFactory();
  });
  
  afterEach(async () => {
    await cleanupTestData();
  });
  
  it('should update user profile with valid data', async () => {
    const updates = { name: 'New Name' };
    const result = await userService.updateProfile(user.id, updates);
    
    expect(result.name).toBe('New Name');
    expect(result.updatedAt).toBeAfter(user.updatedAt);
  });
  
  it('should throw NotFoundError when user does not exist', async () => {
    await expect(
      userService.updateProfile('invalid-id', {})
    ).rejects.toThrow(NotFoundError);
  });
});
```

### 3. Security

**Security Checklist:**
- [ ] No secrets or credentials in code
- [ ] Input validation present
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (proper escaping)
- [ ] Authentication checked
- [ ] Authorization enforced
- [ ] Sensitive data encrypted
- [ ] Audit logging present

**Example Issues:**
```typescript
// ❌ Bad: SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good: Parameterized query
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// ❌ Bad: No authorization check
async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
}

// ✅ Good: Authorization check
async function deleteUser(userId: string, requesterId: string) {
  await authorize(requesterId, 'user:delete', userId);
  await db.user.delete({ where: { id: userId } });
  await auditLog.log('user_deleted', { userId, requesterId });
}
```

### 4. Performance

**Performance Considerations:**
- [ ] No N+1 queries
- [ ] Pagination for large datasets
- [ ] Indexes on database queries
- [ ] Caching where appropriate
- [ ] Batch operations used
- [ ] No obvious memory leaks

**Example Issues:**
```typescript
// ❌ Bad: N+1 query problem
const users = await db.user.findMany();
for (const user of users) {
  user.posts = await db.post.findMany({ where: { userId: user.id } });
}

// ✅ Good: Single query with join
const users = await db.user.findMany({
  include: { posts: true }
});

// ❌ Bad: Loading entire dataset
const allEntities = await db.entity.findMany();

// ✅ Good: Pagination
const entities = await db.entity.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize
});
```

### 5. Code Quality

**Readability:**
- [ ] Code is self-documenting
- [ ] Variable/function names are clear
- [ ] Complex logic has comments
- [ ] Consistent formatting
- [ ] No commented-out code
- [ ] No console.log statements

**Maintainability:**
- [ ] DRY principle followed (no unnecessary duplication)
- [ ] Functions are focused and single-purpose
- [ ] Proper separation of concerns
- [ ] TypeScript types used properly
- [ ] No excessive use of `any`

**Example:**
```typescript
// ❌ Bad: Unclear, no types, does too much
function proc(d: any) {
  const r = d.map(x => x.val * 2);
  const f = r.filter(x => x > 10);
  console.log(f);
  return f.reduce((a, b) => a + b) / f.length;
}

// ✅ Good: Clear, typed, single responsibility
interface DataPoint {
  value: number;
}

function doubleValues(data: DataPoint[]): number[] {
  return data.map(point => point.value * 2);
}

function filterAboveThreshold(values: number[], threshold: number): number[] {
  return values.filter(value => value > threshold);
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate average of empty array');
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

// Usage
function processData(data: DataPoint[]): number {
  const doubled = doubleValues(data);
  const filtered = filterAboveThreshold(doubled, 10);
  return calculateAverage(filtered);
}
```

### 6. Architecture & Design

**Design Patterns:**
- [ ] Follows established project patterns
- [ ] Proper abstraction levels
- [ ] No tight coupling
- [ ] Dependencies injected properly
- [ ] Interfaces used where appropriate

**Breaking Changes:**
- [ ] Breaking changes justified
- [ ] Migration path provided
- [ ] Backwards compatibility considered
- [ ] Deprecation warnings added

---

## Review Checklist

### Quick Checklist (2 minutes)

```markdown
- [ ] CI is green
- [ ] PR description is clear
- [ ] Tests are present
- [ ] No obvious security issues
- [ ] No secrets committed
- [ ] Golden path maintained
```

### Comprehensive Checklist (15 minutes)

**Functionality:**
- [ ] Code implements stated requirements
- [ ] Edge cases handled
- [ ] Error scenarios covered
- [ ] Logic is correct

**Testing:**
- [ ] Unit tests present and passing
- [ ] Integration tests for workflows
- [ ] Tests are well-written
- [ ] Coverage adequate (80%+)

**Security:**
- [ ] No security vulnerabilities
- [ ] Input validation present
- [ ] Authorization checked
- [ ] Sensitive data protected

**Performance:**
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] Caching considered
- [ ] Scalability addressed

**Code Quality:**
- [ ] Code is readable and maintainable
- [ ] Follows project standards
- [ ] TypeScript types proper
- [ ] No code smells

**Documentation:**
- [ ] README updated if needed
- [ ] API docs updated
- [ ] Complex logic commented
- [ ] Environment vars documented

**Build & Deploy:**
- [ ] Build succeeds
- [ ] No new warnings
- [ ] Dependencies justified
- [ ] Migrations included

---

## Common Issues

### Issue Categories

1. **Critical** (Block merge immediately):
   - Security vulnerabilities
   - Data loss risk
   - Production downtime risk
   - Breaking changes without migration

2. **High Priority** (Should fix before merge):
   - Logic errors
   - Missing tests
   - Performance issues
   - Incomplete error handling

3. **Medium Priority** (Consider fixing):
   - Code quality issues
   - Minor inefficiencies
   - Documentation gaps
   - Style inconsistencies

4. **Low Priority** (Optional):
   - Nitpicks
   - Alternative approaches
   - Future improvements
   - Style preferences

### Frequently Flagged Issues

**Security:**
- Hardcoded secrets
- Missing input validation
- SQL injection vulnerabilities
- Missing authentication/authorization

**Testing:**
- Missing test coverage
- Flaky tests
- Tests not testing anything meaningful
- Committed `.only()` or `.skip()`

**Code Quality:**
- Excessive use of `any` in TypeScript
- Long, complex functions
- Commented-out code
- Console.log statements

**Performance:**
- N+1 query problems
- Loading entire datasets without pagination
- Missing indexes
- Inefficient algorithms

---

## Best Practices

### For Authors

**Before Requesting Review:**
1. Self-review your own PR
2. Run all checks locally: `pnpm ci`
3. Ensure CI is green
4. Write clear PR description
5. Add comments explaining complex logic
6. Keep PRs small and focused (<500 lines)

**During Review:**
1. Respond to all comments
2. Ask questions if feedback unclear
3. Push additional commits to address feedback
4. Mark conversations as resolved when fixed
5. Be open to feedback and suggestions

### For Reviewers

**Review Timing:**
- Review within 24 hours (ideally same day)
- Prioritize blocking PRs
- Schedule dedicated review time

**Review Quality:**
- Take time to understand the change
- Test locally for complex changes
- Provide actionable feedback
- Explain reasoning behind comments
- Suggest specific improvements

**Communication:**
- Be respectful and constructive
- Praise good work
- Ask questions instead of making demands
- Assume good intentions
- Focus on the code, not the person

---

## Review Etiquette

### Giving Feedback

**Do:**
- ✅ Be specific: "This function could throw if data is null"
- ✅ Explain why: "We should validate input to prevent errors"
- ✅ Suggest solutions: "Consider adding a null check here"
- ✅ Ask questions: "Could this cause a race condition?"
- ✅ Praise good work: "Nice solution to the caching issue!"

**Don't:**
- ❌ Be vague: "This doesn't look right"
- ❌ Be demanding: "Change this immediately"
- ❌ Be condescending: "Everyone knows you should do X"
- ❌ Make it personal: "You always forget to add tests"
- ❌ Only criticize: Balance feedback with positives

### Receiving Feedback

**Do:**
- ✅ Thank reviewers for their time
- ✅ Ask for clarification if needed
- ✅ Consider suggestions objectively
- ✅ Explain your reasoning politely
- ✅ Learn from the feedback

**Don't:**
- ❌ Take it personally
- ❌ Get defensive
- ❌ Ignore feedback without discussion
- ❌ Dismiss suggestions outright
- ❌ Rush to merge without addressing concerns

### Example Comments

**Good:**
```
🔴 Blocker: This query could cause an N+1 problem. Consider using 
\`include\` to load related data in a single query:

\`\`\`typescript
const users = await db.user.findMany({
  include: { posts: true }
});
\`\`\`

This would improve performance significantly for users with many posts.
```

**Not Ideal:**
```
This is wrong. Fix it.
```

---

## Tools & Automation

### Automated Checks

Our CI automatically checks:
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Tests (Jest, Playwright)
- ✅ Security scanning (Gitleaks, Trivy)
- ✅ Dependency audit
- ✅ Build success

**Trust but Verify**: Automated checks catch many issues, but manual review is still essential.

### Review Tools

**GitHub Features:**
- Use inline comments for specific feedback
- Use suggestion feature for quick fixes
- Use review status (Approve/Request Changes/Comment)
- Use draft PRs for work-in-progress

**Local Testing:**
```bash
# Pull PR and test locally
gh pr checkout <PR-NUMBER>

# Or with git
git fetch origin pull/<PR-NUMBER>/head:pr-<PR-NUMBER>
git checkout pr-<PR-NUMBER>

# Run full validation
pnpm ci

# Run golden path
make smoke
```

### AI-Assisted Review

Consider using AI tools for:
- Suggesting tests
- Identifying potential bugs
- Code quality improvements
- Security vulnerability detection

**But remember**: AI suggestions should be reviewed by humans. Don't blindly accept AI feedback.

---

## Special Cases

### Large PRs

If a PR is > 500 lines:
1. Ask if it can be broken up
2. If not, schedule dedicated review time
3. Review in multiple sessions
4. Focus on high-level architecture first
5. Then review details

### Urgent Fixes

For production hotfixes:
- Still require review (even if abbreviated)
- Focus on correctness and safety
- Ensure rollback plan exists
- Create follow-up issue for proper testing

### Documentation PRs

Even docs need review:
- Check for accuracy
- Verify links work
- Ensure clarity
- Check spelling/grammar
- Test code examples

### Dependency Updates

Review carefully:
- Check changelog for breaking changes
- Verify security fixes
- Test thoroughly
- Check bundle size impact
- Ensure licenses compatible

---

## Metrics & Goals

### Review Speed

**Target**: First response within 24 hours
- Critical/urgent: 2-4 hours
- Normal: 24 hours
- Low priority: 48 hours

### Review Thoroughness

**Minimum time**: 15 minutes for substantial PRs
- Don't rubber-stamp
- Actually test the changes
- Think about edge cases

### Approval Rate

**Healthy**: 60-80% approved on first review
- Too high (>90%): Reviews may not be thorough enough
- Too low (<50%): PRs may need better self-review

---

## Resources

### Internal Documentation
- [CLAUDE.md](../CLAUDE.md) - Complete development guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

### External Resources
- [Google Engineering Practices](https://google.github.io/eng-practices/review/)
- [Conventional Comments](https://conventionalcomments.org/)
- [Pull Request Best Practices](https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/)

---

## Summary

**Key Principles:**
1. **Golden Path First**: Changes must maintain `make bootstrap && make up && make smoke`
2. **Quality Over Speed**: Take time to review properly
3. **Shared Responsibility**: Reviewers share ownership of approved code
4. **Constructive Feedback**: Help team members improve
5. **Production Ready**: Every merge should be deployable

**Remember**: Code review is a conversation, not a gatekeeping exercise. The goal is to improve the code and share knowledge, not to find fault.

---

**Questions?** Reach out in #engineering or consult the team leads.
