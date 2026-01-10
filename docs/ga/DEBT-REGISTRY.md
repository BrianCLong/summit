# Canonical Debt Registry

This document describes the structure and governance of the technical debt registry located at `debt/registry.json`.

## Purpose

To make technical debt explicit, enumerable, and owned. Any debt not in this registry is considered a governance violation.

## Schema

```json
{
  "schema_version": "1.0",
  "debt": [
    {
      "id": "DEBT-HASH",
      "category": "code_comment | test_skipped | lint_disable",
      "severity": "low | medium | high | critical",
      "description": "Description of the debt",
      "locations": ["file:line"],
      "rationale": "Why it exists",
      "exit_criteria": "When can it be removed",
      "owner": "Team or Agent",
      "created_at": "YYYY-MM-DD"
    }
  ]
}
```

## Workflows

### Adding New Debt

1. Run `node scripts/compliance/generate_debt_registry.cjs` to update the registry (not recommended for daily use, better to avoid new debt).
2. Or manually add an entry if you are consciously adding technical debt (e.g., a temporary workaround).

### Retiring Debt

1. Fix the issue in the code (remove TODO, enable test).
2. Run CI. The regression check will pass (fewer items).
3. Optionally update `debt/registry.json` to remove the entry and "claim" the budget reduction.

## Enforcement

The script `scripts/ci/check_debt_regression.cjs` runs in CI to ensure:

- No new debt items (IDs) appear in the codebase that are not in the registry.
