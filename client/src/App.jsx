import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './store'; // Import the Redux store
import { fetchGraphData } from './store/slices/graphSlice'; // Import fetchGraphData thunk
import GraphVisualization from './features/graph/GraphVisualization'; // Import the GraphVisualization component
import AnalyticsDashboardPanel from './components/AnalyticsDashboardPanel'; // Import the new panel
import IngestWizard from './components/IngestWizard';
import AdminPanel from './components/AdminPanel';
import HealthScore from './components/HealthScore/HealthScore';
import TimelineView from './features/timeline/TimelineView';
import { useFeatureFlag, useFeatureVariant } from './hooks/useFeatureFlag';
import { useGraphPersistence } from './hooks/useGraphPersistence';
import DemoIndicator from './components/common/DemoIndicator';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from '@apollo/client';
import { getGraphqlHttpUrl } from './config/urls';

// Initialize Apollo Client
const httpLink = new HttpLink({
  uri: getGraphqlHttpUrl(),
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

function TestApp() {
  useEffect(() => {
    store.dispatch(fetchGraphData());
  }, []);

  const showInsightsPreview = useFeatureFlag('ui-insights-panel', {
    userId: 'local-demo-user',
  });
  const cacheStrategyVariant = useFeatureVariant('cache-strategy', {
    sessionId: 'local-session',
  });
  const orchestratorV2Enabled = useFeatureFlag('ai-orchestrator-v2', {
    userId: 'local-demo-user',
  });

  // Persist relevant graph state to localStorage
  const graphState = useSelector((state) => state.graph);
  useGraphPersistence(graphState);

  return (
    <ApolloProvider client={client}>
      <Provider store={store}>
        <DemoIndicator />
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
            {showInsightsPreview && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#f0f7ff',
                  border: '1px solid #cfe0ff',
                  borderRadius: 6,
                  marginBottom: 12,
                  color: '#0b3d91',
                  fontSize: 13,
                }}
              >
                Insights v2 preview is enabled for this session.
              </div>
            )}
            {cacheStrategyVariant && cacheStrategyVariant !== 'control' && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#f9f5ff',
                  border: '1px solid #e0d7ff',
                  borderRadius: 6,
                  marginBottom: 12,
                  color: '#5a4fbf',
                  fontSize: 13,
                }}
              >
                Cache strategy: <strong>{cacheStrategyVariant}</strong>
              </div>
            )}
            {orchestratorV2Enabled && (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#fef6e7',
                  border: '1px solid #f5ddab',
                  borderRadius: 6,
                  marginBottom: 12,
                  color: '#8a6200',
                  fontSize: 13,
                }}
              >
                Routing through the v2 orchestration experiment.
              </div>
            )}
            <IngestWizard />
            <div style={{ height: 12 }} />
            <AdminPanel />
            <div style={{ height: 12 }} />
            {import.meta.env.VITE_PERF_MODE ? null : (
              <AnalyticsDashboardPanel />
            )}
            <div style={{ height: 12 }} />
            <HealthScore />
          </div>
        </div>
      </Provider>
    </ApolloProvider>
  );
}

export default TestApp;
