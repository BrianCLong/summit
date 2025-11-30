import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Box,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Provider } from 'react-redux';
import { store } from './store';
import { GraphPane } from './panes/GraphPane';
import { TimelinePane } from './panes/TimelinePane';
import { MapPane } from './panes/MapPane';
import { CommandPalette } from './components/CommandPalette';
import { SelectionSummary } from './components/SelectionSummary';

export function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <CommandPalette />
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={1}
          >
            <SelectionSummary />
            <IconButton
              onClick={toggleMode}
              color="inherit"
              aria-label="toggle theme"
              data-testid="theme-toggle"
            >
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Box>
          <Routes>
            <Route
              path="/"
              element={
                <Box
                  display="grid"
                  gridTemplateColumns="2fr 1fr"
                  gridTemplateRows="1fr 1fr"
                  gridTemplateAreas="'graph timeline' 'graph map'"
                  height="calc(100vh - 56px)"
                >
                  <Box
                    gridArea="graph"
                    borderRight={1}
                    borderColor="divider"
                    data-testid="graph-pane"
                  >
                    <GraphPane />
                  </Box>
                  <Box
                    gridArea="timeline"
                    borderBottom={1}
                    borderColor="divider"
                    data-testid="timeline-pane"
                  >
                    <TimelinePane />
                  </Box>
                  <Box gridArea="map" data-testid="map-pane">
                    <MapPane />
                  </Box>
                </Box>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}
