# Strategic Planning Module

> Intelligence Analysis Strategic Planning Workflows

## Overview

The Strategic Planning Module provides comprehensive strategic planning capabilities for intelligence analysis workflows. It enables organizations to create, manage, and track strategic plans with objectives, initiatives, milestones, risk assessments, and key performance indicators.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GraphQL API Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Queries      │  │   Mutations     │  │  Subscriptions  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
┌───────────▼─────────────────────▼─────────────────────▼─────────┐
│                   StrategicPlanningService                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Business   │  │   Analytics  │  │   Event Emission     │  │
│  │    Logic     │  │   & Reports  │  │   & Subscriptions    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     StrategicPlanRepo                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    CRUD      │  │   Queries    │  │   Activity Logging   │  │
│  │  Operations  │  │   & Filters  │  │   & Provenance       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                       PostgreSQL                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  strategic_plans, strategic_objectives, initiatives,     │  │
│  │  milestones, risks, stakeholders, resources, kpis        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Core Entities

1. **Strategic Plans** - Top-level planning containers
   - Status workflow: DRAFT → UNDER_REVIEW → APPROVED → ACTIVE → COMPLETED
   - Time horizons: SHORT_TERM, MEDIUM_TERM, LONG_TERM, STRATEGIC
   - Priority levels: LOW, MEDIUM, HIGH, CRITICAL

2. **Strategic Objectives** - Measurable goals within plans
   - OKR-style tracking with Key Results
   - Progress tracking with target/current values
   - Milestone management

3. **Initiatives** - Actions to achieve objectives
   - Multiple types: COLLECTION, ANALYSIS, DISSEMINATION, etc.
   - Budget tracking
   - Deliverables management

4. **Milestones** - Key checkpoints
   - Can belong to objectives or initiatives
   - Overdue detection
   - Completion tracking

5. **Risk Assessments** - Risk identification and management
   - Risk scoring: likelihood × impact (1-25)
   - Automatic risk level calculation
   - Mitigation strategies

6. **Stakeholders** - Plan participants
   - Roles: OWNER, SPONSOR, CONTRIBUTOR, REVIEWER, OBSERVER
   - Communication preferences

7. **Resources** - Resource allocation
   - Types: PERSONNEL, BUDGET, TECHNOLOGY, INTELLIGENCE, PARTNERSHIP
   - Utilization tracking

8. **KPIs** - Performance measurement
   - Trend tracking (UP, DOWN, STABLE)
   - Historical data
   - Achievement calculation

### Analytics & Reporting

- **Plan Progress** - Overall progress calculation with health score
- **Timeline** - Chronological view of all plan events
- **Scorecard** - KPI and objective achievement summary
- **Activity Log** - Audit trail of all modifications

## Usage

### Creating a Strategic Plan

```graphql
mutation CreatePlan {
  createStrategicPlan(input: {
    name: "Intelligence Modernization Initiative"
    description: "Strategic plan for modernizing intelligence collection capabilities"
    priority: HIGH
    timeHorizon: MEDIUM_TERM
    startDate: "2025-01-01T00:00:00Z"
    endDate: "2025-12-31T00:00:00Z"
    tags: ["modernization", "collection"]
  }) {
    id
    name
    status
  }
}
```

### Adding Objectives

```graphql
mutation CreateObjective {
  createObjective(input: {
    planId: "plan-001"
    name: "Increase Collection Efficiency"
    description: "Improve collection efficiency by 30%"
    priority: HIGH
    targetValue: 30
    unit: "percent"
    startDate: "2025-01-01T00:00:00Z"
    targetDate: "2025-06-30T00:00:00Z"
    alignedIntelligencePriorities: ["SIGINT", "HUMINT"]
  }) {
    id
    name
    status
    progress
  }
}
```

### Tracking Progress

```graphql
mutation UpdateProgress {
  updateObjectiveProgress(id: "obj-001", currentValue: 15) {
    id
    currentValue
    progress
    status
  }
}
```

### Querying Plan Progress

