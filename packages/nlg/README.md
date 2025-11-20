# @summit/nlg

Natural Language Generation (NLG) for automated intelligence report narratives, executive summaries, key findings extraction, and data-driven storytelling.

## Features

- **Narrative Generation**: Create flowing narratives from structured data
- **Text Summarization**: Generate executive summaries and key points
- **Data-to-Text**: Convert analytics and trends into readable narratives
- **Finding Extraction**: Automatically identify and articulate key findings
- **Recommendation Synthesis**: Generate actionable recommendations
- **Multi-tone Support**: Formal, technical, or executive communication styles

## Installation

```bash
pnpm add @summit/nlg
```

## Quick Start

### Narrative Generation

```typescript
import { NarrativeGenerator } from '@summit/nlg';

const generator = new NarrativeGenerator();

const narrative = await generator.generateNarrative({
  data: {
    threatActor: 'APT28',
    severity: 'high',
    capability: 'advanced persistent threat capabilities',
    targets: ['Government agencies', 'Defense contractors', 'Think tanks']
  },
  context: 'threat-assessment',
  tone: 'formal',
  audience: 'executives',
  purpose: 'threat-assessment'
});

console.log(narrative.text);
// Output: "This assessment evaluates the high threat posed by APT28.
//          Based on recent intelligence, this actor demonstrates advanced
//          persistent threat capabilities and has shown intent to target
//          Government agencies, Defense contractors, Think tanks."
```

### Text Summarization

```typescript
import { TextSummarizer } from '@summit/nlg';

const summarizer = new TextSummarizer();

const longReport = `
  [Your long intelligence report text here...]
`;

const summary = await summarizer.generateExecutiveSummary(longReport, {
  style: 'abstractive',
  maxLength: 500,
  includeKeywords: true
});

console.log(summary.summary);
console.log('Key Points:', summary.keyPoints);
console.log('Keywords:', summary.keywords);
```

### Data Narrative Analysis

```typescript
import { DataNarrativeAnalyzer } from '@summit/nlg';

const analyzer = new DataNarrativeAnalyzer();

const dataPoints = [
  { timestamp: new Date('2025-01-01'), value: 100 },
  { timestamp: new Date('2025-02-01'), value: 150 },
  { timestamp: new Date('2025-03-01'), value: 180 },
  { timestamp: new Date('2025-04-01'), value: 220 }
];

const analysis = analyzer.analyzeTrend(dataPoints, 'phishing attempts');

console.log(analysis.narrative);
// Output: "Analysis of phishing attempts shows a high significance increasing trend
//          with a 120.0% increase over the analyzed period from 2025-01-01 to 2025-04-01.
//          This trend demonstrates strong momentum and warrants close attention."

console.log('Direction:', analysis.direction);    // 'increasing'
console.log('Significance:', analysis.significance); // 'high'
console.log('Insights:', analysis.insights);
```

## Generate Findings and Recommendations

```typescript
const generator = new NarrativeGenerator();

// Generate findings
const findings = await generator.generateFindings({
  events: [/* event data */],
  trends: [
    { direction: 'increasing', category: 'malware infections' },
    { direction: 'stable', category: 'phishing attempts' }
  ],
  anomalies: [/* anomaly data */]
}, 5);

console.log('Findings:', findings);

// Generate recommendations
const recommendations = await generator.generateRecommendations({
  threats: [/* threat data */],
  gaps: ['Attribution uncertainty', 'Limited endpoint visibility'],
  urgency: 'high'
}, 'threat-mitigation');

console.log('Recommendations:', recommendations);
```

## Trend Description

```typescript
const analyzer = new DataNarrativeAnalyzer();

const description = analyzer.generateTrendDescription(
  dataPoints,
  'network intrusion attempts'
);

console.log(description);
// Output: "The network intrusion attempts has increased significantly over
//          the reporting period, with a 120.0% change from baseline."
```

## Compare Multiple Metrics

```typescript
const comparison = analyzer.compareMetrics([
  { name: 'Phishing', data: phishingData },
  { name: 'Malware', data: malwareData },
  { name: 'DDoS', data: ddosData }
]);

console.log(comparison);
// Output: "Comparative analysis reveals: Phishing, Malware showing upward trends.
//          DDoS showing downward trends. High significance trends in Phishing,
//          Malware require immediate attention."
```

## Multi-Document Summarization

```typescript
const summarizer = new TextSummarizer();

const documents = [
  { title: 'Report 1', content: '...' },
  { title: 'Report 2', content: '...' },
  { title: 'Report 3', content: '...' }
];

const summary = await summarizer.summarizeMultiple(documents, {
  style: 'abstractive',
  maxLength: 1000
});
```

## License

MIT
