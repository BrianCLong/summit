# Enhanced Tri-Pane UX & "Explain This View" - Implementation Guide

## Overview

This document describes the implementation of the enhanced tri-pane analyst experience and "Explain This View" feature in the Summit web client.

## Features Implemented

### 1. Enhanced Tri-Pane Layout

**Location**: `/apps/web/src/components/tri-pane/EnhancedTriPaneView.tsx`

The enhanced tri-pane view provides a comprehensive visualization of investigation data across three synchronized panes:

#### Pane Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Stats + Controls + Keyboard Shortcuts              │
├────────────┬─────────────────────────┬────────────┬─────────┤
│  Timeline  │   Entity Graph          │   Map      │ Explain │
│   Pane     │     Pane                │   Pane     │ Sidebar │
│            │                         │            │         │
│  • Events  │  • Force-directed       │  • Markers │ • Filters│
│  • Groups  │  • Interactive          │  • Zoom    │ • Top   │
│  • Brush   │  • XAI overlays         │  • Pan     │   Contr.│
│  • Filter  │  • Provenance           │  • Select  │ • Prov. │
│            │                         │            │ • Conf. │
│  (⌘1)      │  (⌘2)                   │  (⌘3)      │         │
└────────────┴─────────────────────────┴────────────┴─────────┘
```

#### Key Features

1. **Time-Brushing**: Interactive histogram showing event distribution over time
2. **Viewport Synchronization**: Entity selection propagates across all panes
3. **XAI Overlays**: Real-time explanations of why entities are important
4. **Provenance Display**: Visual indicators of data confidence and lineage
5. **Keyboard Navigation**: Full keyboard support for analyst workflows

### 2. "Explain This View" Sidebar

**Location**: `/apps/web/src/features/explain/ExplainViewSidebar.tsx`

A comprehensive explanation panel that surfaces:

#### Sections

1. **Active Filters & Assumptions**
   - Entity types selected
   - Time range applied
   - Confidence threshold
   - Tags and sources
   - Current view statistics

2. **Top Contributors**
   - **Key Entities**: Ranked by centrality and importance
     - Connection count
     - Confidence scores
     - Entity type relevance
   - **Key Relationships**: Ranked by significance
     - Relationship confidence
     - Entity type combinations
     - Network importance

3. **Provenance Highlights**
   - Number of data sources
   - License types
   - Average confidence
   - Audit compliance status

4. **Confidence Distribution**
   - High confidence (≥80%): Visual bar chart
   - Medium confidence (50-80%): Visual bar chart
   - Low confidence (<50%): Visual bar chart
   - Percentage breakdown

5. **Policy Notifications** (if applicable)
   - Security policy warnings
   - Data governance alerts
   - Compliance notifications

### 3. Map Visualization

**Location**: `/apps/web/src/features/geospatial/MapView.tsx`

A geospatial visualization component with:

- **SVG-based Map**: Lightweight, responsive map visualization
- **Interactive Markers**: Clickable location markers with labels
- **Pan & Zoom**: Mouse drag and scroll wheel support
- **Selection Sync**: Selected locations highlight in other panes
- **Controls**: Zoom in/out, reset view, toggle labels

**Future Enhancement**: Can be replaced with Leaflet, Mapbox, or Google Maps for production.

### 4. Backend Integration

**Location**: `/apps/web/src/hooks/useExplainView.ts`

A comprehensive React hook providing:

#### GraphQL Queries

```typescript
// Fetch provenance data from prov-ledger service
GET_PROVENANCE_DATA(entityIds: [ID!]!)

// Get XAI explanations for entities
GET_XAI_EXPLANATION(entityId: ID!, context: ExplainContext!)

// Calculate contribution scores
GET_CONTRIBUTION_SCORES(entityIds: [ID!]!, relationshipIds: [ID!]!)
```

#### GraphQL Mutations

```typescript
// Track user interactions for analytics
RECORD_EXPLAIN_VIEW_INTERACTION(input: ExplainInteractionInput!)
```

#### Hook API

```typescript
const {
  topEntities,           // Top 5 contributing entities
  topRelationships,      // Top 5 contributing relationships
  confidenceStats,       // Confidence distribution
  provenanceSummary,     // Data source summary
  provenanceData,        // Raw provenance data
  isLoading,             // Loading state
  error,                 // Error state
  getEntityExplanation,  // Get XAI for specific entity
  trackInteraction,      // Track user action
  refetchProvenance,     // Refresh data
} = useExplainView({ entities, relationships, activeFilters })
```

### 5. Feature Flags

**Location**: `/apps/web/src/lib/flags.ts`

```typescript
// Enable/disable enhanced tri-pane view
isEnhancedTriPaneEnabled(): boolean