```graphql
query GetPlanProgress {
  planProgress(planId: "plan-001") {
    overallProgress
    healthScore
    objectivesProgress {
      total
      completed
      onTrack
      atRisk
    }
    riskSummary {
      total
      critical
      high
    }
  }
}
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `strategic_plans` | Main plan entities |
| `strategic_objectives` | Plan objectives |
| `strategic_key_results` | OKR-style key results |
| `strategic_initiatives` | Action items |
| `strategic_deliverables` | Initiative outputs |
| `strategic_milestones` | Checkpoints |
| `strategic_risks` | Risk assessments |
| `strategic_mitigations` | Risk mitigations |
| `strategic_stakeholders` | Plan participants |
| `strategic_resources` | Resource allocations |
| `strategic_kpis` | Performance indicators |
| `strategic_plan_activities` | Audit log |

### Running Migration

```bash
pnpm db:pg:migrate
```

## Testing

### Unit Tests

```bash
pnpm test -- StrategicPlanningService.test.ts
```

### Integration Tests

```bash
pnpm test -- strategic-planning.e2e.test.ts
```

## Events

The service emits the following events:

| Event | Description | Payload |
|-------|-------------|---------|
| `planCreated` | New plan created | `{ plan, userId }` |
| `planUpdated` | Plan modified | `{ plan, previousStatus, userId }` |
| `planStatusChanged` | Status transition | `{ plan, previousStatus, newStatus, userId }` |
| `planDeleted` | Plan removed | `{ planId, userId }` |
| `objectiveCreated` | New objective | `{ objective, planId, userId }` |
| `objectiveUpdated` | Objective modified | `{ objective, userId }` |
| `initiativeCreated` | New initiative | `{ initiative, planId, userId }` |
| `riskIdentified` | New risk | `{ risk, planId, userId }` |
| `highRiskAlert` | Critical/High risk | `{ risk, planId }` |
| `stakeholderAdded` | New stakeholder | `{ stakeholder, planId, userId }` |
| `resourceAllocated` | Resource assigned | `{ resource, planId, userId }` |

## GraphQL Subscriptions

```graphql
subscription WatchPlan {
  strategicPlanUpdated(planId: "plan-001") {
    id
    status
    updatedAt
  }
}

subscription WatchProgress {
  objectiveProgressUpdated(planId: "plan-001") {
    id
    currentValue
    progress
  }
}

subscription WatchRisks {
  riskLevelChanged(planId: "plan-001") {
    id
    name
    riskLevel
  }
}
```

## Health Score Calculation

The health score (0-100) is calculated based on:

1. **Objective Issues** (-30 max)
   - Percentage of objectives that are AT_RISK or BLOCKED

2. **Overdue Milestones** (-25 max)
   - Percentage of milestones past due date

3. **Critical Risks** (-10 each)
   - Each critical risk reduces score by 10

4. **High Risks** (-5 each)
   - Each high risk reduces score by 5

## Status Workflow

```
DRAFT ──────────► UNDER_REVIEW ──────────► APPROVED
  │                    │                      │
  │                    │                      ▼
  │                    │                   ACTIVE
  │                    │                      │
  ▼                    ▼                      ▼
CANCELLED ◄──────────────────────────────── ON_HOLD
                                              │
                                              ▼
                                          COMPLETED
                                              │
                                              ▼
                                          ARCHIVED
```

## Best Practices

1. **Plan Creation**
   - Always define clear objectives with measurable targets
   - Set realistic timelines with appropriate milestones
   - Assign an OWNER stakeholder

2. **Risk Management**
   - Review risks regularly (use review dates)
   - Document mitigation strategies for HIGH/CRITICAL risks
   - Monitor risk score trends

3. **Progress Tracking**
   - Update objective progress regularly
   - Complete milestones on time
   - Track KPIs at defined frequencies

4. **Stakeholder Engagement**
   - Keep stakeholders informed via their preferred channels
   - Document responsibilities clearly
   - Regular status updates

## API Reference

See the GraphQL schema at `src/graphql/schemas/strategic-planning.ts` for complete type definitions.

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project conventions
- [Architecture](../../../docs/ARCHITECTURE.md) - System architecture
- [Testing](../../../docs/TESTPLAN.md) - Testing strategy
