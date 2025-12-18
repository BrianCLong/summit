# Product Increments Feature Documentation

## Overview

The Product Increment feature provides comprehensive sprint/iteration management capabilities for the IntelGraph platform. It enables teams to track development progress, manage goals and deliverables, and monitor metrics across release cycles.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GraphQL API Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Queries      │  │   Mutations     │  │  Subscriptions  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼──────────┘
            │                    │                    │
┌───────────┴────────────────────┴────────────────────┴──────────┐
│                   ProductIncrementService                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Increment lifecycle management                        │   │
│  │  • Goal & deliverable tracking                          │   │
│  │  • Team assignments                                     │   │
│  │  • Metrics calculation                                  │   │
│  │  • Velocity tracking                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────┴───────────────────────────────────┐
│                   ProductIncrementRepo                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • PostgreSQL persistence                               │   │
│  │  • CRUD operations                                      │   │
│  │  • Batch loading (DataLoader support)                   │   │
│  │  • Metrics snapshots                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────┴───────────────────────────────────┐
│                       PostgreSQL                                │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ product_increments│  │ increment_goals  │                    │
│  └──────────────────┘  └──────────────────┘                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │increment_deliver- │  │increment_team_   │                    │
│  │     ables        │  │  assignments     │                    │
│  └──────────────────┘  └──────────────────┘                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │increment_metrics_│  │increment_change- │                    │
│  │   snapshots      │  │      log         │                    │
│  └──────────────────┘  └──────────────────┘                    │
└────────────────────────────────────────────────────────────────┘
```

## Data Model

### Product Increment

The core entity representing a sprint or iteration.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| tenantId | string | Multi-tenant isolation |
| name | string | Increment name (e.g., "Sprint 42") |
| description | string | Detailed description |
| version | string | Version identifier (e.g., "1.2.0") |
| status | enum | planning, active, review, completed, released, cancelled |
| plannedStartDate | DateTime | Planned start |
| plannedEndDate | DateTime | Planned end |
| actualStartDate | DateTime | Actual start (auto-set on activation) |
| actualEndDate | DateTime | Actual end (auto-set on completion) |
| plannedCapacityPoints | int | Total team capacity |
| committedPoints | int | Committed story points (auto-calculated) |
| completedPoints | int | Completed points (auto-calculated) |
| velocity | float | Points per week (auto-calculated) |
| releaseNotes | string | Release documentation |
| releaseTag | string | Git tag or release ID |
| releaseUrl | string | Link to release artifacts |

### Increment Goal

Objectives and goals for each increment.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| incrementId | UUID | Parent increment |
| title | string | Goal title |
| description | string | Detailed description |
| category | enum | feature, enhancement, bugfix, technical, security, performance, compliance, research |
| priority | enum | critical, high, medium, low |
| storyPoints | int | Estimated effort |
| status | enum | pending, in_progress, blocked, completed, deferred, cancelled |
| acceptanceCriteria | JSON | Array of success criteria |
| successMetrics | JSON | Key metrics and targets |

### Deliverable

Work items within an increment.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| incrementId | UUID | Parent increment |
| goalId | UUID | Associated goal (optional) |
| title | string | Deliverable title |
| description | string | Detailed description |
| deliverableType | enum | epic, story, task, bug, spike, subtask |
| parentId | UUID | Parent deliverable (for hierarchy) |
| priority | enum | critical, high, medium, low |
| storyPoints | int | Estimated effort |
| status | enum | backlog, ready, in_progress, in_review, testing, done, blocked, cancelled |
| assigneeId | string | Assigned user ID |
| externalId | string | External tracker ID (Jira, GitHub) |
| investigationId | UUID | Linked IntelGraph investigation |

## Increment Lifecycle

```
┌──────────┐    start     ┌──────────┐   review    ┌──────────┐
│ PLANNING ├─────────────►│  ACTIVE  ├────────────►│  REVIEW  │
└────┬─────┘              └────┬─────┘             └────┬─────┘
     │                         │                        │
     │ cancel                  │ complete               │ complete
     ▼                         ▼                        ▼
