# Analyst Navigation Patterns in Summit Web Client

## Overview
This document describes how intelligence analysts currently navigate and interact with investigations in the Summit platform.

## Current Navigation Flow

### 1. Entry Points

#### From Dashboard (HomePage)
- **Route**: `/`
- **Key Actions**:
  - View recent investigations
  - See KPI metrics (entity count, alert count, etc.)
  - Quick action: "Start Investigation" → navigates to `/explore`
  - Click on investigation card → opens investigation details

#### From Navigation Sidebar
- **Intelligence Section**:
  - Explore → `/explore` (main graph interface)
  - Alerts → `/alerts` (threat alerts)
  - Cases → `/cases` (case management)
- **RBAC-Protected**: Menu items shown based on user permissions

### 2. Investigation Exploration (ExplorePage)

#### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Header: Title + Search + User Profile          │
├───────────┬─────────────────────────┬───────────┤
│  Filter   │   Graph Canvas          │ Timeline  │
│  Panel    │   (D3.js visualization) │   Rail    │
│  (Left)   │                         │ (Right)   │
│           │   Force/Radial/         │           │
│  • Entity │   Hierarchical layouts  │ • Events  │
│    Types  │                         │ • Time    │
│  • Tags   │   Interactive zoom/pan  │   Groups  │
│  • Source │                         │ • Auto    │
│  • Time   │   Node selection        │   Scroll  │
│  • Conf.  │                         │           │
└───────────┴─────────────────────────┴───────────┘
         │                                │
         └─────────> Entity Drawer <──────┘
         (Opens on entity selection)
