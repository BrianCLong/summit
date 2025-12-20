# Bilateral Relations Monitoring

Monitor and analyze bilateral relationships between countries, tracking cooperation, disputes, and relationship trajectories.

## Features

- **Relationship Tracking**: Comprehensive monitoring of bilateral relationships
- **Health Assessment**: Evaluate relationship health and stability
- **Crisis Detection**: Identify relationships at risk
- **Pattern Analysis**: Analyze cooperation patterns and trends
- **Risk Detection**: Detect and assess relationship risks

## Usage

```typescript
import { BilateralRelationsMonitor, RelationshipStatus } from '@intelgraph/bilateral-relations';

const monitor = new BilateralRelationsMonitor();

// Track relationship
monitor.trackRelationship({
  country1: 'USA',
  country2: 'China',
  status: RelationshipStatus.STRAINED,
  // ... details
});

// Assess health
const health = monitor.assessRelationshipHealth('USA', 'China');

// Identify crisis relationships
const crises = monitor.identifyCrisisRelationships();

// Detect risks
const risks = monitor.detectRelationshipRisks('USA', 'China');
```
