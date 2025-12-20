# Propaganda Analysis Package

Comprehensive terrorist propaganda and messaging analysis for understanding and countering extremist narratives.

## Features

- **Content Analysis**: Analyze propaganda videos, audio, articles, and social media
- **Narrative Tracking**: Monitor narrative evolution and messaging themes
- **Distribution Monitoring**: Track content distribution networks and reach
- **Impact Assessment**: Evaluate propaganda effectiveness and influence
- **Media Production Tracking**: Monitor terrorist media operations
- **Spokesperson Monitoring**: Track key propaganda figures
- **Recruitment Analysis**: Analyze recruitment messaging tactics
- **Language Analysis**: Identify translators and target regions
- **Audience Analysis**: Understand target demographics and engagement
- **Counter-Narrative Identification**: Find opportunities for counter-messaging
- **Campaign Tracking**: Monitor coordinated propaganda campaigns

## Usage

```typescript
import { PropagandaAnalyzer } from '@intelgraph/propaganda-analysis';

const analyzer = new PropagandaAnalyzer();

// Analyze content
await analyzer.analyzeContent({
  id: 'content-001',
  type: 'VIDEO',
  organization: 'org-001',
  created: new Date(),
  discovered: new Date(),
  language: 'en',
  themes: ['martyrdom', 'revenge'],
  narrative: {...},
  distribution: {...},
  impact: {...},
  removed: false
});

// Identify counter-narrative opportunities
const results = await analyzer.query({
  minReach: 10000
});

console.log(results.counterNarrativeOpportunities);
```

## License

MIT
