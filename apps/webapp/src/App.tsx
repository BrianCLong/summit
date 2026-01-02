import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Box,
} from '@mui/material';
import { blue, grey } from '@mui/material/colors';
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
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // light mode high-contrast palette
                text: {
                  primary: grey[900],
                  secondary: grey[800],
                },
                background: {
                  default: grey[50],
                  paper: grey[100],
                },
              }
            : {
                // dark mode high-contrast palette
                text: {
                  primary: grey[50],
                  secondary: grey[100],
                },
                background: {
                  default: grey[900],
                  paper: grey[800],
                },
              }),
        },
        components: {
          MuiButtonBase: {
            defaultProps: {
              disableRipple: true,
            },
            styleOverrides: {
              root: {
                '&:focus-visible': {
                  outline: `3px solid ${blue[500]}`,
                  outlineOffset: '2px',
                },
              },
            },
          },
        },
      }),
    [mode],
  );

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
            component="header"
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
          <main>
            <Box
              component="h1"
              sx={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Summit - Main Dashboard
            </Box>
            <Box sx={{ p: 2 }}>
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
                      component="section"
                      aria-label="Dashboard"
                    >
                      <Box
                        gridArea="graph"
                        borderRight={1}
                        borderColor="divider"
                        data-testid="graph-pane"
                        component="section"
                        aria-label="Graph Pane"
                      >
                        <GraphPane />
                      </Box>
                      <Box
                        gridArea="timeline"
                        borderBottom={1}
                        borderColor="divider"
                        data-testid="timeline-pane"
                        component="section"
                        aria-label="Timeline Pane"
                      >
                        <TimelinePane />
                      </Box>
                      <Box
                        gridArea="map"
                        data-testid="map-pane"
                        component="section"
                        aria-label="Map Pane"
                      >
                        <MapPane />
                      </Box>
                    </Box>
                  }
                />
              </Routes>
            </Box>
          </main>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}
