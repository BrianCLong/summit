/**
 * Theme Provider Component
 * Provides dynamic theme switching based on user preferences and role
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  type Theme,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  GET_MY_EFFECTIVE_THEME,
  UPDATE_MY_THEME_PREFERENCE,
  THEME_UPDATED_SUBSCRIPTION,
} from './theme-queries';

interface ThemeContextValue {
  theme: Theme;
  themeSource: 'user_preference' | 'role_based' | 'default';
  themeName?: string;
  darkMode: 'light' | 'dark' | 'system';
  setDarkMode: (mode: 'light' | 'dark' | 'system') => void;
  customizeTheme: (overrides: any) => void;
  resetTheme: () => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<'light' | 'dark' | 'system'>(
    'system'
  );
  const [systemDarkMode, setSystemDarkMode] = useState<boolean>(
    window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
  );

  // Query effective theme
  const { data, loading, refetch } = useQuery(GET_MY_EFFECTIVE_THEME, {
    variables: { systemDarkMode },
  });

  // Subscribe to theme updates
  useSubscription(THEME_UPDATED_SUBSCRIPTION, {
    onData: () => {
      refetch();
    },
  });

  // Mutation for updating preferences
  const [updatePreference] = useMutation(UPDATE_MY_THEME_PREFERENCE);

  // Listen to system dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Refresh theme when system dark mode changes
  useEffect(() => {
    if (darkMode === 'system') {
      refetch({ systemDarkMode });
    }
  }, [systemDarkMode, darkMode, refetch]);

  // Create MUI theme from config
  const theme = useMemo(() => {
    if (!data?.myEffectiveTheme?.theme) {
      return createTheme(); // Default theme
    }

    const themeConfig = data.myEffectiveTheme.theme;

    // Determine actual mode
    let mode: 'light' | 'dark' = 'light';
    if (darkMode === 'system') {
      mode = systemDarkMode ? 'dark' : 'light';
    } else {
      mode = darkMode;
    }

    // Override mode if present in config
    if (themeConfig.palette?.mode) {
      mode = themeConfig.palette.mode;
    }

    return createTheme({
      palette: {
        mode,
        ...themeConfig.palette,
      },
      typography: themeConfig.typography,
      shape: themeConfig.shape,
      spacing: themeConfig.spacing || 8,
    });
  }, [data, darkMode, systemDarkMode]);

  const setDarkMode = (mode: 'light' | 'dark' | 'system') => {
    setDarkModeState(mode);
    updatePreference({
      variables: {
        input: {
          darkModePreference: mode.toUpperCase(),
        },
      },
    });
  };

  const customizeTheme = (overrides: any) => {
    updatePreference({
      variables: {
        input: {
          customOverrides: overrides,
        },
      },
    }).then(() => refetch());
  };

  const resetTheme = () => {
    updatePreference({
      variables: {
        input: {
          customOverrides: null,
          autoSwitchByRole: true,
        },
      },
    }).then(() => refetch());
  };

  const value: ThemeContextValue = {
    theme,
    themeSource: data?.myEffectiveTheme?.source?.toLowerCase() || 'default',
    themeName: data?.myEffectiveTheme?.themeName,
    darkMode,
    setDarkMode,
    customizeTheme,
    resetTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