// Enable/disable Explain View sidebar
isExplainViewEnabled(): boolean
```

**Environment Variables**:
```bash
# .env
VITE_ENHANCED_TRI_PANE_ENABLED=true
VITE_EXPLAIN_VIEW_ENABLED=true
```

### 6. Redux State Management

**Location**: `/apps/web/src/store/index.ts`

The explain reducer is now integrated:

```typescript
{
  focus: FocusState,      // Pane focus management
  history: HistoryState,  // Undo/redo
  explain: ExplainState,  // Explain sidebar state
}
```

**Explain State**:
```typescript
interface ExplainState {
  open: boolean              // Sidebar visibility
  policy: PolicyItem[]       // Policy warnings
}
```

## Usage

### Basic Usage

```tsx
import { EnhancedTriPaneView } from '@/components/tri-pane/EnhancedTriPaneView'
import { isEnhancedTriPaneEnabled } from '@/lib/flags'

function InvestigationPage() {
  const entities = useEntities()
  const relationships = useRelationships()
  const timelineEvents = useTimelineEvents()
  const geospatialEvents = useGeospatialEvents()

  if (!isEnhancedTriPaneEnabled()) {
    return <TriPaneAnalysisView {...props} />
  }

  return (
    <EnhancedTriPaneView
      entities={entities}
      relationships={relationships}
      timelineEvents={timelineEvents}
      geospatialEvents={geospatialEvents}
      onEntitySelect={handleEntitySelect}
      onTimeRangeChange={handleTimeRangeChange}
      onExport={handleExport}
    />
  )
}
```

### With API Integration

```tsx
import { useExplainView } from '@/hooks/useExplainView'

function AnalysisView() {
  const {
    topEntities,
    confidenceStats,
    trackInteraction,
  } = useExplainView({
    entities,
    relationships,
    activeFilters,
    enableRealtime: true,
  })

  useEffect(() => {
    trackInteraction('view_loaded', { entityCount: entities.length })
  }, [])

  return (
    <div>
      {topEntities.map(({ entity, score, reasons }) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          score={score}
          reasons={reasons}
        />
      ))}
    </div>
  )
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘1` / `Ctrl+1` | Focus Timeline pane |
| `⌘2` / `Ctrl+2` | Focus Graph pane |
| `⌘3` / `Ctrl+3` | Focus Map pane |
| `P` | Toggle provenance overlay |
| `X` | Toggle XAI overlays |
| `Esc` | Clear pane focus |
| `Tab` | Navigate through interactive elements |
| `Enter` / `Space` | Activate focused element |

## Accessibility Features

### ARIA Support

- **Regions**: All panes have `role="region"` with `aria-labelledby`
- **Live Regions**: Dynamic updates announced via `aria-live="polite"`
- **Labels**: All interactive elements have `aria-label` or `aria-labelledby`
- **States**: Buttons have `aria-pressed` for toggle states
- **Focus Management**: Focus trap in modals, logical tab order

### Keyboard Navigation

- Full keyboard support for all interactions
- Visible focus indicators
- Skip links for screen readers
- Logical reading order

### Screen Reader Support

- Semantic HTML structure
- Descriptive labels for all controls
- Status announcements for dynamic content
- Alternative text for visualizations

### Color Contrast

- WCAG AA compliant color contrast
- Dark/light mode support
- Non-color-dependent indicators

## Theme Support

The tri-pane view fully supports Summit's theming system:

### Light Mode
```css
.bg-background        /* White background */
.text-foreground      /* Dark text */
.border               /* Light gray borders */
```

### Dark Mode
```css
.dark:bg-slate-900    /* Dark background */
.dark:text-gray-100   /* Light text */
.dark:border-gray-700 /* Dark borders */
```

### Theme Toggle

Themes are managed at the root level and automatically applied to all components via Tailwind's `.dark` class.

## Performance Considerations

### Optimizations Implemented

1. **Debouncing**: 120ms debounce on viewport sync updates
2. **Memoization**: `useMemo` for expensive calculations
3. **React.memo**: Memoized sub-components to prevent re-renders
4. **Lazy Loading**: Components loaded on-demand
5. **SVG Optimization**: Simplified map rendering for performance

### Performance Metrics

- **Initial Load**: < 2 seconds
- **Time Filter**: < 500ms
- **Entity Selection**: < 200ms
- **Pan/Zoom**: 60 FPS

### Scalability

- **Tested with**: Up to 500 entities, 1000 relationships
- **Recommended max**: 1000 entities for optimal performance
- **Future**: Virtual scrolling for larger datasets

## Testing

### Unit Tests

Located in component files with `.test.tsx` extension:
```bash
pnpm test EnhancedTriPaneView
pnpm test ExplainViewSidebar
pnpm test MapView
```

### E2E Tests

**Location**: `/apps/web/tests/tri-pane-view.spec.ts`

Run with Playwright:
```bash
pnpm exec playwright test tri-pane-view
```

Test coverage:
- ✅ Basic pane visibility
- ✅ Time filtering
- ✅ Entity selection sync
- ✅ Explain sidebar
- ✅ Keyboard navigation
- ✅ Accessibility
- ✅ Theme support
- ✅ Export functionality

### Accessibility Testing

```bash
# Run axe-core a11y audit
pnpm exec playwright test --grep "Accessibility"

