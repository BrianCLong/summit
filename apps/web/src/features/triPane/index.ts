/**
 * Tri-Pane Analysis Shell - Public API
 *
 * This barrel export provides a clean interface for other parts of
 * the application to use the tri-pane feature.
 */

// Main components
export { TriPaneShell } from './TriPaneShell'
export { MapPane } from './MapPane'

// Types and interfaces
export type {
  TimeWindow,
  GraphPaneState,
  TimelinePaneState,
  MapPaneState,
  TriPaneSyncState,
  GraphPaneProps,
  TimelinePaneProps,
  MapPaneProps,
  TriPaneShellProps,
  TriPaneDataProvider,
  TriPaneAction,
  TriPaneKeyboardShortcuts,
} from './types'

// Mock data utilities
export {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
  MockTriPaneDataProvider,
  mockDataProvider,
  useMockTriPaneData,
} from './mockData'
