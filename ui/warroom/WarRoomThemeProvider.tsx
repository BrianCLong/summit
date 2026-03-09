/**
 * Summit War Room — Theme Provider
 *
 * Provides Dark Intelligence Mode and Light Analysis Mode themes,
 * optimized for long investigative sessions.
 */

import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, type ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useWarRoomStore } from './store';

/* ------------------------------------------------------------------ */
/*  Dark Intelligence Mode                                             */
/* ------------------------------------------------------------------ */

const darkPalette: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: { main: '#60A5FA', contrastText: '#0B1220' },
    secondary: { main: '#A78BFA', contrastText: '#0B1220' },
    success: { main: '#34D399' },
    warning: { main: '#FBBF24' },
    error: { main: '#F87171' },
    background: { default: '#070D1A', paper: '#0F1729' },
    text: { primary: '#E2E8F0', secondary: '#94A3B8', disabled: '#475569' },
    divider: '#1E293B',
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", "Inter", monospace',
    h1: { fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '18px', fontWeight: 600 },
    h4: { fontSize: '15px', fontWeight: 600 },
    h5: { fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    h6: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' },
    body1: { fontSize: '13px', lineHeight: 1.6 },
    body2: { fontSize: '12px', lineHeight: 1.5 },
    caption: { fontSize: '11px', lineHeight: 1.4 },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #1E293B',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, fontSize: '12px' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '11px', height: 24 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontSize: '12px', minHeight: 36 },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Light Analysis Mode                                                */
/* ------------------------------------------------------------------ */

const lightPalette: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: { main: '#2563EB', contrastText: '#FFFFFF' },
    secondary: { main: '#7C3AED', contrastText: '#FFFFFF' },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569', disabled: '#94A3B8' },
    divider: '#E2E8F0',
  },
  typography: darkPalette.typography,
  shape: { borderRadius: 6 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiButton: darkPalette.components!.MuiButton,
    MuiChip: darkPalette.components!.MuiChip,
    MuiTab: darkPalette.components!.MuiTab,
  },
};

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export const WarRoomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useWarRoomStore((s) => s.themeMode);

  const theme = useMemo(
    () => createTheme(themeMode === 'dark' ? darkPalette : lightPalette),
    [themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
