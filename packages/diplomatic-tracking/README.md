# Diplomatic Event Tracking

Comprehensive tracking and analysis of diplomatic events, state visits, summits, negotiations, and international engagements.

## Features

- **Event Tracking**: Track all forms of diplomatic events from state visits to backchannel communications
- **Participant Management**: Detailed tracking of diplomatic personnel and delegations
- **Activity Analysis**: Analyze diplomatic activity patterns and engagement strategies
- **Pattern Detection**: Identify diplomatic styles, preferred venues, and engagement trends
- **Bilateral & Multilateral**: Track both bilateral relationships and multilateral forum participation

## Event Types

- State visits and official visits
- Summits and conferences
- Bilateral and multilateral meetings
- Negotiation sessions
- Embassy and consulate activities
- Cultural and public diplomacy
- Track II diplomacy
- Backchannel communications

## Usage

```typescript
import { DiplomaticEventTracker, DiplomaticEventType } from '@intelgraph/diplomatic-tracking';

const tracker = new DiplomaticEventTracker();

// Track a state visit
tracker.trackStateVisit({
  id: 'sv-001',
  type: DiplomaticEventType.STATE_VISIT,
  title: 'State Visit to France',
  // ... other details
});

// Analyze diplomatic activity
const analysis = tracker.analyzeDiplomaticActivity('USA', 90);
console.log(`Total events: ${analysis.totalEvents}`);
console.log(`Activity trend: ${analysis.activityTrend}`);

// Get bilateral events
const bilateralEvents = tracker.getBilateralEvents('USA', 'China');

// Detect engagement patterns
const patterns = tracker.detectEngagementPatterns('USA');
console.log(`Diplomatic style: ${patterns.diplomaticStyle}`);
```

## API

### DiplomaticEventTracker

- `trackEvent(event)`: Track a diplomatic event
- `trackStateVisit(visit)`: Track a state visit with full details
- `trackSummit(summit)`: Track a summit with working groups
- `trackNegotiationSession(session)`: Track negotiation sessions
- `getEventsByType(type)`: Get events by type
- `getEventsByCountry(country)`: Get events for a country
- `getBilateralEvents(country1, country2)`: Get bilateral events
- `analyzeDiplomaticActivity(country, days)`: Analyze activity patterns
- `detectEngagementPatterns(country)`: Detect diplomatic engagement patterns
