import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline, Container, Box } from '@mui/material';
import { getIntelGraphTheme } from './theme/intelgraphTheme';

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
import AdvancedGraphView from './components/graph/AdvancedGraphView';
import NotFound from './components/common/NotFound';
import AdminTokens from './components/admin/AdminTokens';
import AdminRoles from './components/admin/AdminRoles';
import PolicyPreview from './components/admin/PolicyPreview';
import InstanceConnections from './components/admin/InstanceConnections';
import ActivityLog from './components/activity/ActivityLog';
import GraphVersionHistory from './components/versioning/GraphVersionHistory';
import CopilotGoals from './components/ai/CopilotGoals';
import AISuggestionsPanel from './components/ai/AISuggestionsPanel';
import ReportGenerator from './components/reports/ReportGenerator';
import SimulationPanel from './components/simulation/SimulationPanel';
import SentimentPanel from './components/sentiment/SentimentPanel';
import VisionPanel from './components/vision/VisionPanel';
import GeoMapPage from './components/geoint/GeoMapPage';
import SystemPanel from './components/system/SystemPanel';
import FederatedSearchPanel from './components/federation/FederatedSearchPanel';
import ExternalDataPanel from './components/osint/ExternalDataPanel';
import IntelGraphCanvas from './components/graph/IntelGraphCanvas';

function ThemedAppShell({ children }) {
  const mode = useSelector((state) => state.ui.theme || 'light');
  const rtl = useSelector((state) => state.ui.rtl ? 'rtl' : 'ltr');
  const theme = useMemo(() => getIntelGraphTheme(mode), [mode]);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl;
    }
  }, [rtl]);
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
                <Route path="dashboard" element={<Container maxWidth="lg"><Dashboard /></Container>} />
                <Route path="investigations" element={<Container maxWidth="lg"><InvestigationPage /></Container>} />
                <Route path="graph" element={<Container maxWidth="xl"><EnhancedGraphExplorer /></Container>} />
                <Route path="graph/advanced" element={<Box sx={{height:'calc(100vh - 120px)'}}><AdvancedGraphView /></Box>} />
                <Route path="graph/advanced/:id" element={<Box sx={{height:'calc(100vh - 120px)'}}><AdvancedGraphView /></Box>} />
                <Route path="graph/:id" element={<Container maxWidth="xl"><EnhancedGraphExplorer /></Container>} />
                <Route path="graph/new-canvas" element={<IntelGraphCanvas />} />
                <Route path="versions" element={<Container maxWidth="lg"><GraphVersionHistory /></Container>} />
                <Route path="activity" element={<Container maxWidth="lg"><ActivityLog /></Container>} />
                <Route path="admin/instances" element={<Container maxWidth="lg"><InstanceConnections /></Container>} />
                <Route path="admin/roles" element={<Container maxWidth="lg"><AdminRoles /></Container>} />
                <Route path="admin/policy" element={<Container maxWidth="lg"><PolicyPreview /></Container>} />
                <Route path="copilot" element={<Container maxWidth="lg"><CopilotGoals /></Container>} />
                <Route path="ai/suggestions" element={<Container maxWidth="lg"><AISuggestionsPanel /></Container>} />
                <Route path="reports" element={<Container maxWidth="lg"><ReportGenerator /></Container>} />
                <Route path="vision" element={<Container maxWidth="lg"><VisionPanel /></Container>} />
                <Route path="geoint" element={<Container maxWidth="xl"><GeoMapPage /></Container>} />
                <Route path="system" element={<Container maxWidth="lg"><SystemPanel /></Container>} />
                <Route path="federation" element={<Container maxWidth="lg"><FederatedSearchPanel /></Container>} />
                <Route path="external" element={<Container maxWidth="lg"><ExternalDataPanel /></Container>} />
                <Route path="simulate" element={<Container maxWidth="lg"><SimulationPanel /></Container>} />
                <Route path="sentiment" element={<Container maxWidth="lg"><SentimentPanel /></Container>} />
                <Route path="admin/tokens" element={<Container maxWidth="lg"><AdminTokens /></Container>} />
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
