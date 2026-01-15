# Type Safety Audit

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Type Safety Audit system detects and tracks `any` type usage in TypeScript code. It enforces thresholds to gradually reduce type safety violations and ensures strict typing in critical paths.

### Key Properties

- **Any detection**: Finds explicit and implicit `any` types
- **Strict path enforcement**: Lower thresholds for security/auth paths
- **TypeScript strict checks**: Optional full strict mode verification
- **Trend tracking**: Historical tracking to measure progress
- **PR integration**: Comments on PRs with type safety status

---

## Why Avoid `any`?

| Issue                    | Impact                                       |
| ------------------------ | -------------------------------------------- |
| No type checking         | Runtime errors that TypeScript should catch  |
| Spreads through codebase | One `any` can infect many types              |
| Missing IDE support      | No autocomplete or refactoring help          |
| Security risk            | Can't verify data shapes in auth/policy code |

---

## Thresholds

| Path                     | Max `any` | Rationale                |
| ------------------------ | --------- | ------------------------ |
| General code             | 50        | Gradual reduction target |
| `server/src/security/**` | 5         | Security-critical code   |
| `server/src/auth/**`     | 5         | Authentication code      |
| `server/src/policy/**`   | 5         | Policy enforcement       |
| `packages/tasks-core/**` | 5         | Core task logic          |

---

## Workflow Triggers

| Trigger      | Condition               | Action               |
| ------------ | ----------------------- | -------------------- |
| Schedule     | Daily 7 AM UTC          | Full audit           |
| Pull Request | TypeScript file changes | Audit + comment      |
| Push to main | TypeScript file changes | Audit                |
| Manual       | Workflow dispatch       | Configurable options |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Type Safety Audit
2. Click "Run workflow"
3. Configure options:
   - `max_any`: Maximum allowed any types
   - `strict`: Enable strict TypeScript checks
   - `coverage`: Calculate type coverage percentage
4. Click "Run workflow"

### Via CLI

```bash
# Run with default settings
./scripts/release/type_safety_audit.sh

# Set custom threshold
./scripts/release/type_safety_audit.sh --max-any 25

# Enable strict mode
./scripts/release/type_safety_audit.sh --strict

# Calculate type coverage
./scripts/release/type_safety_audit.sh --coverage

# Generate detailed report
./scripts/release/type_safety_audit.sh --report

# Show fix suggestions
./scripts/release/type_safety_audit.sh --fix
```

---

## Configuration

### Policy File

Configure in `docs/ci/TYPE_SAFETY_POLICY.yml`:

```yaml
audit:
  # Paths to audit
  paths:
    - "server/src/**/*.ts"
    - "cli/src/**/*.ts"

any_detection:
  # Maximum allowed explicit any types
  max_explicit_any: 50

  # Strict paths with lower threshold
  strict_paths:
    - "server/src/security/**"
    - "server/src/auth/**"

gates:
  # Fail on any type errors
  fail_on_type_errors: true
```

---

## Detected Patterns

The audit detects these `any` patterns:

```typescript
// All of these are detected:
const x: any = value; // Explicit type annotation
function f(x: any) {} // Parameter type
function f(): any {} // Return type
const x = value as any; // Type assertion
const arr: any[] = []; // Array of any
interface X {
  prop: any;
} // Property type
```

### Exceptions

These patterns are NOT counted:

```typescript
// Suppression comments
// @ts-expect-error - Necessary for external lib
const x: any = legacyLib.value;

// ESLint disable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const x: any = value;

// TODO comments (tracked separately)
// TODO: fix any
const x: any = value;
```

---

## PR Comments

When run on a pull request:

```markdown
## ✅ Type Safety Audit PASSED

| Metric            | Value | Threshold |
| ----------------- | ----- | --------- |
| Total `any` types | 35    | 50        |
| Strict path `any` | 2     | 5         |
| Type errors       | 0     | 0         |

Consider replacing `any` with proper types.
```

---

## Remediation

### Replace `any` with specific types

```typescript
// ❌ Bad
function processUser(user: any): any {
  return user.name;
}

// ✅ Good
interface User {
  id: string;
  name: string;
}

function processUser(user: User): string {
  return user.name;
}
```

### Use generics for flexibility

```typescript
// ❌ Bad
function getValue(obj: any, key: string): any {
  return obj[key];
}

// ✅ Good
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### Use `unknown` for dynamic data

```typescript
// ❌ Bad - no type checking
function parse(json: string): any {
  return JSON.parse(json);
}

// ✅ Good - requires type narrowing
function parse(json: string): unknown {
  return JSON.parse(json);
}

// Usage requires type guard
const data = parse('{"name":"test"}');
if (isUser(data)) {
  console.log(data.name); // TypeScript knows it's User
}
```

### Type guards for runtime checks

```typescript
function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj && "name" in obj;
}
```

---

## State Tracking

State in `docs/releases/_state/type_safety_state.json`:

```json
{
  "version": "1.0.0",
  "last_audit": "2026-01-08T07:00:00Z",
  "last_result": {
    "total_any": 35,
    "strict_any": 2,
    "type_errors": 0,
    "files_with_any": 12,
    "threshold": 50,
    "failed": false
  },
  "audit_history": [...]
}
```

---

## Integration

### With Release Gates

```yaml
- name: Check Type Safety
  run: |
    RESULT=$(jq -r '.last_result.failed' docs/releases/_state/type_safety_state.json)
    if [[ "$RESULT" == "true" ]]; then
      echo "Release blocked: Type safety audit failed"
      exit 1
    fi
```

### With Pre-commit

Add to `.husky/pre-commit`:

```bash
./scripts/release/type_safety_audit.sh --path "$(git diff --cached --name-only '*.ts')"
```

---

## Troubleshooting

### High `any` count in existing code

**Approach:**

1. Set initial threshold at current level + buffer
2. Gradually reduce threshold over sprints
3. Focus on strict paths first
4. Use `// TODO: fix any` for tracking

### Third-party library types

**Symptom:** Library lacks type definitions

**Resolution:**

1. Check for `@types/package-name`
2. Create declaration file (`.d.ts`)
3. Use `declare module` for simple cases

```typescript
// types/legacy-lib.d.ts
declare module "legacy-lib" {
  export function doThing(input: string): Result;
}
```

### Generic type complexity

**Symptom:** Complex generics are hard to type

**Resolution:**

1. Create type aliases for complex types
2. Use utility types (`Partial`, `Pick`, etc.)
3. Consider simpler API design

---

## Best Practices

1. **Start strict**: Enable `noImplicitAny` in new projects
2. **Gradual migration**: Use `// @ts-expect-error` sparingly
3. **Test types**: Use `expectType` helpers in tests
4. **Document exceptions**: Comment why `any` is needed
5. **Review regularly**: Track trends in audit history

---

## References

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [GA Hard Gates](ga-hard-gates.md)

---

## Change Log

| Date       | Change                    | Author               |
| ---------- | ------------------------- | -------------------- |
| 2026-01-08 | Initial Type Safety Audit | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