┌──────────┐              ┌──────────┐   release   ┌──────────┐
│CANCELLED │              │COMPLETED ├────────────►│ RELEASED │
└──────────┘              └──────────┘             └──────────┘
```

### Valid Status Transitions

| From | To |
|------|-----|
| PLANNING | ACTIVE, CANCELLED |
| ACTIVE | REVIEW, COMPLETED, CANCELLED |
| REVIEW | ACTIVE, COMPLETED, CANCELLED |
| COMPLETED | RELEASED |
| RELEASED | (terminal) |
| CANCELLED | (terminal) |

## GraphQL API

### Queries

```graphql
# Get single increment
query GetIncrement($id: ID!) {
  productIncrement(id: $id) {
    id
    name
    version
    status
    goals {
      id
      title
      status
    }
    deliverables {
      id
      title
      status
      assigneeName
    }
    teamMembers {
      userId
      userName
      role
    }
  }
}

# Get increment with statistics
query GetIncrementStats($id: ID!) {
  productIncrementStatistics(id: $id) {
    progressPercent
    daysRemaining
    velocity
    isOnTrack
    summary {
      totalGoals
      completedGoals
      totalDeliverables
      completedDeliverables
      blockedDeliverables
    }
  }
}

# List increments
query ListIncrements($tenantId: String!, $filter: IncrementFilter) {
  productIncrements(tenantId: $tenantId, filter: $filter) {
    id
    name
    version
    status
  }
}

# Get burndown data
query GetBurndown($incrementId: ID!) {
  incrementBurndown(incrementId: $incrementId) {
    date
    idealRemaining
    actualRemaining
    completedPoints
  }
}

# Get velocity history
query GetVelocity($tenantId: String!) {
  velocityHistory(tenantId: $tenantId, limit: 10) {
    increment {
      name
      version
    }
    velocity
  }
}
```

### Mutations

```graphql
# Create increment
mutation CreateIncrement($input: ProductIncrementInput!) {
  createProductIncrement(input: $input) {
    id
    name
    version
  }
}

# Start increment
mutation StartIncrement($id: ID!) {
  startProductIncrement(id: $id) {
    id
    status
    actualStartDate
  }
}

# Complete increment
mutation CompleteIncrement($id: ID!) {
  completeProductIncrement(id: $id) {
    id
    status
    actualEndDate
    velocity
  }
}

# Release increment
mutation ReleaseIncrement(
  $id: ID!
  $releaseNotes: String!
  $releaseTag: String!
) {
  releaseProductIncrement(
    id: $id
    releaseNotes: $releaseNotes
    releaseTag: $releaseTag
  ) {
    id
    status
    releaseTag
    releaseUrl
  }
}

# Create deliverable
mutation CreateDeliverable($input: DeliverableInput!) {
  createDeliverable(input: $input) {
    id
    title
    status
  }
}

# Update deliverable status
mutation UpdateDeliverableStatus($id: ID!, $status: DeliverableStatus!) {
  updateDeliverableStatus(id: $id, status: $status) {
    id
    status
    progressPercent
    completedAt
  }
}
```

### Subscriptions

```graphql
# Subscribe to increment updates
subscription OnIncrementUpdate($tenantId: String!) {
  productIncrementUpdated(tenantId: $tenantId) {
    id
    name
    status
    completedPoints
  }
}

# Subscribe to deliverable updates
subscription OnDeliverableUpdate($incrementId: ID!) {
  deliverableUpdated(incrementId: $incrementId) {
    id
    title
    status
    progressPercent
  }
}
```

## Integration with IntelGraph

### Linking Investigations

Deliverables can be linked to IntelGraph investigations to track analytical work:

```graphql
mutation CreateLinkedDeliverable {
  createDeliverable(input: {
    incrementId: "increment-1"
    tenantId: "tenant-1"
    title: "Analyze threat actor network"
    deliverableType: SPIKE
    investigationId: "investigation-123"
  }) {
    id
    investigation {
      id
      name
    }
  }
}
```

### Use Cases

1. **Sprint Planning**: Create increments with goals and deliverables for upcoming analytical work
2. **Progress Tracking**: Monitor completion of analysis tasks and investigations
3. **Capacity Planning**: Track team velocity to predict future capacity
4. **Release Management**: Document and track releases of analytical products

## Database Migration

Run the migration to create the required tables:

```bash
# Using the migration framework
pnpm db:migrate

