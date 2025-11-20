# Foreign Fighters Package

Comprehensive foreign fighter tracking and returnee monitoring system for counterterrorism intelligence.

## Features

- **Fighter Tracking**: Monitor foreign fighters traveling to conflict zones
- **Journey Mapping**: Track travel routes and facilitator networks
- **Combat Experience**: Document training and operational participation
- **Returnee Monitoring**: Track and assess returned foreign fighters
- **Risk Assessment**: Evaluate threat levels for returnees
- **Network Analysis**: Identify fighter networks and facilitators
- **Skills Transfer Tracking**: Monitor dissemination of combat skills
- **Border Alerts**: Coordinate with border security systems
- **Reintegration Monitoring**: Track deradicalization programs

## Usage

```typescript
import { FighterTracker } from '@intelgraph/foreign-fighters';

const tracker = new FighterTracker();

// Track a fighter
await tracker.trackFighter({
  id: 'fighter-001',
  personalInfo: {
    name: 'John Doe',
    aliases: [],
    nationality: 'US',
    languages: ['English'],
    skills: [],
    background: ''
  },
  status: 'IN_CONFLICT_ZONE',
  journey: {...},
  combatExperience: {...},
  affiliations: [],
  threatLevel: 'HIGH',
  monitoring: {...},
  lastUpdated: new Date()
});

// Register returnee
await tracker.registerReturnee({
  fighterId: 'fighter-001',
  returnDate: new Date(),
  returnReason: 'DISILLUSIONMENT',
  debrief: {...},
  reintegration: {...},
  riskAssessment: {...},
  monitoring: {...}
});

// Assess risk
const risk = await tracker.assessReturneeRisk('fighter-001');
```

## License

MIT
