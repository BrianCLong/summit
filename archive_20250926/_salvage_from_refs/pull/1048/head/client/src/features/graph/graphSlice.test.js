
import graphReducer, { setGraphData, setSelectedNode, setSelectedEdge, setLayout, toggleFeature, addCluster, removeCluster, toggleClusterExpansion } from './graphSlice';

describe('graphSlice', () => {
  const initialState = {
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    layout: 'cose',
    layoutOptions: {},
    featureToggles: {
      smoothTransitions: true,
      edgeHighlighting: true,
      nodeClustering: false,
      incrementalLayout: false,
    },
    clusters: [],
  };

  it('should return the initial state', () => {
    expect(graphReducer(undefined, {})).toEqual(initialState);
  });

  it('should handle setGraphData', () => {
    const newGraphData = {
      nodes: [{ data: { id: 'a', type: 'person' } }, { data: { id: 'b', type: 'organization' } }],
      edges: [{ data: { id: 'ab', source: 'a', target: 'b' } }],
    };
    const stateWithClusteringEnabled = {
      ...initialState,
      featureToggles: { ...initialState.featureToggles, nodeClustering: true },
    };
    const expectedStateWithClustering = {
      ...stateWithClusteringEnabled,
      nodes: newGraphData.nodes,
      edges: newGraphData.edges,
      clusters: [
        { id: 'cluster_person', type: 'person', nodes: ['a'], isExpanded: true },
        { id: 'cluster_organization', type: 'organization', nodes: ['b'], isExpanded: true },
      ],
    };
    expect(graphReducer(stateWithClusteringEnabled, setGraphData(newGraphData))).toEqual(expectedStateWithClustering);

    // Test without clustering enabled
    expect(graphReducer(initialState, setGraphData(newGraphData))).toEqual({
      ...initialState,
      nodes: newGraphData.nodes,
      edges: newGraphData.edges,
      clusters: [],
    });
  });

  it('should handle setSelectedNode', () => {
    expect(graphReducer(initialState, setSelectedNode('node1'))).toEqual({
      ...initialState,
      selectedNode: 'node1',
      selectedEdge: null,
    });
  });

  it('should handle setSelectedEdge', () => {
    expect(graphReducer(initialState, setSelectedEdge('edge1'))).toEqual({
      ...initialState,
      selectedEdge: 'edge1',
      selectedNode: null,
    });
  });

  it('should handle setLayout', () => {
    const newLayout = { name: 'dagre', options: { rankDir: 'LR' } };
    expect(graphReducer(initialState, setLayout(newLayout))).toEqual({
      ...initialState,
      layout: newLayout.name,
      layoutOptions: newLayout.options,
    });
  });

  it('should handle toggleFeature for nodeClustering', () => {
    expect(graphReducer(initialState, toggleFeature({ featureName: 'nodeClustering', enabled: true }))).toEqual({
      ...initialState,
      featureToggles: {
        ...initialState.featureToggles,
        nodeClustering: true,
      },
    });
  });

  it('should handle toggleFeature for incrementalLayout', () => {
    expect(graphReducer(initialState, toggleFeature({ featureName: 'incrementalLayout', enabled: true }))).toEqual({
      ...initialState,
      featureToggles: {
        ...initialState.featureToggles,
        incrementalLayout: true,
      },
    });
  });

  it('should not toggle an unknown feature', () => {
    expect(graphReducer(initialState, toggleFeature({ featureName: 'unknownFeature', enabled: true }))).toEqual(initialState);
  });

  it('should handle addCluster', () => {
    const newCluster = { id: 'cluster_test', type: 'test', nodes: ['x', 'y'], isExpanded: true };
    expect(graphReducer(initialState, addCluster(newCluster))).toEqual({
      ...initialState,
      clusters: [newCluster],
    });
  });

  it('should handle removeCluster', () => {
    const existingCluster = { id: 'cluster_test', type: 'test', nodes: ['x', 'y'], isExpanded: true };
    const stateWithCluster = { ...initialState, clusters: [existingCluster] };
    expect(graphReducer(stateWithCluster, removeCluster('cluster_test'))).toEqual({
      ...initialState,
      clusters: [],
    });
  });

  it('should handle toggleClusterExpansion', () => {
    const existingCluster = { id: 'cluster_test', type: 'test', nodes: ['x', 'y'], isExpanded: true };
    const stateWithCluster = { ...initialState, clusters: [existingCluster] };
    const expectedState = { ...initialState, clusters: [{ ...existingCluster, isExpanded: false }] };
    expect(graphReducer(stateWithCluster, toggleClusterExpansion('cluster_test'))).toEqual(expectedState);
  });
});
