import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  useMediaQuery,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { getIntelGraphTheme } from './intelgraphTheme';
import { PreferencesAPI } from '../services/api';

const THEME_STORAGE_KEY = 'summit.theme';

const defaultTheme = getIntelGraphTheme('light');

const ThemeContext = createContext({
  mode: 'light',
  isDark: false,
  loading: true,
  ready: false,
  toggleTheme: () => {},
  setTheme: () => {},
  muiTheme: defaultTheme,
  prefersDarkMode: false,
  prefersHighContrast: false,
  prefersReducedMotion: false,
});

export const useThemeContext = () => useContext(ThemeContext);
export const useTheme = useThemeContext;

export function ThemeProvider({ children }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: more)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [mode, setMode] = useState('light');
  const [explicitPreference, setExplicitPreference] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const persistRef = useRef(false);
  const fetchedRef = useRef(false);

  const updateMode = useCallback((nextMode, options = {}) => {
    setMode(nextMode === 'dark' ? 'dark' : 'light');
    if (typeof options.explicit === 'boolean') {
      setExplicitPreference(options.explicit);
    }
    persistRef.current = options.persist ?? false;
  }, []);

  // Establish initial mode based on stored preference or system setting
  useEffect(() => {
    if (!fetchedRef.current) {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
      if (stored === 'dark' || stored === 'light') {
        updateMode(stored, { explicit: true, persist: false });
      } else {
        updateMode(prefersDarkMode ? 'dark' : 'light', { explicit: false, persist: false });
      }
      return;
    }

    if (!explicitPreference) {
      updateMode(prefersDarkMode ? 'dark' : 'light', { explicit: false, persist: false });
    }
  }, [prefersDarkMode, explicitPreference, updateMode]);

  // Fetch persisted preference from the backend when available
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let active = true;

    const run = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        if (active) {
          setLoading(false);
          setReady(true);
        }
        return;
      }

      try {
        const response = await PreferencesAPI.getTheme();
        const remoteTheme =
          typeof response === 'string'
            ? response
            : response?.theme || response?.preference?.theme;

        if (
          active &&
          typeof remoteTheme === 'string' &&
          (remoteTheme === 'light' || remoteTheme === 'dark')
        ) {
          updateMode(remoteTheme, { explicit: true, persist: false });
        }
      } catch (error) {
        if (active) {
          console.warn('Failed to load saved theme preference', error);
        }
      } finally {
        if (active) {
          setLoading(false);
          setReady(true);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [updateMode]);

  // Apply the theme class to the DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.setProperty('color-scheme', mode);
  }, [mode]);

  // Persist preference locally and remotely when ready
  useEffect(() => {
    if (!ready) return;

    if (explicitPreference) {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }

    if (persistRef.current && explicitPreference) {
      const token = localStorage.getItem('token');
      if (token) {
        PreferencesAPI.setTheme(mode).catch((error) => {
          console.warn('Failed to persist theme preference', error);
        });
      }
      persistRef.current = false;
    } else {
      persistRef.current = false;
    }
  }, [mode, ready, explicitPreference]);

  const muiTheme = useMemo(() => {
    const baseTheme = getIntelGraphTheme(mode);

    if (prefersHighContrast) {
      baseTheme.palette.text.primary = mode === 'dark' ? '#FFFFFF' : '#000000';
      baseTheme.palette.text.secondary = mode === 'dark' ? '#E2E8F0' : '#334155';
      baseTheme.palette.divider =
        mode === 'dark' ? 'rgba(148, 163, 184, 0.4)' : 'rgba(15, 23, 42, 0.12)';
    }

    if (prefersReducedMotion) {
      baseTheme.transitions = {
        ...baseTheme.transitions,
        create: () => 'none',
        duration: {
          ...baseTheme.transitions?.duration,
          shortest: 0,
          shorter: 0,
          short: 0,
          standard: 0,
          complex: 0,
          enteringScreen: 0,
          leavingScreen: 0,
        },
      };
    }

    baseTheme.components = {
      ...baseTheme.components,
      MuiPaper: {
        ...baseTheme.components?.MuiPaper,
        styleOverrides: {
          ...baseTheme.components?.MuiPaper?.styleOverrides,
          root: {
            ...baseTheme.components?.MuiPaper?.styleOverrides?.root,
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        ...baseTheme.components?.MuiCard,
        styleOverrides: {
          ...baseTheme.components?.MuiCard?.styleOverrides,
          root: {
            ...baseTheme.components?.MuiCard?.styleOverrides?.root,
            backgroundImage: 'none',
            borderRadius: 16,
          },
        },
      },
    };

    return baseTheme;
  }, [mode, prefersHighContrast, prefersReducedMotion]);

  const toggleTheme = useCallback(() => {
    updateMode(mode === 'dark' ? 'light' : 'dark', { explicit: true, persist: true });
  }, [mode, updateMode]);

  const setTheme = useCallback(
    (nextMode) => {
      updateMode(nextMode, { explicit: true, persist: true });
    },
    [updateMode],
  );

  const contextValue = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      loading,
      ready,
      toggleTheme,
      setTheme,
      muiTheme,
      prefersDarkMode,
      prefersHighContrast,
      prefersReducedMotion,
    }),
    [
      mode,
      loading,
      ready,
      toggleTheme,
      setTheme,
      muiTheme,
      prefersDarkMode,
      prefersHighContrast,
      prefersReducedMotion,
    ],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

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
  const { prefersHighContrast, prefersReducedMotion } = useThemeContext();
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
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
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
