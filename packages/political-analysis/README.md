# @intelgraph/political-analysis

Comprehensive political intelligence and analysis platform for tracking political actors, power dynamics, stability indicators, and generating actionable insights.

## Features

- **Political Landscape Analysis**: Comprehensive analysis of political actors, government structures, and power dynamics
- **Power Dynamics Tracking**: Monitor alliances, conflicts, and shifts in political power
- **Stability Assessment**: Evaluate political stability with multi-dimensional indicators
- **Electoral Forecasting**: Generate predictions for election outcomes
- **Policy Analysis**: Track and analyze policy positions across domains
- **Leadership Assessment**: Evaluate leadership qualities and effectiveness
- **Intelligence Processing**: Collect, process, and analyze political intelligence
- **Pattern Detection**: Automatically identify patterns and trends in intelligence data
- **Insight Generation**: Generate actionable insights from intelligence and analysis
- **Event-Driven Architecture**: Real-time notifications via EventEmitter

## Installation

```bash
npm install @intelgraph/political-analysis
```

## Quick Start

### Political Analysis

```typescript
import { PoliticalAnalyzer, PoliticalAnalysisConfig } from '@intelgraph/political-analysis';

// Initialize the analyzer
const config: PoliticalAnalysisConfig = {
  country: 'USA',
  trackActors: true,
  trackTrends: true,
  trackStability: true,
  forecastElections: true,
  enableRealTimeAnalysis: true,
  cacheResults: true
};

const analyzer = new PoliticalAnalyzer(config);

// Listen to events
analyzer.on('analysis:complete', (analysis) => {
  console.log('Political landscape analysis complete:', analysis);
});

analyzer.on('stability:changed', (stability) => {
  console.log('Political stability update:', stability);
});

analyzer.on('power:shift', (shift) => {
  console.log('Power shift detected:', shift);
});

// Analyze political landscape
const analysis = await analyzer.analyzePoliticalLandscape('USA', undefined, {
  depth: 'comprehensive',
  includeActors: true,
  includeTrends: true,
  includeStability: true,
  includePowerDynamics: true
});

console.log('Overview:', analysis.overview);
console.log('Stability Level:', analysis.stability.overallLevel);
console.log('Key Actors:', analysis.keyActors.length);
console.log('Active Trends:', analysis.trends.length);
console.log('Risk Factors:', analysis.risks.length);
```

### Intelligence Processing

```typescript
import {
  IntelligenceEngine,
  IntelligenceEngineConfig,
  IntelligenceSource,
  IntelligenceConfidence,
  IntelligenceCategory
} from '@intelgraph/political-analysis';

// Initialize the intelligence engine
const config: IntelligenceEngineConfig = {
  sources: [
    IntelligenceSource.OSINT,
    IntelligenceSource.MEDIA,
    IntelligenceSource.DIPLOMATIC,
    IntelligenceSource.ANALYSIS
  ],
  minimumConfidence: IntelligenceConfidence.MODERATE,
  patternDetection: true,
  insightGeneration: true,
  autoProcess: true,
  retentionPeriod: 365
};

const engine = new IntelligenceEngine(config);

// Listen to events
engine.on('intelligence:received', (intel) => {
  console.log('New intelligence received:', intel.title);
});

engine.on('pattern:detected', (pattern) => {
  console.log('Pattern detected:', pattern.name);
});

engine.on('insight:generated', (insight) => {
  console.log('Insight generated:', insight.title);
});

// Collect intelligence
const intelligence = await engine.collectIntelligence(
  IntelligenceSource.OSINT,
  IntelligenceCategory.LEADERSHIP,
  {
    country: 'USA',
    title: 'Leadership Transition Planning',
    summary: 'Key political leaders discussing succession planning',
    details: 'Detailed intelligence about leadership transition discussions...',
    actors: ['leader-1', 'leader-2'],
    implications: ['Potential policy shifts', 'Alliance restructuring'],
    urgency: 'HIGH',
    confidence: IntelligenceConfidence.HIGH,
    verified: true,
    tags: ['leadership', 'succession', 'planning']
  }
);

// Process intelligence
const result = await engine.processIntelligence(intelligence.id, {
  detectPatterns: true,
  generateInsights: true,
  crossReference: true
});

console.log('Patterns detected:', result.patterns.length);
console.log('Insights generated:', result.insights.length);
```

