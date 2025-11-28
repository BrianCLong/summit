// @ts-nocheck
import * as graphSliceModule from './slices/graphSlice';
const graphSlice = graphSliceModule.default || graphSliceModule;
export default graphSlice.reducer;
export const {
  setGraphData,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  setSelectedNode,
  setSelectedEdge,
  setLayout,
  toggleFeature,
  undo,
  redo,
  addCluster,
  removeCluster,
  toggleClusterExpansion,
  setSearchTerm,
  setNodeTypeColor,
  deleteNode,
  deleteEdge,
  setSelectedNodes,
  setSelectedEdges,
  setPathSourceNode,
  setPathTargetNode,
  setFoundPath,
  setLoading,
  setErrorMessage,
  setNodeTypeFilter,
  setMinConfidenceFilter,
  fetchGraphData
} = graphSlice.actions;

export { fetchGraphData as fetchGraphDataThunk } from './slices/graphSlice';
