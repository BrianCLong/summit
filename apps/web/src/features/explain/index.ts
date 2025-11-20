// Explain feature exports
export { ExplainViewSidebar } from './ExplainViewSidebar'
export { default as explainReducer, open, close, setPolicy, selectExplain } from './explainSlice'

// Re-export types
export type { ExplainState, PolicyItem } from './explainSlice'
