# Future History Log

> Chronicle major platform decisions and their expected trajectory.

## Overview

The Future History Log is a strategic documentation system that captures **why** we make major
decisions and **what we expect to happen** as a result. Unlike ADRs (which focus on technical
architecture) or changelogs (which focus on what shipped), Future History focuses on predicted
outcomes over 3–24 months.

## Quick Start

### Reading Entries

Browse [LOG.md](./LOG.md) to understand recent major decisions and their expected trajectories.

### Creating Entries

```bash
# From PR numbers (auto-populates metadata)
pnpm future-history:create --pr 13347 --summary "Security scanning pipeline"

# Interactive mode
pnpm future-history:create --interactive

# Preview without writing
pnpm future-history:create --pr 13347 --summary "Test" --dry-run
```

### CI Integration

Large PRs (500+ lines or 10+ files) trigger an advisory check:

```bash
# Run manually
pnpm future-history:check

# Strict mode (fails CI)
pnpm future-history:check:strict
```

## Files

| File                         | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| [LOG.md](./LOG.md)           | Main log with all entries                   |
| [template.md](./template.md) | Entry template and guidelines               |
| `entries/`                   | Standalone entries pending merge (optional) |

## When to Create an Entry

Create a Future History entry when:

1. **Epic-level PRs** - Changes spanning multiple services
2. **Strategic decisions** - Technology choices, architectural patterns
3. **Breaking changes** - API changes, migrations, deprecations
4. **New capabilities** - Features unlocking new use cases
5. **Security changes** - Auth, encryption, compliance

## Entry Structure

Each entry includes:

- **Date & Title** - When and what
- **Category & Owner** - Classification and accountability
- **Change/Decision** - What happened (specific, quantified)
- **Rationale** - Why we did it (problem, alternatives)
- **Short-term Effects** - 0–3 month predictions
- **Long-term Effects** - 6–24 month predictions
- **Risks & Mitigations** - What could go wrong
- **Links** - PRs, ADRs, threat models, metrics

## Categories

| Category       | Description                          |
| -------------- | ------------------------------------ |
| Security       | Auth, encryption, compliance         |
| Performance    | Latency, throughput, scaling         |
| Governance     | Data management, audit, policy       |
| Architecture   | Structural changes, patterns         |
| Strategy       | Long-term planning, roadmaps         |
| Infrastructure | CI/CD, deployment, monitoring        |
| API            | GraphQL schema, endpoints, contracts |
| Data           | Databases, migrations, ETL           |

## Workflow

```
Draft → Active → [Validated | Revised | Superseded] → Archived
```

1. **Draft**: Entry created, pending review
2. **Active**: Reviewed, predictions being tracked
3. **Validated/Revised/Superseded**: Outcome determined
4. **Archived**: Historical reference

## Quarterly Review

Each quarter:

- [ ] Review Active entries
- [ ] Compare predictions to actual outcomes
- [ ] Update status for completed entries
- [ ] Add retrospective notes
- [ ] Identify patterns for process improvement

## Links

- [Entry Template](./template.md)
- [96-Prompt Engineering Roadmap](../ENGINEERING_ROADMAP_96_PROMPTS.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [ADRs](../adr/)

## Maintenance

**Owner**: Engineering Team **Review Cadence**: Quarterly or after major releases
