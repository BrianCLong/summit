# Geopolitical Monitor

Comprehensive geopolitical event monitoring and tracking system for real-time political intelligence.

## Features

- **Real-time Event Monitoring**: Track political events, elections, conflicts, and diplomatic activities globally
- **Multi-source Integration**: Collect data from news media, government sources, intelligence reports, and social media
- **Risk Assessment**: Automatic risk level classification and impact analysis
- **Event Analysis**: Trend identification, historical comparison, and predictive analytics
- **Alert System**: Configurable alerts for high-risk events and volatility spikes
- **Event Correlation**: Identify related events and temporal patterns

## Installation

```bash
pnpm add @intelgraph/geopolitical-monitor
```

## Usage

### Basic Monitoring

```typescript
import { GeopoliticalMonitor, EventType, RiskLevel, EventSource } from '@intelgraph/geopolitical-monitor';

// Configure monitoring
const monitor = new GeopoliticalMonitor({
  regions: ['MIDDLE_EAST', 'EAST_ASIA'],
  countries: ['USA', 'CHN', 'RUS'],
  eventTypes: [EventType.ELECTION, EventType.CONFLICT, EventType.SANCTIONS_IMPOSED],
  minRiskLevel: RiskLevel.MEDIUM,
  minConfidence: 0.7,
  sources: [EventSource.NEWS_MEDIA, EventSource.GOVERNMENT_OFFICIAL],
  updateInterval: 60000, // 1 minute
  enableAlerts: true,
  alertThresholds: {
    riskLevel: RiskLevel.HIGH,
    volatilityScore: 70
  }
});

// Listen for events
monitor.on('event', (event) => {
  console.log(`New event: ${event.title}`);
  console.log(`Risk Level: ${event.riskLevel}`);
  console.log(`Impact Score: ${event.impact.overall}`);
});

// Listen for alerts
monitor.on('alert', (alert) => {
  console.log(`ALERT: ${alert.title}`);
  console.log(`Severity: ${alert.severity}`);
});

// Start monitoring
await monitor.start();
```

### Event Collection

```typescript
import { EventCollector, EventSource } from '@intelgraph/geopolitical-monitor';

const collector = new EventCollector();

// Register data sources
collector.registerSource({
  id: 'reuters',
  name: 'Reuters News',
  type: EventSource.NEWS_MEDIA,
  url: 'https://api.reuters.com',
  apiKey: process.env.REUTERS_API_KEY,
  enabled: true,
  reliability: 0.9
});

// Listen for collected events
collector.on('event-collected', (event) => {
  console.log(`Collected: ${event.title}`);
  // Pass to monitor
  monitor.trackEvent(event);
});

// Start collection
await collector.startCollection(60000); // Every minute
```

### Event Analysis

```typescript
import { EventAnalyzer } from '@intelgraph/geopolitical-monitor';

const analyzer = new EventAnalyzer();

// Analyze an event
const analysis = await analyzer.analyzeEvent(event);

console.log('Identified Trends:', analysis.trends);
console.log('Historical Comparisons:', analysis.historicalComparison);
console.log('Predictions:', analysis.predictions);
console.log('Recommendations:', analysis.recommendations);
```

### Filtering Events

```typescript
// Get events with filtering
const recentCrises = monitor.getEvents({
  riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL],
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  },
  verified: true,
  minConfidence: 0.8
});

console.log(`Found ${recentCrises.length} high-risk events in the past week`);
```

### Monitoring Statistics

```typescript
const stats = monitor.getStats();

console.log('Total Events:', stats.totalEvents);
console.log('Events by Type:', stats.eventsByType);
console.log('Events by Risk Level:', stats.eventsByRisk);
console.log('Events by Country:', stats.eventsByCountry);
```

## Event Types

- `ELECTION` - Electoral processes and results
- `POLITICAL_TRANSITION` - Government changes and transitions
- `POLICY_CHANGE` - Major policy announcements and changes
- `LEADERSHIP_CHANGE` - Changes in political leadership
- `COALITION_FORMATION` - Political coalition formation/dissolution
- `REFERENDUM` - Referendums and ballot initiatives
- `PROTEST` - Political protests and demonstrations
- `COUP` - Coups and regime changes
- `POLITICAL_VIOLENCE` - Political violence and assassinations
- `DIPLOMATIC_EVENT` - International diplomatic events
- `SUMMIT` - International summits and conferences
- `SANCTIONS_IMPOSED` - Economic sanctions imposed
- `TREATY_SIGNED` - International treaties signed
- And more...

## Risk Levels

- `LOW` - Minimal impact, routine political activity
- `MEDIUM` - Moderate impact, requires monitoring
- `HIGH` - Significant impact, requires immediate attention
- `CRITICAL` - Severe impact, crisis situation

## API Reference

### GeopoliticalMonitor

Main monitoring class for tracking geopolitical events.

#### Methods

- `start()` - Start monitoring
- `stop()` - Stop monitoring
- `trackEvent(event)` - Track a new event
- `getEvents(filter?)` - Get events with optional filtering
- `getEvent(id)` - Get specific event by ID
- `updateEvent(id, updates)` - Update an existing event
- `getStats()` - Get monitoring statistics
- `clearEvents()` - Clear all tracked events

#### Events

- `started` - Monitoring started
- `stopped` - Monitoring stopped
- `event` - New event tracked
- `event-updated` - Event updated
- `alert` - Alert generated
- `high-risk-event` - High-risk event detected
- `update-cycle` - Update cycle completed

### EventCollector

Collects events from various data sources.

#### Methods

- `registerSource(source)` - Register a data source
- `removeSource(id)` - Remove a data source
- `startCollection(interval)` - Start collecting events
- `stopCollection()` - Stop collecting events
- `parseNewsEvent(article)` - Parse news article into event

#### Events

- `event-collected` - New event collected
- `collection-error` - Error during collection

### EventAnalyzer

Analyzes and correlates geopolitical events.

#### Methods

- `analyzeEvent(event)` - Analyze an event
- `addToHistory(event)` - Add event to historical database
- `clearHistory()` - Clear historical events

## Configuration

### MonitoringConfig

```typescript
interface MonitoringConfig {
  regions: string[];              // Geographic regions to monitor
  countries: string[];            // Specific countries to monitor
  eventTypes: EventType[];        // Event types to track
  minRiskLevel: RiskLevel;        // Minimum risk level threshold
  minConfidence: number;          // Minimum confidence score (0-1)
  sources: EventSource[];         // Allowed data sources
  updateInterval: number;         // Update interval in milliseconds
  enableAlerts: boolean;          // Enable alert generation
  alertThresholds: {
    riskLevel: RiskLevel;         // Alert risk threshold
    volatilityScore: number;      // Alert volatility threshold
  };
}
```

## License

MIT
