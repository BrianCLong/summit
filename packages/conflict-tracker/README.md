# Conflict Tracker

Armed conflict and security monitoring system for comprehensive geopolitical intelligence.

## Features

- **Conflict Monitoring**: Track active conflicts, wars, insurgencies, and military operations
- **Casualty Tracking**: Monitor military and civilian casualties with verification
- **Ceasefire Monitoring**: Track ceasefires, violations, and peace agreements
- **Military Activity**: Monitor troop movements, deployments, and military exercises
- **Security Incidents**: Track attacks, bombings, and other security events
- **Risk Assessment**: Escalation risk analysis and spillover assessment
- **Humanitarian Analysis**: Assess displacement and humanitarian needs
- **Resolution Prospects**: Evaluate peace negotiation prospects

## Installation

```bash
pnpm add @intelgraph/conflict-tracker
```

## Usage

```typescript
import { ConflictTracker, ConflictAnalyzer, ConflictType, ConflictStatus } from '@intelgraph/conflict-tracker';

const tracker = new ConflictTracker();
const analyzer = new ConflictAnalyzer();

// Start monitoring
await tracker.start(300000); // Update every 5 minutes

// Track a conflict
tracker.trackConflict({
  id: 'conflict-001',
  name: 'Regional Conflict',
  type: ConflictType.CIVIL_WAR,
  status: ConflictStatus.ACTIVE,
  intensity: IntensityLevel.HIGH,
  countries: ['COUNTRY_A'],
  regions: ['REGION_1'],
  // ... more details
});

// Listen for alerts
tracker.on('alert', (alert) => {
  console.log(`Alert: ${alert.message}`);
});

// Analyze conflict
const analysis = analyzer.analyzeConflict(conflict);
console.log('Escalation Risk:', analysis.escalation_risk);
console.log('Recommendations:', analysis.recommendations);
```

## License

MIT