# Or manually
psql -d intelgraph_dev -f server/migrations/008_product_increments.sql
```

## Automatic Features

### Auto-calculated Points

The system automatically calculates:
- **committedPoints**: Sum of all deliverable story points
- **completedPoints**: Sum of story points for done deliverables

This is done via database triggers that update when deliverables change.

### Auto-calculated Velocity

When an increment is completed:
- Velocity = completedPoints / (actualEndDate - actualStartDate in weeks)

### Auto-set Timestamps

- **actualStartDate**: Set when status changes to ACTIVE
- **actualEndDate**: Set when status changes to COMPLETED
- **deliverable.startedAt**: Set when status changes to IN_PROGRESS
- **deliverable.completedAt**: Set when status changes to DONE

## Metrics and Analytics

### Burndown Charts

The `incrementBurndown` query returns data points for rendering burndown charts:

```json
[
  {
    "date": "2024-01-01",
    "idealRemaining": 40,
    "actualRemaining": 42,
    "completedPoints": 0
  },
  {
    "date": "2024-01-08",
    "idealRemaining": 30,
    "actualRemaining": 28,
    "completedPoints": 14
  }
]
```

### Velocity Tracking

Track team velocity over time to improve estimation:

```json
[
  { "increment": "Sprint 40", "velocity": 18.5 },
  { "increment": "Sprint 41", "velocity": 21.0 },
  { "increment": "Sprint 42", "velocity": 19.2 }
]
```

### Daily Snapshots

Record daily metrics snapshots for historical analysis:

```graphql
mutation RecordMetrics {
  recordIncrementMetrics(incrementId: "increment-1") {
    snapshotDate
    totalPoints
    completedPoints
    remainingPoints
    blockedItems
  }
}
```

## Best Practices

### 1. Version Naming

Use consistent version naming:
- Semantic versions for releases: `1.0.0`, `1.1.0`, `2.0.0`
- Sprint identifiers for iterations: `Sprint-42`, `2024-W01`

### 2. Goal Structure

Structure goals as SMART objectives:
- **S**pecific: Clear title and description
- **M**easurable: Story points and success metrics
- **A**chievable: Realistic within increment timeline
- **R**elevant: Tied to business objectives
- **T**ime-bound: Within increment dates

### 3. Deliverable Hierarchy

Organize work hierarchically:
```
Epic: User Authentication System
├── Story: Implement login form
│   ├── Task: Create UI components
│   ├── Task: Add validation logic
│   └── Task: Write unit tests
├── Story: Implement password reset
└── Bug: Fix session timeout issue
```

### 4. Regular Metrics Recording

Record metrics snapshots daily during active increments:
```bash
# Cron job or scheduled task
0 9 * * * curl -X POST /api/graphql -d '{"query":"mutation { recordIncrementMetrics(incrementId: \"current\") { id } }"}'
```

## Error Handling

The API returns structured errors:

```json
{
  "errors": [
    {
      "message": "Invalid status transition from \"completed\" to \"active\"",
      "extensions": {
        "code": "BAD_REQUEST"
      }
    }
  ]
}
```

Common error scenarios:
- Invalid status transitions
- Missing required fields
- Duplicate version numbers
- Non-existent parent references

## Performance Considerations

### Indexes

The migration creates indexes for common queries:
- Tenant + status filtering
- Date range queries
- Assignee lookups
- External ID lookups

### Batch Loading

The repository supports DataLoader patterns:
```typescript
const increments = await repo.batchByIds(['id1', 'id2', 'id3']);
```

### View for Summary Queries

The `v_increment_summary` view pre-computes aggregate metrics for efficient summary queries.

## Testing

Run the test suite:

```bash
# Run all product increment tests
pnpm test -- ProductIncrementRepo

# Run with coverage
pnpm test:coverage -- ProductIncrementRepo
```

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [GraphQL API Guide](./API_GRAPHQL_SCHEMA.graphql)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [Database Migrations](../server/migrations/)
