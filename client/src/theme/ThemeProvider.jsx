import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
  useMediaQuery,
  CssBaseline,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useMutation, useQuery } from '@apollo/client';
import { GET_TENANT_THEME, UPSERT_TENANT_THEME } from '../graphql/theme.gql.js';

const ThemeContext = createContext(null);

const DEFAULT_LIGHT = {
  primary: '#1459FF',
  primaryContrast: '#FFFFFF',
  secondary: '#6366F1',
  accent: '#C026D3',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#E2E8F0',
  border: '#CBD5F5',
  text: '#0F172A',
  textMuted: '#475569',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  focus: '#2563EB',
  fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontHeading: "'Work Sans', 'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
  shadowSm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  shadowMd: '0 6px 18px rgba(15, 23, 42, 0.12)',
  shadowLg: '0 18px 48px rgba(15, 23, 42, 0.16)',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  radiusPill: '999px',
};

const DEFAULT_DARK = {
  primary: '#7C9DFF',
  primaryContrast: '#0B1220',
  secondary: '#A5B4FC',
  accent: '#F472B6',
  background: '#0B1220',
  surface: '#111827',
  surfaceMuted: '#1F2937',
  border: '#27324A',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  focus: '#60A5FA',
  fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontHeading: "'Work Sans', 'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
  shadowSm: '0 1px 2px rgba(8, 47, 73, 0.6)',
  shadowMd: '0 6px 18px rgba(8, 47, 73, 0.55)',
  shadowLg: '0 18px 48px rgba(8, 47, 73, 0.5)',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  radiusPill: '999px',
};

const CSS_VARIABLE_MAP = {
  '--color-primary': 'primary',
  '--color-primary-contrast': 'primaryContrast',
  '--color-secondary': 'secondary',
  '--color-accent': 'accent',
  '--color-background': 'background',
  '--color-surface': 'surface',
  '--color-surface-muted': 'surfaceMuted',
  '--color-border': 'border',
  '--color-text': 'text',
  '--color-text-muted': 'textMuted',
  '--color-success': 'success',
  '--color-warning': 'warning',
  '--color-danger': 'danger',
  '--color-focus': 'focus',
  '--font-body': 'fontBody',
  '--font-heading': 'fontHeading',
  '--font-mono': 'fontMono',
  '--shadow-sm': 'shadowSm',
  '--shadow-md': 'shadowMd',
  '--shadow-lg': 'shadowLg',
  '--radius-sm': 'radiusSm',
  '--radius-md': 'radiusMd',
  '--radius-lg': 'radiusLg',
  '--radius-pill': 'radiusPill',
};

const ensureTokens = (theme) => {
  if (!theme) {
    return {
      tenantId: 'default',
      name: 'Summit Default',
      light: { ...DEFAULT_LIGHT },
      dark: { ...DEFAULT_DARK },
    };
  }

  return {
    tenantId: theme.tenantId ?? 'default',
    name: theme.name ?? 'Summit Default',
    light: { ...DEFAULT_LIGHT, ...(theme.light || {}) },
    dark: { ...DEFAULT_DARK, ...(theme.dark || {}) },
  };
};

const applyCssVariables = (mode, tokens, { highContrast, reducedMotion, tenantId }) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme-mode', mode);
  root.setAttribute('data-tenant', tenantId);
  Object.entries(CSS_VARIABLE_MAP).forEach(([cssVar, tokenKey]) => {
    root.style.setProperty(cssVar, tokens[tokenKey]);
  });
  root.style.setProperty('--motion-reduced', reducedMotion ? '1' : '0');
  root.style.setProperty('--contrast-high', highContrast ? '1' : '0');
};

const createMuiThemeFromTokens = (mode, tokens, { highContrast, reducedMotion }) => {
  const numericRadius = Number.parseInt(tokens.radiusMd, 10) || 10;

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: tokens.primary, contrastText: tokens.primaryContrast },
      secondary: { main: tokens.secondary },
      background: { default: tokens.background, paper: tokens.surface },
      text: { primary: tokens.text, secondary: tokens.textMuted },
      success: { main: tokens.success },
      warning: { main: tokens.warning },
      error: { main: tokens.danger },
    },
    typography: {
      fontFamily: tokens.fontBody,
      h1: { fontFamily: tokens.fontHeading, fontWeight: 600 },
      h2: { fontFamily: tokens.fontHeading, fontWeight: 600 },
      h3: { fontFamily: tokens.fontHeading, fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      caption: { letterSpacing: '0.08em' },
    },
    shape: { borderRadius: numericRadius },
    shadows: [
      'none',
      tokens.shadowSm,
      tokens.shadowMd,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
      tokens.shadowLg,
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          body: {
            backgroundColor: tokens.background,
            color: tokens.text,
            fontFamily: tokens.fontBody,
            transition: 'background-color 120ms ease, color 120ms ease',
          },
          a: {
            color: tokens.primary,
          },
          ':focus-visible': {
            outline: `2px solid ${tokens.focus}`,
            outlineOffset: '2px',
          },
        },
      },
    },
  });

  if (highContrast) {
    theme.palette.text.primary = mode === 'dark' ? '#FFFFFF' : '#000000';
    theme.palette.text.secondary = mode === 'dark' ? '#F8FAFC' : '#1F2937';
  }

  if (reducedMotion) {
    theme.transitions = {
      ...theme.transitions,
      create: () => 'none',
    };
  }

  return theme;
};

