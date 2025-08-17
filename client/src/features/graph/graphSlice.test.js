
import graphReducer, { setGraphData, setSelectedNode, setSelectedEdge, setLayout, toggleFeature } from './graphSlice';

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
    },
  };

  it('should return the initial state', () => {
    expect(graphReducer(undefined, {})).toEqual(initialState);
  });

  it('should handle setGraphData', () => {
    const newGraphData = {
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    };
    expect(graphReducer(initialState, setGraphData(newGraphData))).toEqual({
      ...initialState,
      nodes: newGraphData.nodes,
      edges: newGraphData.edges,
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

  it('should handle toggleFeature', () => {
    expect(graphReducer(initialState, toggleFeature({ featureName: 'nodeClustering', enabled: true }))).toEqual({
      ...initialState,
      featureToggles: {
        ...initialState.featureToggles,
        nodeClustering: true,
      },
    });
  });

  it('should not toggle an unknown feature', () => {
    expect(graphReducer(initialState, toggleFeature({ featureName: 'unknownFeature', enabled: true }))).toEqual(initialState);
  });
});
