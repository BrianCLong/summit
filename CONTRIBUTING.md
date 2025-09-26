# Contributing to IntelGraph

Thank you for your interest in contributing to IntelGraph! This guide will help you get started with contributing to our enterprise intelligence analysis platform.

## 🚀 Quick Start for Contributors

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/summit.git
   cd summit
   ```

2. **Install Dependencies**
   ```bash
   make install
   ```

3. **Start Development Environment**
   ```bash
   make dev
   ```

4. **Run Tests**
   ```bash
   make test lint typecheck security
   ```

## 🏗️ Development Workflow

### Branch Strategy

We use **trunk-based development** with short-lived feature branches:

- `main` - Production-ready code, protected branch
- `feature/feature-name` - Feature development
- `bugfix/issue-description` - Bug fixes
- `hotfix/critical-issue` - Critical production fixes
- `release/YYYY-MM-DD-rc1` - Release candidates

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow our coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   make test           # Run all tests
   make lint           # Check code style
   make typecheck      # TypeScript validation
   make security       # Security scans
   make policy-test    # OPA policy validation
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Open PR on GitHub
   ```

## 📝 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD pipeline changes
- `perf` - Performance improvements
- `security` - Security improvements

### Examples
```bash
# Good commits
git commit -m "feat(auth): add OAuth2 integration"
git commit -m "fix(api): resolve GraphQL timeout issue"
git commit -m "docs: update deployment guide"
git commit -m "security: update dependencies to fix CVE-2023-1234"

# Bad commits
git commit -m "fix stuff"
git commit -m "Update README"
git commit -m "WIP: testing things"
```

## 🧪 Testing Standards

### Test Coverage Requirements
- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys
- **Security Tests**: All authentication flows

### Test Types

#### Unit Tests
```typescript
// Use Jest + Testing Library
describe('UserService', () => {
  it('should create user with valid data', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };
    const user = await userService.create(userData);
    expect(user).toMatchObject(userData);
  });
});
```

#### Integration Tests
```typescript
// Test GraphQL endpoints
describe('User Mutations', () => {
  it('should create user via GraphQL', async () => {
    const mutation = `
      mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) { id email name }
      }
    `;
    const response = await client.mutate({ mutation, variables: { input: userData } });
    expect(response.data.createUser).toBeDefined();
  });
});
```

#### E2E Tests
```typescript
// Use Playwright for browser testing
test('user can log in and access dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 🎨 Code Style Guidelines

### TypeScript/JavaScript
- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **meaningful variable names** and **JSDoc comments**
- Prefer **functional programming** patterns
- Use **async/await** over Promise chains

```typescript
// Good
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }
    return transformToProfile(user);
  } catch (error) {
    logger.error('Failed to fetch user profile', { userId, error });
    throw error;
  }
}

// Bad
function getUserProfile(id) {
  return userRepo.find(id).then(u => {
    if (u) return u;
    else throw new Error('not found');
  });
}
```

### React Components
- Use **functional components** with hooks
- Implement **proper TypeScript interfaces**
- Follow **React best practices**
- Use **semantic HTML** and **accessibility attributes**

```tsx
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  className?: string;
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  const handleEditClick = useCallback(() => {
    onEdit(user);
  }, [user, onEdit]);

  return (
    <div className={clsx('user-card', className)} role="article">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button 
        onClick={handleEditClick}
        aria-label={`Edit ${user.name}'s profile`}
      >
        Edit
      </button>
    </div>
  );
}
```

### GraphQL Schema
- Use **clear, descriptive names**
- Include **field descriptions**
- Follow **GraphQL best practices**
- Implement **proper error handling**

```graphql
type User {
  """Unique identifier for the user"""
  id: ID!
  
  """User's email address (used for login)"""
  email: String!
  
  """User's display name"""
  name: String!
  
  """User's role in the system"""
  role: UserRole!
  
  """Timestamp when user was created"""
  createdAt: DateTime!
}

