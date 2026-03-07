# Architecture Decision Records Index

This index catalogs all Architecture Decision Records (ADRs) for the Summit/IntelGraph platform.

## Overview

ADRs capture significant architectural decisions along with their context and consequences. They serve as institutional memory for "why" we made specific choices.

**Location:** `/docs/architecture/adr/`

**Template:** [adr-template.md](adr/adr-template.md)

**Legacy ADRs:** Some older ADRs exist in `/adr/` - they will be migrated to this structure over time.

## Quick Links

- [How to Create an ADR](#creating-a-new-adr)
- [ADR Template](adr/adr-template.md)
- [Legacy ADRs](/adr/README.md)

## ADR Index

| #    | Title                                                                          | Status   | Area           | Date       |
| ---- | ------------------------------------------------------------------------------ | -------- | -------------- | ---------- |
| 0001 | [Monorepo Structure](adr/0001-monorepo-structure.md)                           | Accepted | Infrastructure | 2024-01-10 |
| 0002 | [LLM Client Architecture](adr/0002-llm-client-architecture.md)                 | Accepted | AI/ML          | 2024-03-01 |
| 0003 | [Graph-First Intelligence Engine](adr/0003-graph-first-intelligence-engine.md) | Accepted | Data           | 2024-01-15 |

## ADRs by Area

### Data

- [ADR-0003: Graph-First Intelligence Engine](adr/0003-graph-first-intelligence-engine.md) - Neo4j with canonical data model

### AI/ML

- [ADR-0002: LLM Client Architecture](adr/0002-llm-client-architecture.md) - LiteLLM with local-first routing

### Infrastructure

- [ADR-0001: Monorepo Structure](adr/0001-monorepo-structure.md) - pnpm workspaces with Turborepo

### Auth/Security

_No ADRs in this category yet. See legacy [ADR-0002: ABAC Step-up](/adr/0002-abac-step-up.md)._

### API

_No ADRs in this category yet. See legacy [ADR-0007: GraphQL API Design](/adr/0007-graphql-api-design.md)._

### Observability

_No ADRs in this category yet._

### Compliance

_No ADRs in this category yet._

## ADR Lifecycle

```
Proposed  -->  Accepted  -->  Deprecated
                          \-> Superseded by ADR-XXXX
```

- **Proposed:** Under discussion, not yet implemented
- **Accepted:** Decision made, implementation in progress or complete
- **Deprecated:** No longer relevant
- **Superseded:** Replaced by a newer ADR

## Creating a New ADR

### Using the Auto-Generator Script

```bash
# Create a new ADR with the next available number
npx ts-node scripts/architecture/create-adr.ts --title "My Decision Title" --area "Data"

# Or run via pnpm
pnpm adr:create --title "My Decision Title" --area "Data"
```

### Manual Creation

1. Copy the template:

   ```bash
   cp docs/architecture/adr/adr-template.md docs/architecture/adr/00XX-my-decision.md
   ```

2. Update the ADR with your decision details

3. Update this index with the new ADR entry

4. Commit with conventional commit:
   ```bash
   git commit -m "docs(adr): add ADR-00XX for my decision"
   ```

## When to Write an ADR

Create an ADR when making a decision that:

1. **Affects system structure:** Database choice, API design, service boundaries
2. **Has long-term impact:** Technology choices, architectural patterns
3. **Involves significant trade-offs:** Performance vs. cost, complexity vs. flexibility
4. **Impacts multiple teams:** Shared services, platform capabilities
5. **Establishes a precedent:** "This is how we do X going forward"

### The "Grandparent Test"

> "If a new engineer joins 2 years from now, will they wonder why we did this?"

If yes, write an ADR.

## Related Resources

- [How We Use ADRs](/adr/HOW_WE_USE_ADRS.md) - Detailed guidelines
- [Architecture Documentation](/docs/ARCHITECTURE.md) - System overview
- [Living System Map](/docs/architecture/system-map.json) - Auto-generated system visualization

---

_Last updated: 2025-12-06_
