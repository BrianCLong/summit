import React, { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import { getIntelGraphTheme } from './theme/intelgraphTheme';
import { store } from './store';
import { apolloClient } from './services/apollo';
import { useSelector } from 'react-redux';

// Connection Status Component
function ConnectionStatus() {
  const [backendStatus, setBackendStatus] = React.useState('checking');

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '{ __typename }',
          }),
        });

        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (error) {
        setBackendStatus('error');
        console.error('Backend connection failed:', error);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { color: 'info', message: '🔄 Checking backend connection...' },
    connected: { color: 'success', message: '✅ Backend connected successfully!' },
    error: { color: 'error', message: '❌ Backend connection failed. Check if server is running.' },
  };

  const { color, message } = statusConfig[backendStatus];

  return (
    <Alert severity={color} sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}

// Dashboard with Apollo integration
function Dashboard() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <ConnectionStatus />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h3" component="h1" gutterBottom>
                🚀 IntelGraph Platform
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                AI-Augmented Intelligence Analysis Platform
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                ✅ React + Material-UI + Redux + Apollo GraphQL working!
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                ✅ System Status
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>✅ React 18 application</li>
                <li>✅ Material-UI components</li>
                <li>✅ Redux state management</li>
                <li>✅ Custom theming</li>
                <li>✅ Apollo GraphQL client</li>
                <li>⏳ React Router (next step)</li>
                <li>⏳ Dashboard components (next step)</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                🎯 Platform Features
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <div>• Graph Analytics</div>
                <div>• AI Copilot</div>
                <div>• Real-time Collaboration</div>
                <div>• Advanced Visualization</div>
                <div>• Sentiment Analysis</div>
                <div>• GeoInt Mapping</div>
                <div>• Report Generation</div>
                <div>• Data Federation</div>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                🔗 Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => console.log('Dashboard clicked')}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => console.log('Investigations clicked')}
                >
                  Investigations
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => console.log('Graph Explorer clicked')}
                >
                  Graph Explorer
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => console.log('AI Copilot clicked')}
                >
                  AI Copilot
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔧 Debug Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Started: {new Date().toLocaleString()}
                <br />
                URL: {window.location.href}
                <br />
                Apollo Client: {apolloClient ? 'Initialized' : 'Not found'}
                <br />
                Build: Apollo v1.1
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

// Themed App Shell
function ThemedAppShell({ children }) {
  const mode = useSelector((state) => state.ui?.theme || 'light');
  const theme = useMemo(() => getIntelGraphTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>{children}</Box>
    </ThemeProvider>
  );
}

function App() {
  useEffect(() => {
    console.log('🚀 Apollo IntelGraph App mounting...');
    console.log('✅ Redux store connected');
    console.log('✅ Material-UI theme loaded');
    console.log('✅ Apollo GraphQL client initialized');
  }, []);

  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <ThemedAppShell>
          <Dashboard />
        </ThemedAppShell>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
