# Radicalization Detection Package

Comprehensive radicalization monitoring and pathway detection for early intervention and prevention.

## Features

- **Radicalization Profiling**: Track individuals through radicalization stages
- **Online Pathway Analysis**: Monitor online radicalization activities
- **Content Tracking**: Identify and track extremist content propagation
- **Social Network Analysis**: Analyze peer influence and network effects
- **Ideological Evolution**: Track ideological shifts and changes
- **Gateway Content Detection**: Identify content that leads to extremism
- **Echo Chamber Detection**: Identify isolating online communities
- **Intervention Recommendations**: Suggest appropriate interventions
- **Risk Assessment**: Calculate radicalization risk scores

## Usage

```typescript
import { RadicalizationMonitor } from '@intelgraph/radicalization-detection';

const monitor = new RadicalizationMonitor();

// Monitor an individual
await monitor.monitorIndividual({
  id: 'profile-001',
  individualId: 'person-123',
  status: 'AT_RISK',
  stage: 'IDENTIFICATION',
  pathway: { primary: 'ONLINE', description: 'Social media radicalization' },
  indicators: [],
  timeline: { profileCreated: new Date(), stageProgression: [], criticalEvents: [] },
  influences: [],
  interventions: [],
  riskScore: 0.5,
  lastAssessed: new Date()
});

// Get intervention recommendations
const interventions = await monitor.recommendInterventions('person-123');
```

## Security Notice

This package supports deradicalization and prevention efforts by authorized organizations only.

## License

MIT
