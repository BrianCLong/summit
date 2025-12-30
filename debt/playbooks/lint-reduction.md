# Playbook: Lint Reduction

## Objective

Reduce the number of `eslint-disable` and `ts-ignore` directives.

## Preconditions

- Linter is configured correctly.

## Steps

1. **Pick a Category**: Focus on one rule (e.g., `no-explicit-any`).
2. **Scan**: Find occurrences.
   ```bash
   grep -r "eslint-disable.*no-explicit-any" .
   ```
3. **Fix**: Replace `any` with proper types.
4. **Verify**: Run `npm run lint`.
5. **Update Registry**: Remove the debt entry.

## Safe Scope

- Type definitions.
- Unused variable removal.
- Console log removal.
