import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createTheme, 
  ThemeProvider as MuiThemeProvider,
  useMediaQuery,
  CssBaseline 
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { getIntelGraphTheme } from './intelgraphTheme'; // Import the new theme function

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Enhanced theme configurations
// Enhanced theme configurations
const getThemeConfig = (mode) => { // Removed colorScheme parameter
  const isDark = mode === 'dark';
  
  const baseTheme = getIntelGraphTheme(mode); // Use the new theme function

  // Merge custom components and mixins from the original getThemeConfig
  // This ensures that existing custom styles and responsive helpers are preserved.
  return {
    ...baseTheme,
    palette: {
      ...baseTheme.palette,
      // Custom colors for intelligence application (if still needed, otherwise remove)
      threat: {
        high: '#f44336',
        medium: '#ff9800',
        low: '#4caf50',
        unknown: '#9e9e9e'
      },
      entity: {
        person: '#4caf50',
        organization: '#2196f3',
        location: '#ff9800',
        document: '#9c27b0',
        event: '#f44336',
        asset: '#795548',
        communication: '#607d8b'
      }
    },
    typography: {
      ...baseTheme.typography,
      // Override specific typography variants if needed, otherwise remove
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
      h1: {
        ...baseTheme.typography.h1,
        fontSize: '2.125rem', // Keep existing h1 size if different from new theme
      },
      h2: {
        ...baseTheme.typography.h2,
        fontSize: '1.75rem',
      },
      h3: {
        ...baseTheme.typography.h3,
        fontSize: '1.5rem',
      },
      h4: {
        ...baseTheme.typography.h4,
        fontSize: '1.25rem',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5
      },
      body1: {
        ...baseTheme.typography.body1,
        fontSize: '0.875rem',
      },
      body2: {
        ...baseTheme.typography.body2,
        fontSize: '0.75rem',
      },
      caption: {
        ...baseTheme.typography.caption,
        fontSize: '0.6875rem',
      }
    },
    components: {
      ...baseTheme.components, // Preserve existing components overrides
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#6b6b6b #2b2b2b' : '#d4d4d4 #f1f1f1',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: isDark ? '#6b6b6b' : '#d4d4d4',
              minHeight: 24,
              '&:hover': {
                backgroundColor: isDark ? '#8b8b8b' : '#b4b4b4'
              }
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              borderRadius: 8,
              backgroundColor: isDark ? '#2b2b2b' : '#f1f1f1'
            }
          },
          '*': {
            '&:focus-visible': {
              outline: `2px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: 2
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            color: isDark ? '#ffffff' : '#212121',
            boxShadow: isDark 
              ? '0px 2px 4px -1px rgba(0,0,0,0.4)' 
              : '0px 2px 4px -1px rgba(0,0,0,0.2)'
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderRight: `1px solid ${isDark ? '#333333' : '#e0e0e0'}`
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderRadius: 12,
            boxShadow: isDark 
              ? '0px 4px 20px rgba(0, 0, 0, 0.3)'
              : '0px 4px 20px rgba(0, 0, 0, 0.1)',
            transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
            '&:hover': {
              boxShadow: isDark 
                ? '0px 8px 30px rgba(0, 0, 0, 0.4)'
                : '0px 8px 30px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
            transition: 'all 0.2s ease-in-out',
            '&:focus-visible': {
              outline: `2px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: 2
            }
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-1px)'
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)',
              transform: 'scale(1.05)'
            },
            '&:focus-visible': {
              outline: `2px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: 2
            }
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-1px)'
              },
              '&.Mui-focused': {
                transform: 'translateY(-1px)',
                boxShadow: `0px 4px 12px rgba(${baseTheme.palette.primary.main}, 0.2)`
              }
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#333333' : '#616161',
            color: '#ffffff',
            fontSize: '0.75rem',
            borderRadius: 6,
            padding: '8px 12px'
          }
        }
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 0',
            '&.Mui-selected': {
              backgroundColor: isDark 
                ? 'rgba(144, 202, 249, 0.08)'
                : 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                backgroundColor: isDark 
                  ? 'rgba(144, 202, 249, 0.12)'
                  : 'rgba(25, 118, 210, 0.12)'
              }
            },
            '&:hover': {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.04)',
              transform: 'translateX(4px)'
            }
          }
        }
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginBottom: 8,
            '&:before': {
              display: 'none'
            },
            '&.Mui-expanded': {
              margin: '8px 0'
            }
          }
        }
      }
    },
    // Custom mixins for responsive design
    mixins: {
      toolbar: {
        minHeight: 64,
        '@media (max-width:599px)': {
          minHeight: 56
        }
      },
      // Responsive breakpoints helpers
      responsive: {
        mobile: '@media (max-width: 599px)',
        tablet: '@media (max-width: 899px)',
        desktop: '@media (min-width: 900px)',
        wide: '@media (min-width: 1200px)'
      }
    }
  };
};

export function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  const { darkMode, colorScheme } = useSelector(state => state.ui || { darkMode: false, colorScheme: 'default' });
  
  // System preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [systemMode, setSystemMode] = useState(prefersDarkMode ? 'dark' : 'light');
  
  // High contrast mode detection
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    setSystemMode(prefersDarkMode ? 'dark' : 'light');
  }, [prefersDarkMode]);

  // Auto mode uses system preference
  const effectiveMode = darkMode === 'auto' ? systemMode : darkMode ? 'dark' : 'light';
  
  const theme = React.useMemo(() => {
    const baseTheme = getThemeConfig(effectiveMode, colorScheme);
    
    // Apply accessibility enhancements
    if (prefersHighContrast) {
      baseTheme.palette.text.primary = effectiveMode === 'dark' ? '#ffffff' : '#000000';
      baseTheme.palette.text.secondary = effectiveMode === 'dark' ? '#e0e0e0' : '#424242';
    }
    
    if (prefersReducedMotion) {
      // Disable animations for users who prefer reduced motion
      baseTheme.transitions = {
        ...baseTheme.transitions,
        create: () => 'none'
      };
      
      // Override component transition styles
      Object.keys(baseTheme.components).forEach(component => {
        if (baseTheme.components[component].styleOverrides) {
          const overrides = baseTheme.components[component].styleOverrides;
          Object.keys(overrides).forEach(rule => {
            if (overrides[rule].transition) {
              overrides[rule].transition = 'none';
            }
            if (overrides[rule]['&:hover'] && overrides[rule]['&:hover'].transform) {
              overrides[rule]['&:hover'].transform = 'none';
            }
          });
        }
      });
    }
    
    return baseTheme;
  }, [effectiveMode, colorScheme, prefersHighContrast, prefersReducedMotion]);

  const contextValue = {
    darkMode: effectiveMode === 'dark',
    colorScheme,
    systemMode,
    prefersDarkMode,
    prefersHighContrast,
    prefersReducedMotion,
    toggleDarkMode: () => {
      // Implement dark mode toggle through Redux
      // dispatch(toggleDarkMode());
    },
    setColorScheme: (scheme) => {
      // Implement color scheme change through Redux
      // dispatch(setColorScheme(scheme));
    }
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// Hook for responsive design
export const useResponsive = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isWide = useMediaQuery(theme.breakpoints.up('lg'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    breakpoints: theme.breakpoints
  };
};

// Hook for accessibility features
export const useAccessibility = () => {
  const { prefersHighContrast, prefersReducedMotion } = useTheme();
  const [announcements, setAnnouncements] = useState([]);

  const announce = (message, priority = 'polite') => {
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };
    
    setAnnouncements(prev => [...prev, announcement]);
    
    // Remove announcement after it's been announced
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 1000);
  };

  return {
    prefersHighContrast,
    prefersReducedMotion,
    announce,
    announcements
  };
};

export default ThemeProvider;