## Core Components

### PoliticalAnalyzer

Main analysis engine for comprehensive political intelligence and analysis.

#### Methods

- `analyzePoliticalLandscape(country, region?, options?)`: Analyze the political landscape
- `trackPowerDynamics(country, region?)`: Track and analyze power dynamics
- `assessPoliticalStability(country, region?, options?)`: Assess political stability
- `forecastElection(country, electionId, electionDate, options?)`: Generate electoral forecasts
- `analyzePolicyPositions(actorId, domains?)`: Analyze policy positions
- `assessLeadership(leaderId, options?)`: Assess leadership qualities
- `analyzePowerShifts(country, timeframe, region?)`: Analyze power shifts over time
- `addActor(actor)`: Add a political actor to track
- `addTrend(trend)`: Add a political trend to track
- `clearCache()`: Clear analysis cache
- `getConfig()`: Get current configuration
- `updateConfig(config)`: Update configuration

#### Events

- `analysis:complete`: Emitted when political landscape analysis completes
- `stability:changed`: Emitted when political stability changes
- `power:shift`: Emitted when power shifts are detected
- `trend:emerging`: Emitted when new trends are identified
- `conflict:detected`: Emitted when new conflicts are identified
- `alliance:formed`: Emitted when new alliances are formed
- `leader:change`: Emitted when leadership changes occur
- `election:result`: Emitted when election results are processed
- `risk:alert`: Emitted for new risk factors
- `error`: Emitted on errors

### IntelligenceEngine

Advanced intelligence processing and analysis engine.

#### Methods

- `collectIntelligence(source, category, data)`: Collect political intelligence
- `processIntelligence(intelligenceId, options?)`: Process intelligence to extract insights and patterns
- `analyzeIntelligence(filters?)`: Analyze multiple intelligence reports
- `trackPatterns(options?)`: Track patterns and correlations
- `generateInsights(intelligence, relatedPatterns?)`: Generate insights from intelligence
- `getAllIntelligence()`: Get all intelligence
- `getIntelligence(id)`: Get intelligence by ID
- `getAllPatterns()`: Get all detected patterns
- `getAllInsights()`: Get all generated insights
- `cleanupOldIntelligence()`: Clean up old intelligence based on retention policy
- `getConfig()`: Get current configuration
- `updateConfig(config)`: Update configuration

#### Events

- `intelligence:received`: Emitted when new intelligence is collected
- `insight:generated`: Emitted when new insights are generated
- `pattern:detected`: Emitted when patterns are detected
- `error`: Emitted on errors

## Type Definitions

### Political Actors

```typescript
enum PoliticalActorType {
  LEADER, PARTY, FACTION, COALITION, OPPOSITION,
  ACTIVIST_GROUP, MILITARY_LEADER, RELIGIOUS_LEADER,
  BUSINESS_ELITE, MEDIA_INFLUENCER
}

interface PoliticalActor {
  id: string;
  type: PoliticalActorType;
  name: string;
  country: string;
  region?: string;
  ideology: IdeologyType[];
  powerLevel: PowerLevel;
  description: string;
  active: boolean;
  // ... additional fields
}

interface PoliticalLeader extends PoliticalActor {
  fullName: string;
  position: string;
  approval?: ApprovalRating;
  leadership: LeadershipProfile;
  alliances: string[];
  rivals: string[];
}

interface PoliticalParty extends PoliticalActor {
  leader: string;
  seats?: number;
  votingShare?: number;
  platform: PolicyPosition[];
}
```

### Power Dynamics

```typescript
interface PowerDynamics {
  id: string;
  country: string;
  powerStructure: PowerStructure;
  alliances: PoliticalAlliance[];
  conflicts: PoliticalConflict[];
  balanceOfPower: PowerBalance[];
  influenceNetworks: InfluenceNetwork[];
}

interface PowerStructure {
  dominantActors: string[];
  risingActors: string[];
  decliningActors: string[];
  powerConcentration: number; // 0-100
  competitiveness: number; // 0-100
}

interface PoliticalAlliance {
  id: string;
  name: string;
  members: string[];
  type: 'COALITION' | 'INFORMAL' | 'STRATEGIC' | 'IDEOLOGICAL';
  strength: number;
  stability: number;
}
```

