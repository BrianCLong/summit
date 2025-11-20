# Coding Standards and Best Practices

> **Last Updated**: 2025-11-20
> **Purpose**: This document defines coding standards, best practices, and quality gates for the IntelGraph platform.

## Table of Contents

1. [Code Quality Philosophy](#code-quality-philosophy)
2. [TypeScript/JavaScript Standards](#typescriptjavascript-standards)
3. [Code Complexity Guidelines](#code-complexity-guidelines)
4. [Security Best Practices](#security-best-practices)
5. [Testing Standards](#testing-standards)
6. [Documentation Requirements](#documentation-requirements)
7. [Code Review Guidelines](#code-review-guidelines)
8. [Quality Gates](#quality-gates)

---

## Code Quality Philosophy

### Core Principles

1. **Readability First**: Code is read 10x more than it's written
2. **Simplicity Over Cleverness**: Simple code is maintainable code
3. **Boy Scout Rule**: Leave code better than you found it
4. **Fail Fast**: Explicit errors are better than silent failures
5. **Don't Repeat Yourself (DRY)**: But don't over-abstract too early

### Quality Metrics

| Metric | Target | Current Threshold | Action |
|--------|--------|-------------------|--------|
| Code Coverage | 80% | 70% | Increase gradually |
| Cyclomatic Complexity | ≤ 10 | ≤ 15 | Reduce over time |
| Cognitive Complexity | ≤ 10 | ≤ 15 | Reduce over time |
| File Length | ≤ 300 lines | ≤ 500 lines | Refactor large files |
| Function Length | ≤ 50 lines | ≤ 100 lines | Extract smaller functions |
| Duplication | ≤ 3% | ≤ 5% | Refactor duplicates |
| Technical Debt Ratio | < 5% (A) | < 5% (A) | Maintain rating |

---

## TypeScript/JavaScript Standards

### General Rules

#### 1. Use TypeScript for Type Safety

```typescript
// ✅ Good: Explicit types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function getUser(id: string): Promise<User> {
  return userRepository.findById(id);
}

// ❌ Bad: Implicit any
function getUser(id) {
  return userRepository.findById(id);
}
```

#### 2. Avoid `any` Type

```typescript
// ✅ Good: Use proper types or unknown
function processData(data: unknown): Result {
  if (isValidData(data)) {
    return transformData(data);
  }
  throw new Error('Invalid data');
}

// ❌ Bad: Using any
function processData(data: any): any {
  return transformData(data);
}
```

#### 3. Use Strict Null Checks

```typescript
// ✅ Good: Handle null explicitly
function findUser(id: string): User | null {
  const user = users.find(u => u.id === id);
  return user ?? null;
}

// Usage
const user = findUser('123');
if (user !== null) {
  console.log(user.name);
}

// ❌ Bad: Undefined behavior
function findUser(id: string): User {
  return users.find(u => u.id === id); // Could return undefined
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class UserService { }
class GraphAnalyzer { }

// Interfaces/Types: PascalCase
interface UserData { }
type UserId = string;

// Variables/Functions: camelCase
const userName = 'John';
function getUserById(id: string) { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Private properties: _prefix (optional)
class UserService {
  private _cache: Map<string, User>;
}

// Boolean variables: is/has/can prefix
const isValid = true;
const hasPermission = false;
const canEdit = true;
```

### Import Organization

Enforced by ESLint `import` plugin:

```typescript
// 1. External dependencies (alphabetized)
import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import express from 'express';

// 2. Internal packages (alphabetized)
import { EntityService } from '@intelgraph/entities';
import { GraphService } from '@intelgraph/graph';
import { Logger } from '@intelgraph/logger';

// 3. Relative imports (alphabetized)
import { AuthGuard } from '../guards/auth.guard';
import { UserDto } from '../dto/user.dto';
import { validateInput } from './validation';
```

### Error Handling

```typescript
// ✅ Good: Explicit error handling
async function fetchUserData(id: string): Promise<User> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('API error fetching user', { id, error });
      throw new UserNotFoundError(id);
    }
    throw error; // Re-throw unexpected errors
  }
}

// ❌ Bad: Silent failures
async function fetchUserData(id: string): Promise<User | null> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    return null; // What went wrong? Why did it fail?
  }
}
```

### Async/Await

```typescript
// ✅ Good: Use async/await
async function processUsers(ids: string[]): Promise<void> {
  const users = await Promise.all(
    ids.map(id => fetchUser(id))
  );

  for (const user of users) {
    await updateUser(user);
  }
}

// ❌ Bad: Promise chains
function processUsers(ids: string[]): Promise<void> {
  return Promise.all(ids.map(id => fetchUser(id)))
    .then(users => {
      return users.reduce((promise, user) => {
        return promise.then(() => updateUser(user));
      }, Promise.resolve());
    });
}
```

---

## Code Complexity Guidelines

### Cyclomatic Complexity

**Rule**: Max 15 (reduce to 10 over time)

```typescript
// ❌ Bad: Complexity = 8
function validateUser(user: User): boolean {
  if (!user) return false;
  if (!user.email) return false;
  if (!user.name) return false;
  if (user.age < 0) return false;
  if (user.age > 150) return false;
  if (!user.role) return false;
  if (user.role !== 'admin' && user.role !== 'user') return false;
  return true;
}

// ✅ Good: Complexity = 2, Use guard clauses
function validateUser(user: User): boolean {
  if (!user?.email || !user?.name) {
    return false;
  }

  if (user.age < 0 || user.age > 150) {
    return false;
  }

  return ['admin', 'user'].includes(user.role);
}

// ✅ Better: Use validation library (zod, joi, yup)
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().min(0).max(150),
  role: z.enum(['admin', 'user']),
});

function validateUser(user: unknown): boolean {
  return UserSchema.safeParse(user).success;
}
```

### Nesting Depth

**Rule**: Max 4 levels

```typescript
// ❌ Bad: Deep nesting (5 levels)
function processOrder(order: Order): void {
  if (order) {
    if (order.items) {
      for (const item of order.items) {
        if (item.quantity > 0) {
          if (item.inStock) {
            processItem(item);
          }
        }
      }
    }
  }
}

// ✅ Good: Early returns, flat structure
function processOrder(order: Order): void {
  if (!order?.items) return;

  const validItems = order.items.filter(
    item => item.quantity > 0 && item.inStock
  );

  validItems.forEach(processItem);
}
```

### Function Length

**Rule**: Max 100 lines (target 50)

```typescript
// ❌ Bad: 200-line function doing everything
function processInvestigation(investigation: Investigation): Result {
  // 200 lines of mixed logic
  // - Validation
  // - Data transformation
  // - API calls
  // - Database updates
  // - Email notifications
  // - Audit logging
}

// ✅ Good: Extract responsibilities
function processInvestigation(investigation: Investigation): Result {
  validateInvestigation(investigation);

  const transformedData = transformInvestigationData(investigation);
  const entities = enrichEntitiesWithExternalData(transformedData.entities);

  const result = saveToDatabase(entities, transformedData.relationships);

  sendNotifications(investigation.assignees, result);
  logAuditEvent('investigation.processed', { id: investigation.id });

  return result;
}
```

### Class Design

**Rules**:
- Max 20 methods per class
- Single Responsibility Principle
- Prefer composition over inheritance

```typescript
// ❌ Bad: God Object (117 methods)
class UserService {
  createUser() { }
  updateUser() { }
  deleteUser() { }
  authenticateUser() { }
  authorizeUser() { }
  generateToken() { }
  refreshToken() { }
  validateToken() { }
  sendWelcomeEmail() { }
  sendPasswordReset() { }
  // ... 107 more methods
}

// ✅ Good: Separated concerns
class UserRepository {
  create(user: User): Promise<User> { }
  update(id: string, updates: Partial<User>): Promise<User> { }
  delete(id: string): Promise<void> { }
  findById(id: string): Promise<User | null> { }
}

class AuthenticationService {
  authenticate(credentials: Credentials): Promise<AuthResult> { }
  generateToken(user: User): string { }
  refreshToken(token: string): string { }
  validateToken(token: string): boolean { }
}

class AuthorizationService {
  authorize(user: User, resource: Resource, action: Action): boolean { }
  checkPermission(user: User, permission: Permission): boolean { }
}

class UserNotificationService {
  sendWelcomeEmail(user: User): Promise<void> { }
  sendPasswordReset(user: User): Promise<void> { }
}

// Orchestration
class UserService {
  constructor(
    private userRepo: UserRepository,
    private authService: AuthenticationService,
    private notificationService: UserNotificationService
  ) {}

  async registerUser(userData: UserData): Promise<User> {
    const user = await this.userRepo.create(userData);
    await this.notificationService.sendWelcomeEmail(user);
    return user;
  }
}
```

---

## Security Best Practices

### 1. No Hardcoded Secrets

```typescript
// ❌ Bad: Hardcoded secrets
const API_KEY = 'sk_live_abc123...';
const DATABASE_URL = 'postgresql://user:password@localhost/db';

// ✅ Good: Environment variables
const API_KEY = process.env.API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

### 2. Input Validation

```typescript
// ❌ Bad: No validation
function getUser(req: Request, res: Response) {
  const userId = req.params.id;
  const user = db.query(`SELECT * FROM users WHERE id = ${userId}`); // SQL injection!
  res.json(user);
}

// ✅ Good: Validation + parameterized queries
function getUser(req: Request, res: Response) {
  const userId = UserIdSchema.parse(req.params.id); // Validate
  const user = db.query('SELECT * FROM users WHERE id = $1', [userId]); // Parameterized
  res.json(user);
}
```

### 3. No eval() or Function()

```typescript
// ❌ Bad: eval is dangerous
const userInput = req.body.expression;
const result = eval(userInput); // Arbitrary code execution!

// ✅ Good: Use safe alternatives
const allowedOperations = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
};

const operation = allowedOperations[req.body.operation];
if (!operation) throw new Error('Invalid operation');
const result = operation(req.body.a, req.body.b);
```

### 4. Sanitize Output

```typescript
// ❌ Bad: XSS vulnerability
function renderUserProfile(user: User) {
  return `<div class="profile">${user.bio}</div>`; // Unsanitized HTML
}

// ✅ Good: Escape HTML
import DOMPurify from 'dompurify';

function renderUserProfile(user: User) {
  const sanitizedBio = DOMPurify.sanitize(user.bio);
  return `<div class="profile">${sanitizedBio}</div>`;
}
```

### 5. Proper Logging

```typescript
// ❌ Bad: Log sensitive data
logger.info('User logged in', {
  email: user.email,
  password: user.password // Never log passwords!
});

// ✅ Good: Redact sensitive data
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  // No sensitive fields
});
```

---

## Testing Standards

### Code Coverage

- **Target**: 80% overall
- **New Code**: > 80% required
- **Critical Paths**: 100% required (auth, payments, data integrity)

### Test Structure

```typescript
// ✅ Good: AAA pattern (Arrange, Act, Assert)
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user' as const,
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toHaveProperty('id');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should throw error when email is invalid', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        role: 'user' as const,
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email');
    });
  });
});
```

### Test Naming

```typescript
// ✅ Good: Descriptive test names
it('should return 404 when user does not exist')
it('should update user email when valid email provided')
it('should throw UnauthorizedError when token is expired')

