import { createTheme } from '@mui/material/styles';

export function createTufteTheme(mode = 'light', direction = 'ltr') {
  const isDark = mode === 'dark';
  const palette = {
    mode,
    background: {
      default: isDark ? '#0f1112' : '#fafbfc',
      paper: isDark ? '#141618' : '#ffffff',
    },
    primary: { main: isDark ? '#89a7ff' : '#1d4ed8' },
    secondary: { main: isDark ? '#a8f0e6' : '#0f766e' },
    text: {
      primary: isDark ? '#e9eef2' : '#0c0d0e',
      secondary: isDark ? '#b5bdc4' : '#5d646b',
    },
    divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(12,13,14,0.08)',
  };

  return createTheme({
    palette,
    direction,
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: `ui-sans-serif, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif`,
      h1: { fontWeight: 600, letterSpacing: 0.2 },
      h2: { fontWeight: 600, letterSpacing: 0.2 },
      h3: { fontWeight: 600, letterSpacing: 0.2 },
      h4: { fontWeight: 600, letterSpacing: 0.15 },
      h5: { fontWeight: 600, letterSpacing: 0.1 },
      h6: { fontWeight: 600, letterSpacing: 0.05 },
      subtitle1: { letterSpacing: 0.3 },
      body2: { letterSpacing: 0.1 },
      overline: { fontWeight: 500, letterSpacing: 1.2 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*, *::before, *::after': { boxSizing: 'border-box' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
            borderBottom: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 6 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6 } },
      },
      MuiDivider: {
        styleOverrides: { root: { opacity: 0.9 } },
      },
      MuiListItemText: {
        styleOverrides: { primary: { fontWeight: 500 } },
      },
    },
  });
}
