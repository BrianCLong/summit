import { useMemo, useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SearchIcon from '@mui/icons-material/Search';
import { Provider } from 'react-redux';
import { store } from './store';
import { CommandPalette } from './components/CommandPalette';
import { SelectionSummary } from './components/SelectionSummary';

const GraphPane = lazy(() =>
  import('./panes/GraphPane').then((module) => ({ default: module.GraphPane })),
);
const TimelinePane = lazy(() =>
  import('./panes/TimelinePane').then((module) => ({
    default: module.TimelinePane,
  })),
);
const MapPane = lazy(() =>
  import('./panes/MapPane').then((module) => ({ default: module.MapPane })),
);

export function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [openCmd, setOpenCmd] = useState(false);
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenCmd((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <CommandPalette open={openCmd} onClose={() => setOpenCmd(false)} />
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={1}
          >
            <SelectionSummary />
            <Box>
              <Tooltip title="Command Palette (Ctrl+K)">
                <IconButton
                  onClick={() => setOpenCmd(true)}
                  color="inherit"
                  aria-label="open command palette"
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={toggleMode}
                color="inherit"
                aria-label="toggle theme"
                data-testid="theme-toggle"
              >
                {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Box>
          </Box>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense
                  fallback={
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      height="calc(100vh - 56px)"
                    >
                      <CircularProgress />
                    </Box>
                  }
                >
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
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}
