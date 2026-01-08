# Agent Guidance: Testing & Verification

## Quick Reference for AI Agents

When working on this repository, follow these conventions to avoid introducing flaky tests and CI failures.

### Critical Rules

1. **DO NOT add Jest tests for verification-style checks** (structure, feature presence, config schemas)
2. **DO NOT mock third-party libraries by hand inside node_modules/**
3. **DO use node-native tests (tsx + node:assert) for verification**
4. **DO use Jest only for true unit/integration behavior tests**

### When to Use Each Approach

#### Use Jest (`*.test.ts` in test directories)

- Testing function/class behavior
- Unit testing with straightforward mocking
- React component testing
- Integration tests requiring test database

#### Use Node-Native Verification (`server/scripts/verify-*.ts`)

- GA feature presence checks (auth, rate limits, policies)
- Route/middleware configuration verification
- Config schema validation
- Any structural check that doesn't need heavy mocking

### Adding a New Verification

1. Create `server/scripts/verify-your-feature.ts`:

```typescript
import assert from "assert/strict";

async function run() {
  console.log("--- Your Feature Verification ---");

  // Your checks here using assert.equal(), assert.ok(), etc.

  console.log("✅ All checks passed");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
```

2. Add to `scripts/verify.ts`:

```typescript
{
  name: 'Your Feature',
  category: 'ga-feature' | 'security' | 'structure',
  script: 'server/scripts/verify-your-feature.ts',
  required: true,
}
```

3. Test: `pnpm verify --filter=your-feature`

### CI Golden Path

The CI pipeline runs:

1. **Bootstrap** - Install deps, validate versions
2. **Lint** - ESLint + Ruff
3. **Verify** - Run verification suite (BLOCKS on failure)
4. **Test** - Jest unit/integration (currently non-blocking for unit)
5. **Build** - TypeScript compilation

### Common Pitfalls to Avoid

❌ **DON'T**: Add a Jest test that imports server code with ESM issues  
✅ **DO**: Create a node-native verification script using tsx

❌ **DON'T**: Mock entire dependency chains for a simple structure check  
✅ **DO**: Use direct imports and introspection in verification scripts

❌ **DON'T**: Add to the Jest quarantine list without considering alternatives  
✅ **DO**: Ask if this should be a verification script instead

❌ **DON'T**: Create tests that depend on external services in the verification suite  
✅ **DO**: Keep verifications fast and deterministic with mocks/fixtures

### Examples

**Good Verification Script** (server/scripts/verify-route-rate-limit.ts):

- Direct imports
- Mock only what's needed
- Fast execution
- Clear pass/fail
- No Jest dependency

**Good Jest Test** (server/tests/utils/encryption.test.ts):

- Tests behavior of encryption functions
- Uses Jest's mocking features appropriately
- Isolated unit test
- Doesn't fight ESM transforms

### Further Reading

See [TESTING.md](../TESTING.md) for complete documentation.
