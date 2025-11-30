/**
 * Analyst Console - Feature Module
 *
 * Tri-pane analyst console with Graph, Timeline, Map, and "Explain This View" panel.
 * All panes share synchronized global view state for cross-highlighting, filtering,
 * and selection.
 *
 * @example
 * ```tsx
 * import { AnalystConsole, generateMockDataset } from '@/features/analyst-console'
 *
 * const data = generateMockDataset()
 *
 * <AnalystConsole
 *   entities={data.entities}
 *   links={data.links}
 *   events={data.events}
 *   locations={data.locations}
 *   onExport={() => console.log('Export clicked')}
 * />
 * ```
 */

// Main component
export { AnalystConsole } from './AnalystConsole'

// Context and hooks
export {
  AnalystViewProvider,
  useAnalystView,
  useGlobalTimeBrush,
  useSelection,
  useViewFilters,
  useViewState,
  createDefaultViewState,
} from './AnalystViewContext'

// Individual pane components
export { GraphPane } from './GraphPane'
export { TimelinePane } from './TimelinePane'
export { AnalystMapPane } from './AnalystMapPane'
export { ExplainThisViewPanel } from './ExplainThisViewPanel'

// Mock data utilities
export {
  generateMockDataset,
  generateMockEntities,
  generateMockLinks,
  generateMockEvents,
  generateMockLocations,
  mockEntities,
  mockLinks,
  mockEvents,
  mockLocations,
} from './mockData'

// Types
export type {
  // Entity and Link types
  AnalystEntity,
  AnalystLink,
  // Event types
  AnalystEvent,
  // Location types
  AnalystLocation,
  // View state types
  TimeWindow,
  AnalystViewFilters,
  AnalystSelectionState,
  AnalystViewState,
  // Pane props
  GraphPaneProps,
  TimelinePaneProps,
  MapPaneProps,
  ExplainThisViewPanelProps,
  AnalystConsoleProps,
  // Explanation types
  ViewExplanationMetrics,
  ViewExplanation,
} from './types'