```

#### Current Interaction Patterns

**Graph Interactions**:
1. **View**: Force-directed D3 graph with entity nodes and relationship edges
2. **Select**: Click entity → Opens EntityDrawer with full details
3. **Drag**: Drag nodes to reposition (physics-based)
4. **Zoom**: Mouse wheel zoom and pan
5. **Highlight**: Hover over entity → highlights connected relationships
6. **Layout**: Toggle between force/radial/hierarchical layouts

**Filter Panel Interactions**:
1. **Entity Type Filter**: Checkbox selection (Person, Organization, Location, etc.)
2. **Relationship Filter**: Filter by connection types
3. **Tag Filter**: Filter entities by metadata tags
4. **Source Filter**: Filter by data source
5. **Confidence Slider**: Adjust minimum confidence threshold
6. **Time Range**: Date range picker for temporal filtering
7. **Apply**: Filters update graph in real-time

**Timeline Interactions**:
1. **Scroll**: Chronological event list (auto-scrolls to latest)
2. **Group**: Events grouped by date
3. **Select**: Click event → highlights related entity in graph
4. **Filter**: Filter by event type (entity_created, alert_triggered, etc.)
5. **Time Brush**: Select time range → filters all visualizations

**Entity Drawer**:
1. **Tabs**: Properties | Relationships | Timeline | Provenance
2. **Properties**: View all entity metadata and attributes
3. **Relationships**: Table of connected entities
4. **Timeline**: Events related to this entity
5. **Provenance**: Data lineage and source information
6. **Actions**: Edit, Export, Add to Investigation

### 3. Tri-Pane Analysis View

#### Current Implementation
- **Location**: `/components/tri-pane/TriPaneAnalysisView.tsx`
- **Panes**: Timeline (4 cols) | Graph (5 cols) | Map (3 cols)
- **Synchronization**:
  - Time range selection affects all panes
  - Entity selection propagates across panes
  - Map selection highlights in graph
  - Timeline event selection jumps to entity

#### Viewport Synchronization
```typescript
interface ViewportSync {
  timeline: {
    selectedEventId?: string
    timeRange?: TimeRange
  }
  map: {
    center?: [number, number]
    zoom?: number
    selectedLocationId?: string
  }
  graph: {
    selectedEntityId?: string
    focusedEntityIds?: string[]
  }
}
```

#### Provenance Display
- **Toggle**: Show/Hide provenance overlays
- **Visual**: Confidence-based opacity on nodes
- **Tooltip**: Hover shows:
  - Source name and ID
  - License type
  - Confidence score
  - Last seen timestamp
  - Transform operations applied

### 4. State Management Patterns

#### Redux (Global UI State)
- **Focus Mode**: Spotlight/highlight active pane
  - States: `auto`, `manual`, `off`
  - Regions: `graph`, `map`, `timeline`, `codex`, `none`
- **History**: Undo/redo functionality
  - Stack-based with 200-entry cap
  - Immer patches for efficient state tracking
  - Keyboard: Ctrl+Z (undo), Ctrl+Shift+Z (redo)

#### Apollo Client (Data State)
- **Queries**: `useEntities()`, `useAlerts()`, `useInvestigations()`
- **Subscriptions**: Real-time updates via WebSocket
- **Cache**: Type policies for Investigation and Entity normalization

#### React Context (App State)
- **AuthContext**: User authentication and permissions
- **SocketContext**: WebSocket connection management
- **SearchContext**: Global search state
- **NotificationContext**: Toast notifications
- **TenantContext**: Multi-tenancy support

### 5. Keyboard Shortcuts

#### Current Shortcuts
- **⌘K / Ctrl+K**: Open global search
- **Ctrl+Z**: Undo last action
- **Ctrl+Shift+Z**: Redo action
- **Escape**: Close modals/drawers
- **Tab**: Navigate focus through UI elements

#### Focus Mode Bindings
- **F**: Toggle focus mode
- **1-4**: Jump to specific pane (graph, map, timeline, codex)

### 6. Analyst Workflow Patterns

#### Investigation Workflow
1. **Start**: Click "Start Investigation" from dashboard
2. **Search**: Use global search (⌘K) to find entities
3. **Filter**: Apply filters to narrow scope
4. **Explore**: Navigate graph, drag to reposition
5. **Analyze**: Review timeline, check provenance
6. **Document**: Add notes in entity drawer
7. **Export**: Export findings for reporting

#### Alert Triage Workflow
1. **Entry**: Navigate to `/alerts`
2. **Review**: Sort by priority/severity
3. **Investigate**: Click alert → opens related entities
4. **Assess**: Check confidence scores and provenance
5. **Action**: Escalate, dismiss, or create case

#### Time-Based Analysis
1. **Timeline**: Select time range in timeline pane
2. **Brush**: Use time brush to narrow window
3. **Filter**: All panes update to show only selected period
4. **Compare**: Toggle between time periods
5. **Export**: Snapshot of time-filtered view

### 7. Accessibility Features

#### Current A11y Support
- **Radix UI**: Accessible base components with ARIA attributes
- **Keyboard Navigation**: Full keyboard support for navigation
- **Focus Management**: Focus trap in modals
- **Screen Reader**: Semantic HTML and ARIA labels
- **Color**: Sufficient contrast in light/dark modes
- **Tooltips**: Accessible tooltip positioning

#### Areas for Improvement
- Enhanced keyboard shortcuts for tri-pane navigation
- More comprehensive ARIA live regions for dynamic updates
- Better screen reader announcements for graph interactions
- Keyboard-only graph navigation (currently relies on mouse)

### 8. Theme Support

#### Dark/Light Mode
- **Toggle**: Manual theme switcher in user menu
- **CSS Variables**: HSL-based color system
- **Classes**: `.dark` class on root element
- **Persistence**: Theme preference saved to localStorage

#### Custom Styles
- **intel-gradient**: Brand gradient overlay
- **intel-grid**: Cyber-themed grid background
- **glass-morphism**: Frosted glass effect
- **cyber-glow**: Neon glow effects
- **pulse-ring**: Animated pulse for alerts

### 9. Performance Considerations

#### Current Optimizations
- **Debouncing**: 120ms debounce on viewport sync updates
- **Memoization**: useMemo for filtered data calculations
- **Virtual Scrolling**: Not yet implemented for timeline
- **D3 Optimization**: Efficient force simulation with throttling
- **Code Splitting**: Route-based code splitting with React.lazy

#### Known Bottlenecks
- Large graphs (>500 nodes) can slow rendering
- Timeline auto-scroll can be janky with many events
- Real-time subscriptions can overwhelm UI if unthrottled

### 10. Missing Features (To Be Implemented)

#### Tri-Pane Enhancements
- ✗ Real map component (currently placeholder)
- ✗ "Explain This View" sidebar
- ✗ XAI overlays for model decisions
- ✗ Enhanced time-brushing with histogram
- ✗ Feature flag for gradual rollout

#### Explain This View Sidebar
- ✗ Key filters and assumptions display
- ✗ Top contributing entities/edges
- ✗ Provenance highlights
- ✗ Confidence level breakdown
- ✗ XAI decision explanations

#### Keyboard Navigation
- ✗ Arrow keys for graph node navigation
- ✗ Shortcuts for pane switching (⌘1, ⌘2, ⌘3)
- ✗ Quick filter toggles (⌘F for filters)
- ✗ Timeline scrubbing (←/→ arrows)

#### Testing
- ✗ Playwright E2E tests for tri-pane interactions
- ✗ Accessibility audit (axe-core)
- ✗ Performance benchmarks

## Recommendations

### Short Term
1. Implement "Explain This View" sidebar
2. Add feature flag for enhanced tri-pane
3. Improve keyboard navigation
4. Add Playwright tests

### Medium Term
1. Implement real map component (Leaflet or Mapbox)
2. Add XAI overlays
3. Virtual scrolling for timeline
4. Performance optimization for large graphs

### Long Term
1. AI-powered investigation assistant
2. Collaborative multi-user editing
3. Advanced analytics and pattern detection
4. Export to industry-standard formats (STIX, TAXII)
