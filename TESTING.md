# Testing & Verification Strategy

This document describes the testing and verification conventions for the Summit repository.

## Overview

We use a **dual-track testing strategy** to balance comprehensive unit testing with deterministic verification of critical features and structure.

### The Problem We Solve

This monorepo has experienced Jest ESM/CJS transform brittleness, particularly for verification-style tests that check feature presence and structure rather than unit behavior. Rather than fighting Jest configuration for every new verification, we've established clear conventions for when to use each approach.

## Testing Tracks

### Track 1: Jest for Unit Tests

**Use Jest when:**
- Testing unit behavior (functions, classes, modules)
- Mocking is straightforward and Jest ecosystem tools are helpful
- The test file already works with current Jest configuration
- You're testing React components (with @testing-library/react)

**Jest locations:**
- `server/tests/**/*.test.ts`
- `server/src/**/__tests__/**/*.test.ts`
- `client/src/**/*.test.tsx`
- `packages/*/tests/**/*.test.ts`

**Run Jest tests:**
```bash
pnpm test              # All tests (configured in jest.config.cjs)
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:server       # Server tests
pnpm test:client       # Client tests
```

### Track 2: Node-Native Verification (tsx + node:assert)

**Use node-native verification when:**
- Verifying GA feature presence (auth, rate limits, policies, etc.)
- Checking structural integrity (route registration, middleware chains, config schemas)
- Jest ESM transforms would be complex or brittle
- You don't need heavy mocking - direct imports are fine
- Fast, deterministic execution is critical for CI

**Verification locations:**
- `server/scripts/verify-*.ts` (verification scripts)
- Executed via `tsx` for direct TypeScript execution

**Run verification suite:**
```bash
pnpm verify                        # Run all verifications
pnpm verify:verbose                # Verbose output
tsx scripts/verify.ts --filter=auth  # Filter by name/category
```

**Current verifications:**
- Authentication Logic (`verify_auth.ts`)
- Route Rate Limiting (`verify-route-rate-limit.ts`)
- Policy Lifecycle (`verify_policy_lifecycle.ts`)
- Policy Simulation (`verify_policy_simulation.ts`)
- Evidence Scoring (`verify-evidence-scoring.ts`)
- XAI v2 Integration (`verify-xai-v2.ts`)
- Middleware Coverage (`verify-middleware-coverage.ts`)
- Revenue Ops Structure (`verify_revenue_ops_structure.ts`)

## Writing a Node-Native Verification

### Template

```typescript
/**
 * Verification: [Feature Name]
 *
 * Purpose: [What you're verifying]
 * - [Key aspect 1]
 * - [Key aspect 2]
 *
 * Why not Jest:
 * - [Specific reason for using node-native approach]
 */

import assert from 'assert/strict';

async function run() {
  console.log('--- [Feature Name] Verification ---');
  
  // Your verification logic here
  // Use assert.equal(), assert.ok(), etc.
  
  console.log('✅ All checks passed');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
```

### Best Practices

1. **Fast & Focused**: Verify structure/shape, not full runtime behavior
2. **No Heavy Dependencies**: Avoid booting the full server if possible
3. **Clear Failures**: Print actionable error messages
4. **Exit Codes**: Use `process.exit(1)` on failure for CI integration
5. **Deterministic**: No flaky behavior, no external API calls

### Adding to the Verification Suite

1. Create your script in `server/scripts/verify-*.ts`
2. Add it to `scripts/verify.ts` in the `VERIFICATION_CHECKS` array:
   ```typescript
   {
     name: 'Your Feature Name',
     category: 'ga-feature' | 'security' | 'structure',
     script: 'server/scripts/verify-your-feature.ts',
     required: true,  // true = blocks CI on failure
   }
   ```
3. Test locally: `tsx server/scripts/verify-your-feature.ts`
4. Test via suite: `pnpm verify --filter=your-feature`

## Bootstrap & Golden Path

### Bootstrap Script

Ensures deterministic environment setup for developers and CI:

```bash
pnpm bootstrap
# OR
./scripts/bootstrap.sh
```

**What it does:**
1. Validates Node.js version (20.19.0)
2. Validates pnpm version (10.0.0)
3. Installs dependencies (frozen lockfile in CI)
4. Verifies critical tools (tsx, jest, eslint, tsc)

**When to run:**
- Fresh checkout
- After pulling major changes
- When CI is failing with dependency issues
- Before running verification suite

### The Golden Path

The recommended workflow for contributors:

```bash
# 1. Bootstrap (one time or after major updates)
pnpm bootstrap

# 2. Verify everything works
pnpm verify

# 3. Lint your code
pnpm lint

# 4. Run tests (where applicable)
pnpm test

# 5. Build
pnpm build
```

## CI Integration

The verification suite is integrated into CI workflows to ensure:
- All GA features are properly implemented
- Security middleware is correctly configured
- Structural integrity is maintained

**CI Workflow:**
1. Bootstrap (install deps, validate versions)
2. Lint (ESLint + Ruff)
3. Verify (run verification suite)
4. Test (Jest unit/integration tests)
5. Build (TypeScript compilation)

See `.github/workflows/ci.yml` for the current CI configuration.

## Seed Debugging & Environment Parity

To avoid seed-based flakiness, we standardize test environment variables and log the active seed.

**Standardized test env (`.env.test`):**
- `TZ=UTC`
- `LANG=en_US.UTF-8`
- `LC_ALL=en_US.UTF-8`
- `NODE_ENV=test`
- `LOG_LEVEL=error`

**Seed logging:**
Test setup logs the active seed value on every run:

```bash
TEST_SEED=1234567890 pnpm test
```

**Repro tips:**
- Re-run with the same seed used in CI.
- Keep `TZ=UTC` to avoid local timezone variance.

## FAQ

### Why not just fix Jest configuration?

We tried. With 200+ quarantined tests due to ESM/CJS issues, it became clear that Jest is excellent for unit tests but overly complex for structural verification. The node-native approach is simpler, faster, and more maintainable for this use case.

### Can I use node:test instead of tsx + node:assert?

Yes! The `node:test` runner is another valid option. We chose `tsx + node:assert` for:
- Direct TypeScript execution (no compilation step)
- Familiar assertion API
- Simple integration with existing scripts

Feel free to use `node:test` if it fits your needs better.

### What about E2E tests?

E2E tests using Playwright remain in the `tests/e2e` directory and are run separately:

```bash
pnpm e2e
```

### How do I know if a test should be Jest or node-native?

Ask yourself:
- **Am I testing behavior or structure?** Behavior → Jest, Structure → node-native
- **Do I need complex mocking?** Yes → Jest, No → node-native
- **Is this for GA feature verification?** Yes → node-native
- **Am I fighting Jest ESM transforms?** Yes → try node-native

When in doubt, start with node-native for verification and use Jest for unit testing.

## References

- [Jest Configuration](jest.config.cjs)
- [Verification Suite](scripts/verify.ts)
- [Bootstrap Script](scripts/bootstrap.sh)
- [CI Workflow](.github/workflows/ci.yml)
