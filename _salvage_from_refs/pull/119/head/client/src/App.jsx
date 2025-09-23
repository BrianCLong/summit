import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Store and Apollo setup
import { store } from './store';
import { apolloClient } from './services/apollo';
import { useSelector } from 'react-redux';

// Components
import Layout from './components/common/Layout';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import InvestigationPage from './components/investigation/InvestigationPage';
import EnhancedGraphExplorer from './components/graph/EnhancedGraphExplorer';
import NotFound from './components/common/NotFound';
import GraphVersionHistory from './components/versioning/GraphVersionHistory';

function ThemedAppShell({ children }) {
  const mode = useSelector((state) => state.ui.theme || 'light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function App() {
  useEffect(() => {
    console.log('🚀 IntelGraph Platform Starting...');
  }, []);

  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <ThemedAppShell>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="investigations" element={<InvestigationPage />} />
                <Route path="graph" element={<EnhancedGraphExplorer />} />
                <Route path="graph/:id" element={<EnhancedGraphExplorer />} />
                <Route path="versions" element={<GraphVersionHistory />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </ThemedAppShell>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