// ❌ Bad: Vague test names
it('works')
it('test user')
it('should pass')
```

### Test Coverage Rules

```typescript
// ❌ Don't test trivial code
class User {
  get fullName() {
    return `${this.firstName} ${this.lastName}`; // No test needed
  }
}

// ✅ Do test complex logic
function calculateRiskScore(investigation: Investigation): number {
  // Complex algorithm - needs tests for:
  // - Normal cases
  // - Edge cases
  // - Error cases
  return score;
}
```

---

## Documentation Requirements

### Code Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the API during rate limit errors
const delay = Math.pow(2, attempt) * 1000;

// ❌ Bad: Redundant comment
// Set delay to 2 to the power of attempt times 1000
const delay = Math.pow(2, attempt) * 1000;
```

### JSDoc for Public APIs

```typescript
/**
 * Analyzes an investigation to identify high-risk entities and relationships.
 *
 * @param investigation - The investigation to analyze
 * @param options - Analysis options including risk thresholds and algorithms
 * @returns Risk analysis results including entity scores and flagged patterns
 * @throws {ValidationError} When investigation data is invalid
 * @throws {AnalysisError} When analysis fails due to missing data
 *
 * @example
 * ```typescript
 * const result = await analyzeInvestigation(investigation, {
 *   riskThreshold: 0.7,
 *   algorithm: 'bayesian',
 * });
 * console.log(result.highRiskEntities);
 * ```
 */
async function analyzeInvestigation(
  investigation: Investigation,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing API endpoints
- Modifying environment variables
- Updating deployment procedures

---

## Code Review Guidelines

### For Authors

**Before Requesting Review**:
- [ ] All tests pass locally
- [ ] Code is self-reviewed
- [ ] No console.log or debugger statements
- [ ] Comments explain complex logic
- [ ] Commit messages follow Conventional Commits
- [ ] PR description is detailed (> 50 chars)
- [ ] Linked related issue (#123)

### For Reviewers

**Focus Areas**:
1. **Correctness**: Does the code do what it claims?
2. **Security**: Any vulnerabilities or data leaks?
3. **Performance**: Any N+1 queries or inefficient algorithms?
4. **Maintainability**: Is it readable and testable?
5. **Standards**: Follows coding conventions?

**Review Checklist**:
- [ ] Code solves the stated problem
- [ ] No security vulnerabilities
- [ ] Error handling is comprehensive
- [ ] Tests cover happy path and edge cases
- [ ] No code duplication
- [ ] Complexity is acceptable
- [ ] Documentation is updated

**Review Tone**:
- Be kind and constructive
- Ask questions instead of making demands
- Provide specific examples
- Praise good solutions

```markdown
// ✅ Good review comment
This function has high complexity (18). Consider extracting the validation
logic into a separate validateInput() function. This would make it easier
to test and reduce cognitive load.

