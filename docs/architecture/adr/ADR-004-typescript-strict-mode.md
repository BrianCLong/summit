# ADR-004: TypeScript Strict Mode Migration

**Status**: Proposed
**Date**: 2025-11-21
**Deciders**: Architecture Team
**Technical Story**: Improve type safety across the codebase

## Context and Problem Statement

The Summit codebase has **TypeScript strict mode disabled**:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": false,        // ❌ Allows unsafe patterns
    "skipLibCheck": true,   // ❌ Hides library type errors
    "noImplicitAny": false  // ❌ Allows implicit any
  }
}
```

**Consequences of non-strict mode:**
- Runtime errors that could be caught at compile time
- Implicit `any` types hiding bugs
- Null/undefined reference errors in production
- Reduced IDE support (less accurate autocomplete)
- Technical debt accumulation

**Current metrics:**
- **366 TODO/FIXME/HACK comments** across codebase
- **16,760 deprecated/legacy mentions**
- Unknown number of latent type errors

## Decision Drivers

- Catch bugs at compile time, not runtime
- Improve code quality and maintainability
- Better IDE support and developer experience
- Align with TypeScript best practices

## Considered Options

### Option 1: Gradual Migration (Recommended)
Enable strict mode package-by-package over 8-12 weeks.

### Option 2: Big Bang Migration
Enable strict mode everywhere at once, fix all errors.

**Rejected**: Too risky, would block development for weeks.

### Option 3: Strict for New Code Only
Enable strict mode only for new packages.

**Rejected**: Doesn't address existing technical debt.

## Decision Outcome

**Chosen Option: Option 1 - Gradual Migration**

### Strict Mode Options to Enable

```json
// Target tsconfig.base.json
{
  "compilerOptions": {
    // Strict family
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,

    // Additional safety
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,

    // Remove skipLibCheck once stable
    "skipLibCheck": false
  }
}
```

### Migration Strategy

#### Phase 1: Foundation Packages (Week 1-2)
Start with packages that have few dependencies:
- `packages/common-types`
- `packages/config`
- `packages/testing`

```json
// packages/common-types/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true  // Override base config
  }
}
```

#### Phase 2: Core Packages (Week 3-4)
Enable strict mode in heavily-used packages:
- `packages/sdk-ts`
- `packages/graph-utils`
- `packages/auth-utils`

#### Phase 3: Services (Week 5-8)
Migrate services in order of importance:
1. `services/api` (critical path)
2. `services/auth`
3. `services/graph`
4. Remaining services

#### Phase 4: Applications (Week 9-10)
Enable strict mode in apps:
- `apps/web`
- `apps/gateway`
- `server/` and `client/`

#### Phase 5: Global Enable (Week 11-12)
- Enable `strict: true` in `tsconfig.base.json`
- Remove per-package overrides
- Enable `skipLibCheck: false`

### Common Error Patterns and Fixes

#### Implicit Any
```typescript
// Before (error: Parameter 'data' implicitly has 'any' type)
function process(data) {
  return data.value;
}

// After
function process(data: { value: string }): string {
  return data.value;
}
```

#### Null Checks
```typescript
// Before (error: Object is possibly 'undefined')
const user = getUser();
console.log(user.name);

// After
const user = getUser();
if (user) {
  console.log(user.name);
}
// Or with optional chaining
console.log(user?.name);
```

#### Strict Property Initialization
```typescript
// Before (error: Property 'name' has no initializer)
class Entity {
  name: string;
}

// After (option 1: definite assignment)
class Entity {
  name!: string;  // Assert it will be assigned
}

// After (option 2: default value)
class Entity {
  name: string = '';
}

// After (option 3: optional)
class Entity {
  name?: string;
}
```

#### Unknown in Catch
```typescript
// Before (error: 'error' is of type 'unknown')
try {
  riskyOperation();
} catch (error) {
  console.log(error.message);
}

// After
try {
  riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### Tooling Support

#### ESLint Rules
```javascript
// eslint.config.js
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
  }
}
```

#### IDE Configuration
```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Migration Tracking

Track progress with a simple dashboard:

```markdown
## Strict Mode Migration Progress

| Package | Status | Errors Fixed | Owner |
|---------|--------|--------------|-------|
| common-types | ✅ Complete | 12 | @alice |
| sdk-ts | 🔄 In Progress | 34/50 | @bob |
| graph-utils | ⏳ Pending | ~80 est. | @carol |
| services/api | ⏳ Pending | ~200 est. | @dave |
```

## Consequences

### Positive
- Catch bugs at compile time
- Better IDE autocomplete and refactoring
- Reduced runtime errors
- Improved code documentation (types are docs)
- Easier onboarding (types explain code intent)

### Negative
- Significant initial effort to fix errors
- Some patterns require workarounds
- Third-party libraries may have poor types

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes | Medium | Medium | Gradual migration, testing |
| Developer frustration | Medium | Low | Training, pair programming |
| Blocked PRs | Low | Medium | Allow temporary `// @ts-expect-error` |

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Packages with strict mode | 0% | 100% |
| `any` type usage | Unknown | <1% of types |
| Runtime type errors | Unknown | -50% |
| TypeScript errors in CI | N/A | 0 |

## Related Documents

- [Monorepo Refactoring Plan](../MONOREPO_REFACTORING_PLAN.md)
- [ADR-003: Build Optimization](./ADR-003-build-optimization.md)
- [TypeScript Handbook: Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
