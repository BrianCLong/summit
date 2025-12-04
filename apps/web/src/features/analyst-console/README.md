# Analyst Console

> Tri-pane intelligence analysis interface with synchronized Graph, Timeline, Map, and "Explain This View" panel.

## Overview

The Analyst Console provides a sophisticated interface for intelligence analysts to explore entity networks, temporal patterns, and geographic distributions. All three panes share synchronized global view state, enabling:

- **Cross-highlighting**: Selecting an entity in the graph highlights related events and locations
- **Time brushing**: Adjusting the timeline filters data across all panes
- **Coordinated filtering**: Entity type and confidence filters apply globally

## Quick Start

```tsx
import {
  AnalystConsole,
  generateMockDataset,
} from '@/features/analyst-console'

// Generate sample data
const data = generateMockDataset({
  entityCount: 20,
  linkCount: 30,
  eventCount: 40,
  locationCount: 15,
})

// Render the console
function AnalysisPage() {
  return (
    <div className="h-screen">
      <AnalystConsole
        entities={data.entities}
        links={data.links}
        events={data.events}
        locations={data.locations}
        onExport={() => console.log('Export clicked')}
      />
    </div>
  )
}
```

## Architecture

### Component Hierarchy

```
AnalystConsole
├── AnalystViewProvider (Context)
│   ├── Header (controls, badges)
│   ├── GraphPane (entity network)
│   ├── TimelinePane (temporal events)
│   ├── AnalystMapPane (geographic)
│   └── ExplainThisViewPanel (summary)
```

### State Management

The console uses React Context (`AnalystViewContext`) for global state:

```tsx
interface AnalystViewState {
  timeWindow: TimeWindow       // from/to ISO timestamps
  filters: AnalystViewFilters  // entity types, event types, confidence
  selection: AnalystSelectionState // selected entity/event/location IDs
}
```

### Available Hooks

```tsx
// Full context access
const { state, setTimeWindow, setFilters, setSelection, resetAll } = useAnalystView()

// Time brush control
const { timeWindow, setTimeWindow } = useGlobalTimeBrush()

// Selection management with helpers
const {
  selection,
  selectEntity,
  deselectEntity,
  toggleEntitySelection,
  isEntitySelected,
  resetSelection,
} = useSelection()

// Filter management
const {
  filters,
  setEntityTypeFilter,
  setEventTypeFilter,
  setMinConfidence,
  resetFilters,
} = useViewFilters()
```

## Components

### AnalystConsole

Main component that orchestrates all panes.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `entities` | `AnalystEntity[]` | Entity nodes for the graph |
| `links` | `AnalystLink[]` | Relationships between entities |
| `events` | `AnalystEvent[]` | Timeline events |
| `locations` | `AnalystLocation[]` | Geographic markers |
| `initialTimeWindow?` | `TimeWindow` | Initial time filter |
| `onExport?` | `() => void` | Export button callback |
| `className?` | `string` | Additional CSS classes |

### GraphPane

Entity network visualization with SVG-based rendering.

**Features:**
- Node coloring by entity type
- Selection highlighting with connected entity emphasis
- Zoom controls
- Entity type legend

### TimelinePane

Temporal event display with time brush functionality.

**Features:**
- Histogram visualization of event density
- Draggable time window selection
- Event cards with severity indicators
- Automatic time range derivation from data

### AnalystMapPane

Geographic visualization of locations.

**Features:**
- Marker clustering for overlapping points
- Zoom and pan controls
- Tooltip with location details
- Selection synchronization

### ExplainThisViewPanel

Dynamic summary panel explaining the current view state.

**Sections:**
- **Summary**: Auto-generated headline describing what's visible
- **View Metrics**: Entity, link, event, location counts
- **Top Entities**: Ranked by importance score and connections
- **Entity Distribution**: Type breakdown with percentages
- **Active Filters**: Current filter state with clear buttons
- **Selection State**: What's currently selected

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘1` | Focus Graph pane |
| `⌘2` | Focus Timeline pane |
| `⌘3` | Focus Map pane |
| `P` | Toggle provenance overlay |
| `E` | Toggle Explain panel |
| `R` | Reset all filters and selections |
| `Esc` | Clear current selection |

## Data Types

### AnalystEntity

```typescript
interface AnalystEntity {
  id: string
  label: string
  type: string                 // "Person", "Org", "Account", etc.
  importanceScore?: number     // 0-1, for ranking
  confidence?: number          // 0-1, data quality
  properties?: Record<string, unknown>
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}
```

### AnalystLink

```typescript
interface AnalystLink {
  id: string
  sourceId: string
  targetId: string
  type: string                 // "communicatesWith", "funds", etc.
  weight?: number
  timestamp?: string
  confidence?: number
}
```

### AnalystEvent

```typescript
interface AnalystEvent {
  id: string
  type: string                 // "COMMUNICATION", "TRANSACTION", etc.
  entityIds: string[]          // Entities involved
  timestamp: string            // ISO 8601
  durationMinutes?: number
  summary: string
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical'
}
```

### AnalystLocation

```typescript
interface AnalystLocation {
  id: string
  entityId?: string            // Associated entity
  label?: string
  lat: number
  lon: number
  firstSeenAt?: string
  lastSeenAt?: string
  type?: 'point' | 'city' | 'region' | 'country'
}
```

## Storybook

View interactive demos:

```bash
cd apps/web
pnpm storybook
```

Navigate to **Features → AnalystConsole** to see:
- Default configuration
- Large dataset performance
- Custom time windows
- Empty states

## Testing

```bash
cd apps/web
pnpm test src/features/analyst-console
```

Test coverage includes:
- Context hook functionality
- Selection state management
- Time window updates
- Component rendering

## Integration with Existing Code

The analyst console is designed to work alongside existing IntelGraph components:

```tsx
// Use with existing data sources
import { useEntitiesQuery, useEventsQuery } from '@/hooks/useGraphData'
import { AnalystConsole } from '@/features/analyst-console'

function IntegratedAnalysis() {
  const { entities, links } = useEntitiesQuery()
  const { events } = useEventsQuery()
  const { locations } = useLocationsQuery()

  return (
    <AnalystConsole
      entities={entities.map(e => ({
        id: e.id,
        label: e.name,
        type: e.type,
        importanceScore: e.confidence,
        confidence: e.confidence,
      }))}
      links={links.map(l => ({
        id: l.id,
        sourceId: l.sourceId,
        targetId: l.targetId,
        type: l.type,
        confidence: l.confidence,
      }))}
      events={events}
      locations={locations}
    />
  )
}
```

## Performance Considerations

- **Large datasets**: The graph uses SVG rendering which may slow down with >500 nodes. Consider implementing canvas-based rendering for larger datasets.
- **Event filtering**: Time window changes trigger re-filtering. Events are sorted once and filtered incrementally.
- **Memoization**: Heavy computations (filtered data, explanations) are memoized with `useMemo`.

## Future Enhancements

- [ ] Canvas-based graph rendering for large networks
- [ ] Real Leaflet/Mapbox integration for map pane
- [ ] GraphQL subscription for real-time updates
- [ ] Export to PNG/PDF functionality
- [ ] Saved view states
- [ ] Collaborative annotations
