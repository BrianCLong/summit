import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store'; // Import the Redux store
import { setGraphData } from './store/slices/graphSlice'; // Import setGraphData action
import GraphVisualization from './features/graph/GraphVisualization'; // Import the GraphVisualization component

function TestApp() {
  useEffect(() => {
    // Dispatch some dummy graph data when the component mounts
    const dummyNodes = [
      { data: { id: 'a', label: 'Node A' } },
      { data: { id: 'b', label: 'Node B' } },
      { data: { id: 'c', label: 'Node C' } },
      { data: { id: 'd', label: 'Node D' } },
    ];
    const dummyEdges = [
      { data: { id: 'ab', source: 'a', target: 'b' } },
      { data: { id: 'bc', source: 'b', target: 'c' } },
      { data: { id: 'cd', source: 'c', target: 'd' } },
      { data: { id: 'da', source: 'd', target: 'a' } },
    ];
    store.dispatch(setGraphData({ nodes: dummyNodes, edges: dummyEdges }));
  }, []);

  return (
    <Provider store={store}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <GraphVisualization />
      </div>
    </Provider>
  );
}

export default TestApp;