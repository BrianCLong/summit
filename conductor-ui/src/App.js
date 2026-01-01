import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import MainLayout from './components/MainLayout';
import ConductorDashboard from './components/ConductorDashboard';

// Create a theme with custom colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f7fa',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<ConductorDashboard />} />
            <Route path="/analysis" element={
              <div style={{ padding: '20px' }}>
                <h2>Analysis Workspace</h2>
                <p>Work in progress - Analysis tools and visualizations coming soon.</p>
              </div>
            } />
            <Route path="/entities" element={
              <div style={{ padding: '20px' }}>
                <h2>Entity Management</h2>
                <p>Work in progress - Entity management tools coming soon.</p>
              </div>
            } />
            <Route path="/charts" element={
              <div style={{ padding: '20px' }}>
                <h2>Data Visualization</h2>
                <p>Work in progress - Advanced visualizations coming soon.</p>
              </div>
            } />
            <Route path="/settings" element={
              <div style={{ padding: '20px' }}>
                <h2>System Settings</h2>
                <p>Work in progress - Configuration options coming soon.</p>
              </div>
            } />
            <Route path="/resources" element={
              <div style={{ padding: '20px' }}>
                <h2>Resources & Links</h2>
                <p>Work in progress - Useful links and resources coming soon.</p>
              </div>
            } />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;