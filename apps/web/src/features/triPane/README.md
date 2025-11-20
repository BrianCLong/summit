# Tri-Pane Analysis Shell

A synchronized three-pane interface for comprehensive data analysis, combining graph visualization, timeline events, and geographic mapping.

## Overview

The Tri-Pane Analysis Shell provides an integrated view of:
- **Graph Pane**: Entity relationship visualization with force-directed, radial, or hierarchical layouts
- **Timeline Pane**: Temporal event tracking with time-based filtering
- **Map Pane**: Geographic event visualization with location-based insights

All three panes are synchronized through a unified state management system, enabling "brushing" interactions where selections and filters in one pane automatically update the others.

## Features

- ✅ **Synchronized Brushing**: Time range filters apply across all panes
- ✅ **Entity Selection**: Click entities in any pane to highlight related data
- ✅ **Keyboard Shortcuts**: Quick navigation and actions (G/T/M for panes, R for reset, E for export)
- ✅ **Accessibility**: WCAG AAA compliant with screen reader support
- ✅ **Mock Data Service**: Pre-configured test data for development
- ✅ **TypeScript Contracts**: Clear interfaces for team integration
- ✅ **Provenance Overlay**: Optional data lineage visualization
- ✅ **Export Functionality**: JSON data export capability

## Quick Start

### Basic Usage

```tsx
import { TriPaneShell } from '@/features/triPane'
import { useMockTriPaneData } from '@/features/triPane'

function MyAnalysisPage() {
  const { entities, relationships, timelineEvents, geospatialEvents } =
    await useMockTriPaneData()

  return (
    <TriPaneShell
      entities={entities}
      relationships={relationships}
      timelineEvents={timelineEvents}
      geospatialEvents={geospatialEvents}
      onEntitySelect={(entity) => console.log('Selected:', entity)}
      onExport={() => console.log('Exporting...')}
    />
  )
}
```

### Using the Page Component

The easiest way to use the tri-pane shell is through the pre-configured page:

```tsx
// Access via route: /analysis/tri-pane
import TriPanePage from '@/pages/TriPanePage'
```

## Architecture

### Component Structure

```
features/triPane/
├── types.ts              # TypeScript interfaces and contracts
├── mockData.ts           # Mock data generation utilities
├── TriPaneShell.tsx      # Main shell component
├── MapPane.tsx           # Geographic visualization pane
├── TriPaneShell.test.tsx # Component tests
├── TriPaneShell.stories.tsx # Storybook stories
└── index.ts              # Public API exports
```

### Data Flow

```
User Interaction → Pane Component → TriPaneShell → State Update → All Panes Re-render
```

### State Synchronization

The `TriPaneSyncState` object maintains synchronized state:

```typescript
interface TriPaneSyncState {
  graph: {
    selectedEntityId?: string
    focusedEntityIds?: string[]
    layout: GraphLayout
  }
  timeline: {
    selectedEventId?: string
    timeWindow?: TimeWindow
  }
  map: {
    selectedLocationId?: string
    center?: [number, number]
    zoom?: number
  }
  globalTimeWindow?: TimeWindow
}
```

## Integration Guide for Teams

### Using Your Own Data

Replace the mock data provider with your own data source:

```typescript
import { TriPaneShell } from '@/features/triPane'
import type { TriPaneDataProvider } from '@/features/triPane'

// Implement the data provider interface
class MyDataProvider implements TriPaneDataProvider {
  async fetchEntities(filters?: any) {
    const response = await fetch('/api/entities', {
      method: 'POST',
      body: JSON.stringify(filters)
    })
    return response.json()
  }

  async fetchRelationships(filters?: any) {
    // Your implementation
  }

  async fetchTimelineEvents(filters?: any) {
    // Your implementation
  }

  async fetchGeospatialEvents(filters?: any) {
    // Your implementation
  }
}

// Use in your component
function MyPage() {
  const [data, setData] = useState(null)
  const provider = new MyDataProvider()

  useEffect(() => {
    async function loadData() {
      const entities = await provider.fetchEntities()
      const relationships = await provider.fetchRelationships()
      // ... load other data
      setData({ entities, relationships, ... })
    }
    loadData()
  }, [])

  return <TriPaneShell {...data} />
}
```

### Customizing Pane Behavior

Each pane accepts props that control its behavior:

```typescript
<TriPaneShell
  // ... data props
  initialSyncState={{
    graph: {
      layout: { type: 'radial', settings: {} }
    },
    timeline: {
      autoScroll: true
    },
    map: {
      center: [-74.006, 40.7128], // NYC coordinates
      zoom: 10
    }
  }}
  showProvenanceOverlay={true}
  onTimeWindowChange={(window) => {
    // Handle filter changes, e.g., fetch new data
    console.log('Filter range:', window.start, window.end)
  }}
/>
```