# Manual testing with screen reader
# - macOS: VoiceOver (Cmd+F5)
# - Windows: NVDA or JAWS
# - Linux: Orca
```

## API Integration

### Required Backend Services

1. **Provenance Ledger** (`/api/provenance`)
   - GET `/provenance?entityIds=[]`
   - Returns data lineage and source information

2. **XAI Service** (`/api/xai`)
   - POST `/explain`
   - Returns explanations for entity importance

3. **Contribution Scoring** (`/api/contributions`)
   - POST `/scores`
   - Returns calculated contribution scores

4. **Analytics** (`/api/analytics`)
   - POST `/interaction`
   - Records user interactions for analysis

### GraphQL Schema Extensions

```graphql
type Provenance {
  entityId: ID!
  sourceId: String!
  sourceName: String!
  transforms: [Transform!]!
  license: String!
  lastSeen: DateTime!
  confidence: Float!
}

type Transform {
  id: ID!
  operation: String!
  timestamp: DateTime!
  confidence: Float!
}

type XAIExplanation {
  entityId: ID!
  reasons: [XAIReason!]!
  centrality: CentralityMetrics!
  importance: Float!
}

type XAIReason {
  type: String!
  description: String!
  score: Float!
  evidence: [String!]
}

type ContributionScores {
  entityScores: [EntityScore!]!
  relationshipScores: [RelationshipScore!]!
}
```

## Deployment

### Incremental Rollout

1. **Phase 1**: Deploy with feature flags disabled
2. **Phase 2**: Enable for internal testing (beta users)
3. **Phase 3**: Enable for 10% of users
4. **Phase 4**: Enable for 50% of users
5. **Phase 5**: Enable for 100% of users

### Feature Flag Configuration

```typescript
// config/production.ts
export const features = {
  enhancedTriPane: {
    enabled: true,
    rollout: {
      percentage: 10,  // Start with 10%
      allowList: ['user1@example.com', 'user2@example.com'],
    },
  },
}
```

### Monitoring

Key metrics to track:
- Load time
- Interaction latency
- Error rates
- User engagement (time spent, features used)
- API call success rates

## Troubleshooting

### Common Issues

#### 1. Tri-pane not loading
```bash
# Check feature flag
console.log(isEnhancedTriPaneEnabled())

# Check browser console for errors
# Verify GraphQL endpoint is accessible
```

#### 2. Map not rendering
```bash
# Check geospatial data format
# Ensure latitude/longitude are valid numbers
# Verify SVG rendering in browser DevTools
```

#### 3. Explain sidebar empty
```bash
# Check if data is being fetched
# Verify useExplainView hook is called correctly
# Check network tab for API calls
```

#### 4. Keyboard shortcuts not working
```bash
# Check for event listener conflicts
# Verify focus is on the tri-pane container
# Test in different browsers
```

## Future Enhancements

### Short Term
- [ ] Real map integration (Leaflet/Mapbox)
- [ ] Virtual scrolling for timeline
- [ ] Advanced XAI visualizations
- [ ] Collaborative annotations

### Medium Term
- [ ] AI-powered insights
- [ ] Pattern detection overlays
- [ ] Real-time collaboration
- [ ] Export to STIX/TAXII

### Long Term
- [ ] 3D graph visualization
- [ ] AR/VR investigation mode
- [ ] Voice control
- [ ] Predictive analytics

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [D3.js Documentation](https://d3js.org)
- [Playwright Documentation](https://playwright.dev)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Related Files
- `/apps/web/docs/ANALYST_NAVIGATION_PATTERNS.md` - User navigation patterns
- `/apps/web/src/components/tri-pane/TriPaneAnalysisView.tsx` - Original tri-pane
- `/apps/web/src/features/focusMode/focusSlice.ts` - Focus mode implementation
- `/apps/web/src/features/history/historySlice.ts` - Undo/redo implementation

## Contributing

When extending the tri-pane functionality:

1. Maintain accessibility standards (WCAG AA)
2. Add keyboard shortcuts for new features
3. Update tests for new functionality
4. Document API changes
5. Follow existing patterns for state management
6. Consider performance impact of changes

## Support

For questions or issues:
- File an issue in the Summit repository
- Contact the frontend team
- Check the troubleshooting section above
