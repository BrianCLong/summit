# Playbook: Legacy Mode Retirement

## Objective

Convert Legacy Mode components or tests to standard Node/Native implementations.

## Preconditions

- Component is marked with `LegacyMode` or test is skipped/marked legacy.
- Corresponding "Native" pattern is established.

## Steps

1. **Identify**: Find the legacy artifact.
   ```bash
   grep -r "LegacyMode" .
   ```
2. **Isolate**: Ensure the component is covered by a test (even if skipped).
3. **Enable Test**: Remove `.skip` or `LegacyMode` wrapper from the test.
4. **Refactor**: Update the implementation to satisfy the test without legacy hacks.
5. **Verify**: Run tests locally.
6. **Commit**: Submit PR. Ensure `debt/registry.json` is updated (entry removed).

## Rollback

If the change causes regression in other areas, revert to Legacy Mode immediately and log the failure reason in the Debt Registry entry.