// ❌ Bad review comment
This is too complex. Refactor it.
```

---

## Quality Gates

### Pre-Commit (Local)

Enforced by Husky:
1. ✅ Gitleaks (secret scanning)
2. ✅ ESLint (linting)
3. ✅ Prettier (formatting)
4. ✅ TypeScript (type checking)
5. ✅ Dependency audit (warnings only)

### Pre-Merge (CI)

Required for PR merge:
1. ✅ All tests pass
2. ✅ Code coverage ≥ 70%
3. ✅ No ESLint errors
4. ✅ No TypeScript errors
5. ✅ Danger.js checks pass
6. ✅ No high-severity vulnerabilities

### Post-Merge (Monitoring)

Track these metrics:
1. SonarQube quality gate status
2. Technical debt ratio
3. Code duplication percentage
4. Test coverage trend
5. New issues introduced

---

## Anti-Patterns to Avoid

### 1. God Objects

Classes with too many responsibilities (> 20 methods).

**Solution**: Apply Single Responsibility Principle, extract services.

### 2. Shotgun Surgery

One change requires modifications in many files.

**Solution**: Improve encapsulation, use dependency injection.

### 3. Feature Envy

Method uses more methods from another class than its own.

**Solution**: Move method to the class it envies.

### 4. Primitive Obsession

Using primitives instead of small objects.

```typescript
// ❌ Bad
function createUser(
  name: string,
  email: string,
  street: string,
  city: string,
  zip: string,
  country: string
) { }

// ✅ Good
interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
}

function createUser(name: string, email: string, address: Address) { }
```

### 5. Long Parameter List

More than 5 parameters.

**Solution**: Use options object or builder pattern.

---

## Refactoring Guidelines

### When to Refactor

1. **Rule of Three**: Third time you duplicate code, refactor it
2. **Before Adding Feature**: Refactor to make new feature easy
3. **During Code Review**: If reviewer suggests improvement
4. **Debt Threshold**: When complexity > threshold

### How to Refactor Safely

1. Write tests first (if missing)
2. Make one small change at a time
3. Run tests after each change
4. Commit frequently
5. Use IDE refactoring tools

### Refactoring Patterns

```typescript
// Extract Function
// Before
function printOwing() {
  printBanner();
  console.log(`name: ${name}`);
  console.log(`amount: ${getOutstanding()}`);
}

// After
function printOwing() {
  printBanner();
  printDetails();
}

function printDetails() {
  console.log(`name: ${name}`);
  console.log(`amount: ${getOutstanding()}`);
}
```

---

## Resources

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring by Martin Fowler](https://refactoring.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

## Changelog

- **2025-11-20**: Initial creation with comprehensive standards and examples
