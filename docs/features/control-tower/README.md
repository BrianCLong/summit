# Control Tower Feature

> **Version**: 1.0.0
> **Status**: In Development
> **Track**: A (90-day initiative)

## Overview

Control Tower is the unified operational command center for CompanyOS, providing operations leaders with a single pane of glass to monitor, understand, and act on events across their entire organization.

## Quick Links

- [Product Brief](./PRODUCT_BRIEF.md) - Full product definition, personas, and scope
- [Wireframes](./WIREFRAMES.md) - Text-based UI wireframes
- [Telemetry Plan](./TELEMETRY_PLAN.md) - Analytics and metrics strategy

## Architecture

### Backend Service

Location: `services/control-tower-service/`

```
control-tower-service/
├── src/
│   ├── schema/           # GraphQL schema
│   ├── resolvers/        # GraphQL resolvers
│   ├── services/         # Business logic
│   │   ├── EventService.ts
│   │   ├── SituationService.ts
│   │   ├── HealthScoreService.ts
│   │   └── AlertService.ts
│   ├── types/            # TypeScript types
│   └── __tests__/        # Unit tests
├── package.json
└── tsconfig.json
```

### Frontend Components

Location: `apps/web/src/`

```
apps/web/src/
├── pages/control-tower/
│   └── ControlTowerDashboard.tsx
├── components/control-tower/
│   ├── HealthScoreCard.tsx
│   ├── ActiveSituations.tsx
│   ├── KeyMetricsGrid.tsx
│   ├── TeamPulse.tsx
│   ├── EventTimeline.tsx
│   ├── CommandPalette.tsx
│   ├── EventDetailPanel.tsx
│   └── __tests__/
└── hooks/
    ├── useControlTowerData.ts
    └── useKeyboardShortcuts.ts
```

## Features

### 1. Operational Health Score
- Aggregate score (0-100) with trend indicator
- Component breakdown: Support, Revenue, Product, Team
- Factor-level drill-down

### 2. Active Situations
- Grouped related events
- Priority-based ordering (P1-P4)
- Quick actions: View, Escalate, Reassign

### 3. Event Timeline
- Chronological event stream
- Severity filtering
- Source filtering
- Time range selection

### 4. Key Metrics
- Configurable KPI widgets
- Sparkline trends
- Status indicators

### 5. Team Pulse
- Real-time team status
- Current assignments
- Availability tracking

### 6. Command Palette (⌘K)
- Global search
- Quick actions
- Navigation shortcuts

### 7. Event Details
- Full context graph
- AI suggestions
- Action history
- Governance info

## Getting Started

### Development

```bash
# Start the backend service
cd services/control-tower-service
pnpm install
pnpm dev

# The service runs at http://localhost:4010/graphql
```

### Running Tests

```bash
# Backend tests
cd services/control-tower-service
pnpm test

# Frontend tests
cd apps/web
pnpm test
```

## GraphQL API

### Key Queries

```graphql
# Get health score
query GetHealthScore {
  healthScore {
    score
    trend
    change
    components {
      name
      score
      status
    }
  }
}

# Get event timeline
query GetEventTimeline($filter: EventFilterInput) {
  eventTimeline(first: 50, filter: $filter) {
    edges {
      node {
        id
        title
        severity
        status
        occurredAt
      }
    }
  }
}

# Get active situations
query GetActiveSituations {
  activeSituations(first: 10) {
    edges {
      node {
        id
        title
        priority
        eventCount
        owner { name }
      }
    }
  }
}
```

### Key Mutations

```graphql
# Acknowledge an event
mutation AcknowledgeEvent($eventId: UUID!) {
  acknowledgeEvent(eventId: $eventId) {
    id
    status
    acknowledgedAt
  }
}

# Create a situation
mutation CreateSituation($input: CreateSituationInput!) {
  createSituation(input: $input) {
    id
    title
    priority
  }
}

# Resolve a situation
mutation ResolveSituation($id: UUID!, $resolution: String!) {
  resolveSituation(id: $id, resolution: $resolution) {
    id
    status
    resolvedAt
  }
}
```

### Subscriptions

```graphql
# Real-time event updates
subscription OnEventCreated {
  eventCreated {
    id
    title
    severity
  }
}

# Health score updates
subscription OnHealthScoreUpdated {
  healthScoreUpdated {
    score
    trend
  }
}
```

## Configuration

### Environment Variables

```bash
# Service configuration
PORT=4010
NODE_ENV=development

# Database connections
NEO4J_URI=bolt://localhost:7687
POSTGRES_URI=postgresql://localhost:5432/control_tower
REDIS_URI=redis://localhost:6379

# Kafka for event streaming
KAFKA_BROKERS=localhost:9092

# Feature flags
ENABLE_AI_SUGGESTIONS=true
ENABLE_REAL_TIME_UPDATES=true
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to Value | < 2 minutes |
| Daily Active Usage | > 80% of ops team |
| Action Completion Rate | > 40% |
| MTTA Reduction | -80% |
| Event Latency | < 5 seconds |

## Roadmap

### Phase 1 (Current)
- [x] Core GraphQL schema
- [x] Basic dashboard components
- [x] Health score calculation
- [x] Event timeline

### Phase 2 (Next)
- [ ] Real data integrations (Stripe, Zendesk, etc.)
- [ ] AI-powered suggestions
- [ ] Playbook execution
- [ ] Advanced alerting

### Phase 3 (Future)
- [ ] Custom dashboard builder
- [ ] ML-based anomaly detection
- [ ] Mobile app
- [ ] Advanced analytics

## Contributing

1. Follow the patterns established in existing components
2. Add tests for new functionality
3. Update documentation for API changes
4. Follow the conventional commit format

## Support

For questions or issues, contact the Product Vertical team.
