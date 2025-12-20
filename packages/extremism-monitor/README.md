# Extremism Monitor Package

Attack planning detection and extremist activity monitoring for counterterrorism intelligence operations.

## Features

- **Attack Planning Detection**: Identify and track potential attack plans
- **Weapons Procurement Monitoring**: Track acquisition of weapons and materials
- **Explosives Tracking**: Monitor explosives and precursor materials
- **Training Activity Detection**: Identify terrorist training activities
- **Communication Analysis**: Analyze communication patterns for threats
- **Travel Pattern Tracking**: Monitor travel to conflict zones
- **Operational Security Monitoring**: Detect security lapses
- **Martyrdom Material Detection**: Identify final testament materials
- **Attack Rehearsal Recognition**: Detect practice runs and rehearsals
- **Risk Assessment**: Evaluate threat levels and attack likelihood

## Usage

```typescript
import { AttackDetector } from '@intelgraph/extremism-monitor';

const detector = new AttackDetector();

// Register an attack plan
await detector.registerAttackPlan({
  id: 'plan-001',
  status: 'PLANNING',
  targetType: 'CIVILIAN',
  targets: [...],
  planners: ['individual-123'],
  confidence: 0.75,
  severity: 'HIGH',
  discovered: new Date(),
  lastUpdated: new Date(),
  intelligence: [],
  indicators: []
});

// Record weapons procurement
await detector.recordWeaponsProcurement({
  id: 'wp-001',
  individualId: 'individual-123',
  weaponTypes: ['SMALL_ARMS', 'EXPLOSIVES'],
  date: new Date(),
  detected: true,
  intelligence: []
});

// Assess risk
const risk = await detector.assessRisk('plan-001');
console.log(`Overall risk: ${risk.overallRisk}`);

// Query attack plans
const results = await detector.queryAttackPlans({
  status: ['PLANNING', 'PREPARATION'],
  severities: ['CRITICAL', 'HIGH']
});
```

## Security Notice

This package is designed for authorized law enforcement and intelligence use only to prevent terrorist attacks and protect public safety.

## License

MIT