input CreateUserInput {
  """Valid email address"""
  email: String! @constraint(format: "email")
  
  """Display name (2-50 characters)"""
  name: String! @constraint(minLength: 2, maxLength: 50)
  
  """Initial user role"""
  role: UserRole = USER
}
```

## 🔒 Security Guidelines

### Authentication & Authorization
- Use **JWT tokens** with appropriate expiration
- Implement **RBAC** (Role-Based Access Control)
- Validate **all inputs** on both client and server
- Use **HTTPS** everywhere in production

### Data Protection
- **Never log sensitive data** (passwords, tokens, PII)
- Use **parameterized queries** to prevent SQL injection
- Implement **rate limiting** on all endpoints
- **Sanitize user inputs** to prevent XSS

### Dependencies
- Keep dependencies **up to date**
- Run `pnpm audit` regularly
- Use **exact versions** in production
- Review security advisories

## 🏗️ Architecture Guidelines

### Microservices
- Each service should have a **single responsibility**
- Use **GraphQL** for API communication
- Implement **proper error handling** and **logging**
- Include **health checks** and **metrics**

### Database Design
- Use **Neo4j** for graph data (relationships, networks)
- Use **PostgreSQL** for relational data (users, configs)
- Use **Redis** for caching and sessions
- Implement **proper indexing** and **query optimization**

### Frontend Architecture
- Use **React Query** for server state management
- Use **Zustand** for client state management
- Implement **proper error boundaries**
- Use **React Suspense** for loading states

## 📊 Performance Guidelines

### Backend Performance
- **GraphQL queries** should resolve in < 350ms (p95)
- **Database queries** should be optimized and indexed
- Use **connection pooling** for databases
- Implement **caching** where appropriate

### Frontend Performance
- **Bundle size** should be optimized (< 1MB gzipped)
- **First Contentful Paint** should be < 1.2s
- Use **code splitting** and **lazy loading**
- Implement **proper caching strategies**

## 🚀 Deployment Guidelines

### Feature Flags
- Use **feature flags** for risky changes
- Default new features to **OFF** in production
- Include **kill switches** for critical features
- Monitor feature flag usage and remove unused flags

### Database Migrations
- All migrations must be **backward compatible**
- Include **rollback procedures**
- Test migrations on staging first
- Use **migration gates** in CI/CD

### Monitoring
- Add **metrics** for new features
- Include **proper logging** with correlation IDs
- Set up **alerts** for critical functionality
- Monitor **SLO compliance**

## 🐛 Bug Reports

When reporting bugs, please include:

### Required Information
- **Environment** (dev/staging/prod)
- **Browser/Node version**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** (if applicable)
- **Error messages** or logs

### Bug Report Template
```markdown
## Bug Description
Brief description of the issue

## Environment
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 118]
- Node.js: [e.g., 20.5.0]
- Environment: [dev/staging/prod]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable, add screenshots

## Additional Context
Any other context about the problem
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How would you like it to work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Screenshots, mockups, or examples
```

## 📋 Pull Request Guidelines

### PR Checklist
- [ ] **Tests** added/updated and passing
- [ ] **Documentation** updated
- [ ] **Security review** completed (if applicable)
- [ ] **Performance impact** assessed
- [ ] **Feature flags** implemented (if applicable)
- [ ] **Migration plan** documented (if applicable)

### PR Description Template
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Security improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization verified
- [ ] Dependencies reviewed

## Documentation
- [ ] Code comments updated
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] Runbook updated (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No breaking changes (or properly documented)
- [ ] Feature flag implemented (if applicable)
```

## 🎯 Getting Help

### Resources
- **Documentation**: `/docs` directory
- **API Reference**: `/docs/api`
- **Architecture**: `/docs/architecture`
- **Troubleshooting**: `/docs/troubleshooting`

### Communication
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Code Reviews**: Detailed feedback on PRs

### Mentorship
New contributors are welcome! Feel free to:
- Ask questions in GitHub Discussions
- Request code review feedback
- Pair program with team members
- Attend development sessions

## 🏆 Recognition

We recognize contributors through:
- **GitHub Contributors** graph
- **Release notes** mentions
- **Annual contributor awards**
- **Conference speaking opportunities**

## 📄 Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

**Thank you for contributing to IntelGraph!** 🚀

*Together, we're building the future of intelligence analysis.*

## Post‑Merge Checks (Main)
After a PR merges to `main`, maintainers verify:
1. **CI Evidence artifact** `ci-evidence-<sha>` is present and archived.
2. **Grounding SARIF** uploaded with 0 new warnings, or triaged with labels.
3. **Canary Gate** job passed with no tripwires.

## Threshold Tuning Policy
- `TRAJ_MIN_PASS_RATE`: start **0.95** → raise to **0.98** once the suite has ≥ 25 stable cases.
- `GROUNDING_MIN_SCORE`: start **0.90** → raise to **0.95** after two green weeks.
- `GROUNDING_MAX_GAPS`: keep at **0**. Temporary exceptions require a feature flag and issue link.

## RACI for CI Gates
- **MC** — owns thresholds & evidence policy, approves changes.
- **SRE** — owns `canary-gate.js` inputs (SLO/Cost evidence), monitors lag & error‑budget.
- **Security** — monitors SARIF, tunes grounding cases.
- **QA** — curates trajectory golden‑set growth and flake triage.

## PR Checklist (Contributor)
- [ ] Added/updated trajectory YAMLs and/or grounding cases as needed.
- [ ] `npm run validate:trajectory` and `npm run validate:grounding` green locally.
- [ ] If touching canary‑relevant code, included a short note on expected SLO/cost impact.
