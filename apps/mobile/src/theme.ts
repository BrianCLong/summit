/**
 * Mobile Field Ops Theme
 * Adapted from web design tokens for mobile use
 */
import { createTheme, alpha } from '@mui/material/styles';

// Color palette optimized for mobile and outdoor visibility
const colors = {
  // Primary brand colors
  primary: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },
  // Secondary accent
  secondary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },
  // Status colors with high contrast
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#000000',
  },
  success: {
    main: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
    contrastText: '#ffffff',
  },
  info: {
    main: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    contrastText: '#ffffff',
  },
  // Severity colors for alerts
  severity: {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#22c55e',
    info: '#06b6d4',
  },
  // Background colors for dark mode
  background: {
    default: '#0f172a',
    paper: '#1e293b',
    elevated: '#334155',
  },
  // Text colors
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    disabled: '#64748b',
  },
  // Dividers
  divider: alpha('#94a3b8', 0.12),
};

// Typography scale for mobile readability
const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"SF Pro Display"',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  // Larger sizes for touch targets and outdoor readability
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none' as const,
  },
};

// Spacing scale
const spacing = 8;

// Create the theme
export const mobileTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
    background: colors.background,
    text: colors.text,
    divider: colors.divider,
  },
  typography,
  spacing,
  shape: {
    borderRadius: 12,
  },
  components: {
    // Global component overrides for mobile
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Prevent pull-to-refresh conflicts
          overscrollBehavior: 'none',
          // Safe area insets for notched devices
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        // Disable text selection on non-input elements
        '*:not(input):not(textarea)': {
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999, // Pill shape
          minHeight: 48, // Touch-friendly height
          padding: '12px 24px',
          textTransform: 'none',
        },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
      defaultProps: {
        disableRipple: false,
        disableElevation: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48, // Touch-friendly
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: colors.background.paper,
          boxShadow: 'none',
          border: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          minHeight: 56, // Touch-friendly
          borderRadius: 8,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 56,
          borderRadius: 8,
          '&:active': {
            backgroundColor: alpha(colors.primary.main, 0.1),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        sizeSmall: {
          height: 24,
        },
        sizeMedium: {
          height: 32,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            minHeight: 48,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          borderTop: `1px solid ${colors.divider}`,
          height: 64,
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 64,
          padding: '8px 12px',
          '&.Mui-selected': {
            color: colors.primary.main,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: `0 4px 12px ${alpha('#000', 0.3)}`,
        },
      },
    },
    MuiSwipeableDrawer: {
      defaultProps: {
        disableSwipeToOpen: false,
        swipeAreaWidth: 30,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 16,
          borderRadius: 24,
          maxHeight: 'calc(100% - 32px)',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          bottom: 80, // Above bottom nav
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: alpha(colors.text.secondary, 0.1),
        },
      },
    },
  },
});

// Export severity color getter
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return colors.severity.critical;
    case 'high':
    case 'error':
      return colors.severity.high;
    case 'medium':
    case 'warning':
      return colors.severity.medium;
    case 'low':
    case 'success':
      return colors.severity.low;
    case 'info':
    default:
      return colors.severity.info;
  }
}

// Export priority color getter
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return colors.severity.critical;
    case 'high':
      return colors.severity.high;
    case 'medium':
      return colors.severity.medium;
    case 'low':
    default:
      return colors.severity.low;
  }
}

export default mobileTheme;
