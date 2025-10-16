import React, { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
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
} from '@mui/material';
import { getIntelGraphTheme } from './theme/intelgraphTheme';
import { store } from './store';
import { useSelector } from 'react-redux';

// Simple Dashboard with MUI components
function Dashboard() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                ✅ React + Material-UI + Redux working successfully!
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
                <li>⏳ Apollo GraphQL (next step)</li>
                <li>⏳ React Router (next step)</li>
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
              <Box
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
              >
                <div>• Graph Analytics</div>
                <div>• AI Copilot</div>
                <div>• Collaboration</div>
                <div>• Visualization</div>
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
                <Button variant="contained" color="primary">
                  Dashboard
                </Button>
                <Button variant="outlined" color="secondary">
                  Investigations
                </Button>
                <Button variant="outlined" color="info">
                  Graph Explorer
                </Button>
                <Button variant="outlined" color="success">
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
                Build: Progressive v1.0
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
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {children}
      </Box>
    </ThemeProvider>
  );
}

function App() {
  useEffect(() => {
    console.log('🚀 Progressive IntelGraph App mounting...');
    console.log('✅ Redux store connected');
    console.log('✅ Material-UI theme loaded');
  }, []);

  return (
    <Provider store={store}>
      <ThemedAppShell>
        <Dashboard />
      </ThemedAppShell>
    </Provider>
  );
}

export default App;
