import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, Container, Box } from '@mui/material';
import { getIntelGraphTheme } from './theme/intelgraphTheme';

// Store setup (no Apollo for now)
import { store } from './store';
import { useSelector } from 'react-redux';

// Simple Dashboard component
function SimpleDashboard() {
  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <h1>IntelGraph Platform</h1>
        <p>🎉 React app is working!</p>
        <div
          style={{
            padding: '20px',
            background: '#e3f2fd',
            borderRadius: '8px',
            margin: '20px 0',
          }}
        >
          <h2>✅ System Status</h2>
          <ul>
            <li>✅ React mounting successfully</li>
            <li>✅ Material-UI theme working</li>
            <li>✅ Redux store connected</li>
            <li>✅ React Router working</li>
            <li>⏳ Apollo Client (disabled for testing)</li>
          </ul>
        </div>

        <div
          style={{
            padding: '20px',
            background: '#f3e5f5',
            borderRadius: '8px',
            margin: '20px 0',
          }}
        >
          <h3>🔗 Quick Links</h3>
          <ul>
            <li>
              <a href="#dashboard">Dashboard</a> (Current page)
            </li>
            <li>
              <a href="#investigations">Investigations</a>
            </li>
            <li>
              <a href="#graph">Graph Explorer</a>
            </li>
          </ul>
        </div>
      </Box>
    </Container>
  );
}

function ThemedAppShell({ children }) {
  const mode = useSelector((state) => state.ui?.theme || 'light');
  const theme = React.useMemo(() => getIntelGraphTheme(mode), [mode]);

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
    console.log('✅ App component mounted successfully');
  }, []);

  return (
    <Provider store={store}>
      <ThemedAppShell>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<SimpleDashboard />} />
            <Route
              path="/investigations"
              element={
                <Container>
                  <h1>Investigations</h1>
                  <p>Investigations page - coming soon!</p>
                </Container>
              }
            />
            <Route
              path="/graph"
              element={
                <Container>
                  <h1>Graph Explorer</h1>
                  <p>Graph explorer - coming soon!</p>
                </Container>
              }
            />
            <Route
              path="*"
              element={
                <Container>
                  <h1>404 - Page Not Found</h1>
                  <p>
                    <a href="/dashboard">Go to Dashboard</a>
                  </p>
                </Container>
              }
            />
          </Routes>
        </Router>
      </ThemedAppShell>
    </Provider>
  );
}

export default App;
