## Summary

Add a strategic documentation system for chronicling major platform decisions and their expected outcomes over 3-24 months.

### Deliverables

- **Future History Log** (`docs/future-history/LOG.md`)
  - Main log with 5 example entries from recent major changes
  - Entries for: security scanning pipeline, GraphQL optimization, query planner, 96-prompt roadmap, Data Spine toolkit

- **Entry Template** (`docs/future-history/template.md`)
  - Comprehensive guidelines for creating effective entries
  - Category taxonomy, status lifecycle, writing tips

- **README** (`docs/future-history/README.md`)
  - Quick start guide and usage documentation

- **Automated Entry Helper** (`scripts/ops/create-future-history-entry.ts`)
  - CLI tool to create entries from PR numbers
  - Auto-populates metadata, diff summary, and placeholders
  - Interactive mode available

- **CI Coverage Checker** (`scripts/ops/check-future-history-coverage.ts`)
  - Warns when large PRs (500+ lines, 10+ files) lack FH entries
  - Advisory mode (default) or strict/blocking mode
  - Integrates with GitHub Actions annotations

### Usage

```bash
# Create entry from PR
pnpm future-history:create --pr 13347 --summary "Security scanning"

# Interactive mode
pnpm future-history:create --interactive

# CI check (advisory)
pnpm future-history:check

# CI check (blocking)
pnpm future-history:check:strict
```

### Entry Structure

Each entry captures:
- Date & change/decision
- Rationale
- Short-term effects (0-3 months)
- Long-term effects (6-24 months)
- Risks & mitigations
- Links to PRs, ADRs, threat models

## Purpose

This framework provides narrative context for:
- **Strategy**: Understanding why the platform looks the way it does
- **Investors**: Seeing the strategic trajectory and risk management
- **Auditors**: Tracing decisions to outcomes for compliance
- **Future engineers**: Getting context on architectural evolution

Unlike ADRs (technical architecture) or changelogs (what shipped), Future History focuses on **predicted outcomes** that can be validated over time.

## Test plan

- [ ] Verify LOG.md renders correctly with all entries
- [ ] Test `pnpm future-history:create --dry-run` works
- [ ] Test `pnpm future-history:check` runs without errors
- [ ] Verify entry template is complete and actionable