### Political Stability

```typescript
enum StabilityLevel {
  STABLE, MOSTLY_STABLE, UNCERTAIN, UNSTABLE,
  VOLATILE, CRISIS, COLLAPSE
}

interface PoliticalStability {
  id: string;
  country: string;
  overallLevel: StabilityLevel;
  overallScore: number; // 0-100
  indicators: StabilityIndicator[];
  riskFactors: RiskFactor[];
  stabilizingFactors: string[];
  trajectory: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  forecast: StabilityForecast;
}

interface StabilityIndicator {
  category: StabilityCategory;
  score: number; // 0-100
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  dataPoints: IndicatorDataPoint[];
}

interface RiskFactor {
  type: 'POLITICAL' | 'SOCIAL' | 'ECONOMIC' | 'SECURITY' | 'INSTITUTIONAL';
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  likelihood: number; // 0-100
  impact: number; // 0-100
}
```

### Political Intelligence

```typescript
enum IntelligenceSource {
  HUMINT, OSINT, SIGINT, DIPLOMATIC, MEDIA,
  ACADEMIC, LEAKED, INSIDER, ANALYSIS
}

enum IntelligenceConfidence {
  CONFIRMED, HIGH, MODERATE, LOW, UNCONFIRMED, RUMOR
}

enum IntelligenceCategory {
  LEADERSHIP, POLICY, ELECTION, COUP, PROTEST,
  ALLIANCE, CONFLICT, CORRUPTION, SUCCESSION,
  REFORM, CRISIS, FOREIGN_RELATIONS
}

interface PoliticalIntelligence {
  id: string;
  source: IntelligenceSource;
  confidence: IntelligenceConfidence;
  country: string;
  category: IntelligenceCategory;
  title: string;
  summary: string;
  details: string;
  actors: string[];
  implications: string[];
  urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  verified: boolean;
}

interface IntelligencePattern {
  id: string;
  name: string;
  type: 'TREND' | 'ANOMALY' | 'CYCLE' | 'CORRELATION';
  description: string;
  intelligence: string[];
  confidence: number;
  significance: number;
}

interface IntelligenceInsight {
  id: string;
  title: string;
  type: 'ANALYSIS' | 'PREDICTION' | 'WARNING' | 'OPPORTUNITY';
  content: string;
  confidence: number;
  impact: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}
```

## Advanced Usage

### Power Dynamics Analysis

```typescript
// Track power dynamics
const powerDynamics = await analyzer.trackPowerDynamics('USA');

console.log('Dominant Actors:', powerDynamics.powerStructure.dominantActors);
console.log('Rising Actors:', powerDynamics.powerStructure.risingActors);
console.log('Power Concentration:', powerDynamics.powerStructure.powerConcentration);
console.log('Active Alliances:', powerDynamics.alliances.length);
console.log('Active Conflicts:', powerDynamics.conflicts.length);

// Analyze power shifts
const assessment = await analyzer.analyzePowerShifts(
  'USA',
  { start: new Date('2023-01-01'), end: new Date('2024-01-01') }
);

console.log('Power Shifts:', assessment.shifts);
console.log('Forecast:', assessment.forecast);
```

### Stability Assessment

```typescript
// Assess political stability
const stability = await analyzer.assessPoliticalStability('USA', undefined, {
  includeForecast: true,
  timeframe: 'MEDIUM_TERM'
});

console.log('Stability Level:', stability.overallLevel);
console.log('Overall Score:', stability.overallScore);
console.log('Trajectory:', stability.trajectory);
console.log('Risk Factors:', stability.riskFactors);
console.log('Forecast:', stability.forecast);
```

### Electoral Forecasting

```typescript
// Generate electoral forecast
const forecast = await analyzer.forecastElection(
  'USA',
  'election-2024',
  new Date('2024-11-05'),
  {
    includeScenarios: true,
    methodology: 'Advanced Statistical Model'
  }
);

console.log('Predictions:', forecast.predictions);
console.log('Scenarios:', forecast.scenarios);
console.log('Key Factors:', forecast.keyFactors);
console.log('Confidence:', forecast.confidence);
```

### Intelligence Analysis

