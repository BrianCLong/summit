import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './store'; // Import the Redux store
import { fetchGraphData } from './store/slices/graphSlice'; // Import fetchGraphData thunk
import GraphVisualization from './features/graph/GraphVisualization'; // Import the GraphVisualization component
import AnalyticsDashboardPanel from './components/AnalyticsDashboardPanel'; // Import the new panel
import IngestWizard from './components/IngestWizard';
import AdminPanel from './components/AdminPanel';
import TimelineView from './features/timeline/TimelineView';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from '@apollo/client';

// Initialize Apollo Client
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql', // Assuming your GraphQL server runs on port 4000
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

function TestApp() {
  useEffect(() => {
    store.dispatch(fetchGraphData());
  }, []);

  // Persist relevant graph state to localStorage
  const graphState = useSelector((state) => state.graph);
  useEffect(() => {
    localStorage.setItem('graphLayout', graphState.layout);
    localStorage.setItem(
      'graphLayoutOptions',
      JSON.stringify(graphState.layoutOptions),
    );
    localStorage.setItem(
      'graphFeatureToggles',
      JSON.stringify(graphState.featureToggles),
    );
    localStorage.setItem(
      'graphNodeTypeColors',
      JSON.stringify(graphState.nodeTypeColors),
    );
  }, [
    graphState.layout,
    graphState.layoutOptions,
    graphState.featureToggles,
    graphState.nodeTypeColors,
  ]);

  return (
    <ApolloProvider client={client}>
      <Provider store={store}>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'row' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <GraphVisualization />
            </div>
            <div style={{ height: '200px', borderTop: '1px solid #eee' }}>
              <TimelineView />
            </div>
          </div>
          <div
            style={{
              width: '300px',
              padding: '10px',
              overflowY: 'auto',
              borderLeft: '1px solid #eee',
            }}
          >
            <IngestWizard />
            <div style={{ height: 12 }} />
            <AdminPanel />
            <div style={{ height: 12 }} />
            {import.meta.env.VITE_PERF_MODE ? null : (
              <AnalyticsDashboardPanel />
            )}
          </div>
        </div>
      </Provider>
    </ApolloProvider>
  );
}

export default TestApp;
