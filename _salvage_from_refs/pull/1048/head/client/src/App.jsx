import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store'; // Import the Redux store
import { fetchGraphData } from './store/slices/graphSlice'; // Import fetchGraphData thunk
import GraphVisualization from './features/graph/GraphVisualization'; // Import the GraphVisualization component
import AnalyticsDashboardPanel from './components/AnalyticsDashboardPanel'; // Import the new panel
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client';

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

  return (
    <ApolloProvider client={client}>
      <Provider store={store}>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'row' }}> {/* Changed to row for side-by-side */}
          <div style={{ flex: 1 }}>
            <GraphVisualization />
          </div>
          <div style={{ width: '300px', padding: '10px', overflowY: 'auto', borderLeft: '1px solid #eee' }}>
            <AnalyticsDashboardPanel />
          </div>
        </div>
      </Provider>
    </ApolloProvider>
  );
}

export default TestApp;