```typescript
// Analyze intelligence with filters
const analysis = await engine.analyzeIntelligence({
  country: 'USA',
  category: IntelligenceCategory.LEADERSHIP,
  minConfidence: IntelligenceConfidence.MODERATE,
  startDate: new Date('2024-01-01')
});

console.log('Intelligence Reports:', analysis.intelligence.length);
console.log('Patterns Detected:', analysis.patterns.length);
console.log('Insights Generated:', analysis.insights.length);
console.log('Emerging Trends:', analysis.trends.length);
console.log('Risk Factors:', analysis.risks.length);

// Track patterns
const patterns = await engine.trackPatterns({
  minOccurrences: 3,
  minConfidence: 70,
  timeWindow: 90 // days
});

console.log('Significant Patterns:', patterns);
```

### Adding Political Actors and Trends

```typescript
import {
  PoliticalActorType,
  PowerLevel,
  IdeologyType,
  PoliticalTrendType
} from '@intelgraph/political-analysis';

// Add a political leader
analyzer.addActor({
  id: 'leader-1',
  type: PoliticalActorType.LEADER,
  name: 'John Doe',
  country: 'USA',
  ideology: [IdeologyType.LIBERAL, IdeologyType.PROGRESSIVE],
  powerLevel: PowerLevel.STRONG,
  description: 'Senior political leader with strong influence',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Add a political trend
analyzer.addTrend({
  id: 'trend-1',
  type: PoliticalTrendType.DEMOCRATIZATION,
  country: 'USA',
  title: 'Democratic Reform Movement',
  description: 'Growing movement for democratic reforms',
  startDate: new Date('2023-01-01'),
  active: true,
  strength: 75,
  momentum: 'ACCELERATING',
  drivers: ['Civil society pressure', 'International support'],
  impacts: [],
  relatedActors: ['leader-1'],
  indicators: [],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Best Practices

1. **Configure Appropriately**: Set up proper configuration based on your needs (caching, update intervals, etc.)
2. **Use Event Listeners**: Leverage event emitters for real-time updates and notifications
3. **Cache Management**: Clear cache periodically for fresh analysis
4. **Confidence Thresholds**: Set appropriate confidence thresholds for intelligence filtering
5. **Pattern Detection**: Enable pattern detection for deeper insights
6. **Regular Updates**: Update political actors and trends regularly for accurate analysis
7. **Error Handling**: Always handle errors from async operations
8. **Intelligence Retention**: Configure appropriate retention periods for intelligence data

## Performance Considerations

- **Caching**: Enable result caching to reduce computation for frequently accessed data
- **Batch Processing**: Process multiple intelligence reports together for efficiency
- **Auto-Processing**: Use auto-processing for background intelligence analysis
- **Retention Policies**: Clean up old intelligence regularly to maintain performance
- **Event Throttling**: Be mindful of event listener performance with high-volume data

## Integration Examples

### With Geopolitical Monitor

```typescript
import { PoliticalAnalyzer } from '@intelgraph/political-analysis';
import { GeopoliticalMonitor } from '@intelgraph/geopolitical-monitor';

const analyzer = new PoliticalAnalyzer();
const monitor = new GeopoliticalMonitor();

// Coordinate analysis
monitor.on('event:detected', async (event) => {
  if (event.category === 'political') {
    const analysis = await analyzer.analyzePoliticalLandscape(
      event.country,
      event.region
    );
    console.log('Political impact:', analysis);
  }
});
```

### With Country Risk

```typescript
import { PoliticalAnalyzer } from '@intelgraph/political-analysis';
import { CountryRisk } from '@intelgraph/country-risk';

const analyzer = new PoliticalAnalyzer();
const riskEngine = new CountryRisk();

// Integrate stability assessment
analyzer.on('stability:changed', (stability) => {
  riskEngine.updatePoliticalRisk(stability.country, {
    stabilityScore: stability.overallScore,
    riskFactors: stability.riskFactors
  });
});
```

## API Reference

For detailed API documentation, see the TypeScript definitions in `src/types/index.ts`.

## Contributing

Contributions are welcome! Please follow the project's coding standards and include tests for new features.

## License

MIT

## Support

For issues, questions, or contributions, please contact the IntelGraph Team.