### Adding Real-Time Updates

Integrate WebSocket or polling for live updates:

```typescript
import { MockTriPaneDataProvider } from '@/features/triPane'

const provider = new MockTriPaneDataProvider()

// Subscribe to updates
const unsubscribe = provider.subscribeToUpdates((update) => {
  console.log('New data:', update)
  // Update your component state
})

// Clean up on unmount
useEffect(() => {
  return () => unsubscribe()
}, [])
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Focus graph pane |
| `T` | Focus timeline pane |
| `M` | Focus map pane |
| `R` | Reset all filters |
| `E` | Export data |
| `P` | Toggle provenance overlay |

## Accessibility

The tri-pane shell follows WCAG AAA standards:

- ✅ **Semantic HTML**: Proper use of ARIA roles and landmarks
- ✅ **Keyboard Navigation**: All features accessible via keyboard
- ✅ **Screen Reader Support**: ARIA labels and live regions for status updates
- ✅ **Focus Management**: Clear focus indicators and logical tab order
- ✅ **Color Contrast**: Meets AAA contrast ratios
- ✅ **Alternative Text**: Descriptive labels for all interactive elements

### Screen Reader Experience

```html
<!-- Example ARIA structure -->
<main aria-label="Tri-pane analysis shell">
  <div role="status" aria-live="polite">
    25 entities, 40 events, 30 locations
  </div>

  <div role="complementary" aria-label="Keyboard shortcuts">
    <!-- Hidden shortcut help -->
  </div>
</main>
```

## Testing

### Running Tests

```bash
# Run all tri-pane tests
npm test -- triPane

# Run with coverage
npm test -- --coverage triPane

# Run in watch mode
npm test -- --watch triPane
```

### Test Coverage

- ✅ Layout rendering
- ✅ Synchronized brushing
- ✅ User interactions
- ✅ Keyboard navigation
- ✅ Accessibility features
- ✅ Empty states
- ✅ Filter indicators

## Storybook

View component variations and interact with the shell:

```bash
npm run storybook
```

Navigate to **Features → TriPaneShell** to see:
- Default configuration
- With provenance overlay
- With time filters
- Different graph layouts
- Empty states
- Performance testing with various dataset sizes

## API Reference

### TriPaneShell Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entities` | `Entity[]` | Yes | Array of entities to display |
| `relationships` | `Relationship[]` | Yes | Relationships between entities |
| `timelineEvents` | `TimelineEvent[]` | Yes | Timeline events |
| `geospatialEvents` | `GeospatialEvent[]` | Yes | Geographic events |
| `initialSyncState` | `Partial<TriPaneSyncState>` | No | Initial pane state |
| `onEntitySelect` | `(entity: Entity) => void` | No | Entity selection callback |
| `onEventSelect` | `(event: TimelineEvent) => void` | No | Event selection callback |
| `onLocationSelect` | `(id: string) => void` | No | Location selection callback |
| `onTimeWindowChange` | `(window: TimeWindow) => void` | No | Time filter callback |
| `onSyncStateChange` | `(state: TriPaneSyncState) => void` | No | State change callback |
| `showProvenanceOverlay` | `boolean` | No | Show data lineage |
| `onExport` | `() => void` | No | Export button callback |
| `className` | `string` | No | Additional CSS classes |

### Type Exports

All TypeScript types are exported from the main module:

```typescript
import type {
  TriPaneShellProps,
  TriPaneSyncState,
  TimeWindow,
  TriPaneDataProvider,
  // ... and more
} from '@/features/triPane'
```

## Performance Considerations

### Large Datasets

The shell is optimized for datasets up to:
- 100 entities
- 200 relationships
- 500 timeline events
- 100 geographic events

For larger datasets, consider:
1. Server-side filtering
2. Pagination
3. Virtual scrolling for timeline
4. Graph clustering

### Debouncing

State updates are debounced (120ms) to prevent performance issues during rapid interactions.

## Future Enhancements

Planned features for future iterations:

- [ ] Real map integration (Mapbox/Leaflet)
- [ ] Advanced graph layouts (DAG, tree)
- [ ] Timeline zoom/pan controls
- [ ] Entity comparison mode
- [ ] Saved views and bookmarks
- [ ] Collaborative annotations
- [ ] Export to multiple formats (CSV, PDF)
- [ ] Advanced filtering UI
- [ ] Performance optimizations for large datasets

## Support

For questions or issues with the tri-pane shell:

1. Check this documentation
2. Review the Storybook examples
3. Examine the test files for usage patterns
4. Consult the TypeScript interfaces in `types.ts`

## License

This component is part of the IntelGraph web application.