export const useTenantTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useTheme = useTenantTheme;

export function ThemeProvider({
  children,
  tenantId,
  initialTheme,
  disableRemote = false,
}) {
  const resolvedTenantId = tenantId || initialTheme?.tenantId || 'default';
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: more), (prefers-contrast: high)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const baseTokens = ensureTokens({ tenantId: resolvedTenantId, ...initialTheme });
  const [themeState, setThemeState] = useState(baseTokens);
  const [userMode, setUserMode] = useState(null);
  const [mode, setMode] = useState(userMode ?? (prefersDark ? 'dark' : 'light'));

  useEffect(() => {
    if (userMode === null) {
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, [prefersDark, userMode]);

  const { data, loading, error, refetch } = useQuery(GET_TENANT_THEME, {
    variables: { tenantId: resolvedTenantId },
    skip: disableRemote,
    fetchPolicy: 'cache-first',
  });

  const [upsertThemeMutation, { loading: saving }] = useMutation(UPSERT_TENANT_THEME, {
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    if (data?.tenantTheme) {
      setThemeState(ensureTokens(data.tenantTheme));
    }
  }, [data]);

  useEffect(() => {
    const variant = mode === 'dark' ? themeState.dark : themeState.light;
    applyCssVariables(mode, variant, {
      highContrast: prefersHighContrast,
      reducedMotion: prefersReducedMotion,
      tenantId: themeState.tenantId,
    });
  }, [mode, themeState, prefersHighContrast, prefersReducedMotion]);

  const muiTheme = useMemo(
    () =>
      createMuiThemeFromTokens(mode, mode === 'dark' ? themeState.dark : themeState.light, {
        highContrast: prefersHighContrast,
        reducedMotion: prefersReducedMotion,
      }),
    [mode, themeState, prefersHighContrast, prefersReducedMotion],
  );

  const setColorMode = (nextMode) => {
    if (nextMode === 'system') {
      setUserMode(null);
      setMode(prefersDark ? 'dark' : 'light');
      return;
    }

    setUserMode(nextMode);
    setMode(nextMode);
  };

  const saveTheme = async (nextTheme) => {
    const prepared = ensureTokens({
      ...nextTheme,
      tenantId: nextTheme?.tenantId || themeState.tenantId,
      name: nextTheme?.name || themeState.name,
    });

    setThemeState(prepared);

    if (disableRemote) {
      return prepared;
    }

    const { data: mutationData } = await upsertThemeMutation({
      variables: {
        input: {
          tenantId: prepared.tenantId,
          name: prepared.name,
          light: prepared.light,
          dark: prepared.dark,
        },
      },
    });

    if (mutationData?.upsertTenantTheme) {
      const ensured = ensureTokens(mutationData.upsertTenantTheme);
      setThemeState(ensured);
      return ensured;
    }

    return prepared;
  };

  const contextValue = {
    tenantId: themeState.tenantId,
    name: themeState.name,
    mode,
    setMode: setColorMode,
    theme: themeState,
    loading,
    saving,
    error,
    prefersDarkMode: prefersDark,
    prefersHighContrast,
    prefersReducedMotion,
    refresh: () => refetch?.({ tenantId: resolvedTenantId }),
    saveTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const TenantThemeProvider = ThemeProvider;

export const useResponsive = () => {
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isWide = useMediaQuery(theme.breakpoints.up('lg'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    breakpoints: theme.breakpoints,
  };
};

export const useAccessibility = () => {
  const { prefersHighContrast, prefersReducedMotion } = useTenantTheme();
  const [announcements, setAnnouncements] = useState([]);

  const announce = (message, priority = 'polite') => {
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date(),
    };

    setAnnouncements((prev) => [...prev, announcement]);

    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((item) => item.id !== announcement.id));
    }, 1000);
  };

  return {
    prefersHighContrast,
    prefersReducedMotion,
    announce,
    announcements,
  };
};

export default ThemeProvider;
