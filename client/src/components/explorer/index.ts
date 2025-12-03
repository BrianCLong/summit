/**
 * Knowledge Graph Explorer
 *
 * A comprehensive graph exploration component for IntelGraph
 * featuring Cytoscape.js visualization, GraphQL live sync,
 * drag-drop traversals, and RAG previews.
 */

export { KGExplorer } from './KGExplorer';
export type { KGExplorerProps } from './KGExplorer';

export { ExplorerToolbar } from './ExplorerToolbar';
export { EntityPanel } from './EntityPanel';
export { RAGPreviewPanel } from './RAGPreviewPanel';
export { TraversalPanel } from './TraversalPanel';

export {
  useGraphData,
  useEntityDetails,
  useEntitySearch,
  useEnrichment,
  GET_GRAPH_DATA,
  GET_ENTITY_DETAILS,
  SEARCH_ENTITIES,
  GET_ENRICHMENT,
  PREDICT_RELATIONSHIPS,
} from './useGraphData';

export type {
  UseGraphDataOptions,
  UseGraphDataResult,
  UseEntityDetailsResult,
  UseEntitySearchResult,
  UseEnrichmentResult,
} from './useGraphData';

export {
  getCytoscapeStylesheet,
  getDarkModeStylesheet,
} from './cytoscapeStyles';

export type {
  GraphNode,
  GraphEdge,
  CytoscapeNode,
  CytoscapeEdge,
  CytoscapeElement,
  TraversalStep,
  RAGPreview,
  RAGSource,
  LayoutOption,
  ExplorerState,
  ExplorerFilters,
} from './types';

export {
  NODE_TYPE_COLORS,
  LAYOUT_OPTIONS,
  transformToGraphNode,
  transformToGraphEdge,
  toCytoscapeElements,
} from './types';
