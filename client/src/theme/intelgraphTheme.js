import { createTheme } from '@mui/material/styles';

// Summit Design System — v2.0
// Premium dark-first enterprise intelligence platform

const DARK = {
  // Surface hierarchy
  base:     '#07090F',
  surface1: '#0C1220',
  surface2: '#111A2E',
  surface3: '#18243D',
  surface4: '#1E2D4A',

  // Borders
  borderSubtle:  'rgba(255,255,255,0.05)',
  borderDefault: 'rgba(255,255,255,0.09)',
  borderStrong:  'rgba(255,255,255,0.16)',

  // Brand / interactive
  primary:         '#3D7EFF',
  primaryLight:    '#6B9FFF',
  primaryDark:     '#2563EB',
  primaryMuted:    'rgba(61, 126, 255, 0.12)',
  primaryMutedHov: 'rgba(61, 126, 255, 0.18)',

  // Signal accent (live indicators, highlights)
  accent:      '#00C9A7',
  accentMuted: 'rgba(0, 201, 167, 0.12)',

  // Semantic
  success:     '#22C55E',
  successMuted:'rgba(34, 197, 94, 0.12)',
  warning:     '#F59E0B',
  warningMuted:'rgba(245, 158, 11, 0.12)',
  error:       '#EF4444',
  errorMuted:  'rgba(239, 68, 68, 0.12)',

  // Text hierarchy
  textPrimary:   '#E8EEF7',
  textSecondary: '#8B9EC4',
  textMuted:     '#546483',
  textInverse:   '#07090F',
};

const LIGHT = {
  base:     '#F0F4F8',
  surface1: '#FFFFFF',
  surface2: '#F8FAFC',
  surface3: '#F1F5F9',
  surface4: '#E8EEF7',

  borderSubtle:  'rgba(15,23,42,0.04)',
  borderDefault: 'rgba(15,23,42,0.09)',
  borderStrong:  'rgba(15,23,42,0.18)',

  primary:         '#2563EB',
  primaryLight:    '#3B82F6',
  primaryDark:     '#1D4ED8',
  primaryMuted:    'rgba(37, 99, 235, 0.08)',
  primaryMutedHov: 'rgba(37, 99, 235, 0.13)',

  accent:      '#0D9488',
  accentMuted: 'rgba(13, 148, 136, 0.10)',

  success:     '#16A34A',
  successMuted:'rgba(22, 163, 74, 0.10)',
  warning:     '#D97706',
  warningMuted:'rgba(217, 119, 6, 0.10)',
  error:       '#DC2626',
  errorMuted:  'rgba(220, 38, 38, 0.10)',

  textPrimary:   '#0F172A',
  textSecondary: '#334155',
  textMuted:     '#64748B',
  textInverse:   '#FFFFFF',
};

export const getIntelGraphTheme = (mode = 'dark') => {
  const C = mode === 'dark' ? DARK : LIGHT;

  return createTheme({
    palette: {
      mode,
      primary: {
        main:         C.primary,
        light:        C.primaryLight,
        dark:         C.primaryDark,
        contrastText: C.textInverse,
      },
      secondary: {
        main:         C.accent,
        contrastText: C.textInverse,
      },
      success: {
        main:         C.success,
        contrastText: C.textInverse,
      },
      error: {
        main:         C.error,
        contrastText: '#FFFFFF',
      },
      warning: {
        main:         C.warning,
        contrastText: C.textInverse,
      },
      background: {
        default: C.surface1,
        paper:   C.surface2,
      },
      text: {
        primary:   C.textPrimary,
        secondary: C.textSecondary,
        disabled:  C.textMuted,
      },
      divider: C.borderDefault,
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: '2rem',    fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.625rem',fontWeight: 700, lineHeight: 1.2,  letterSpacing: '-0.015em' },
      h3: { fontSize: '1.375rem',fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em' },
      h4: { fontSize: '1.125rem',fontWeight: 600, lineHeight: 1.35 },
      h5: { fontSize: '1rem',    fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '0.9rem',  fontWeight: 600, lineHeight: 1.4 },
      body1:    { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.55 },
      body2:    { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.55 },
      caption:  { fontSize: '0.6875rem', fontWeight: 400, lineHeight: 1.4 },
      subtitle1:{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.45 },
      subtitle2:{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.45 },
      button: {
        textTransform: 'none',
        fontWeight:    600,
        fontSize:      '0.8125rem',
        lineHeight:    1.4,
        letterSpacing: '0.01em',
      },
    },

    shape: { borderRadius: 8 },
    spacing: 8,

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          html: { height: '100%' },
          body: {
            height: '100%',
            backgroundColor: C.surface1,
            color: C.textPrimary,
            scrollbarWidth: 'thin',
            scrollbarColor: `${C.borderStrong} transparent`,
            '& ::-webkit-scrollbar': { width: '5px', height: '5px' },
            '& ::-webkit-scrollbar-track': { background: 'transparent' },
            '& ::-webkit-scrollbar-thumb': {
              background: C.borderStrong,
              borderRadius: '3px',
              '&:hover': { background: C.textMuted },
            },
          },
          '#root': { height: '100%' },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            fontWeight: 600,
            transition: 'all 140ms ease',
            '&:focus-visible': {
              outline: `2px solid ${C.primary}`,
              outlineOffset: '2px',
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          outlined: {
            borderColor: C.borderDefault,
            '&:hover': { borderColor: C.borderStrong },
          },
          sizeSmall: { fontSize: '0.75rem', padding: '4px 12px' },
        },
        defaultProps: { disableElevation: true },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: C.surface2,
            border: `1px solid ${C.borderDefault}`,
            boxShadow: 'none',
          },
          elevation1: {
            boxShadow: mode === 'dark'
              ? '0 1px 4px rgba(0,0,0,0.4)'
              : '0 1px 4px rgba(15,23,42,0.07)',
          },
          elevation2: {
            boxShadow: mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.5)'
              : '0 4px 16px rgba(15,23,42,0.10)',
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: C.surface2,
            border: `1px solid ${C.borderDefault}`,
            boxShadow: 'none',
            borderRadius: '10px',
            '&:hover': { borderColor: C.borderStrong },
            transition: 'border-color 150ms ease',
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '20px',
            '&:last-child': { paddingBottom: '20px' },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? '#090D16' : '#FFFFFF',
            borderBottom: `1px solid ${C.borderDefault}`,
            boxShadow: 'none',
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#090D16' : '#FFFFFF',
            border: 'none',
            borderRight: `1px solid ${C.borderDefault}`,
            boxShadow: 'none',
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: '6px',
            margin: '1px 8px',
            width: 'calc(100% - 16px)',
            transition: 'all 130ms ease',
            '&.Mui-selected': {
              backgroundColor: C.primaryMuted,
              color: C.primary,
              '&:hover': { backgroundColor: C.primaryMutedHov },
            },
            '&:hover': {
              backgroundColor: mode === 'dark'
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(15,23,42,0.04)',
            },
          },
        },
      },

      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: 36, color: 'inherit' },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            fontSize: '0.6875rem',
            height: '22px',
          },
          sizeSmall: { height: '18px' },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            backgroundColor: mode === 'dark' ? C.surface4 : '#1E293B',
            color: mode === 'dark' ? C.textPrimary : '#F8FAFC',
            border: `1px solid ${C.borderDefault}`,
            borderRadius: '6px',
            padding: '5px 10px',
          },
          arrow: {
            color: mode === 'dark' ? C.surface4 : '#1E293B',
          },
        },
        defaultProps: { arrow: true, enterDelay: 400 },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontWeight: 600,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: C.textMuted,
              borderBottom: `1px solid ${C.borderDefault}`,
              padding: '10px 16px',
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${C.borderSubtle}`,
            fontSize: '0.8125rem',
            padding: '10px 16px',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 120ms ease',
            '&:hover': { backgroundColor: C.primaryMuted },
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            fontSize: '0.8125rem',
            alignItems: 'center',
          },
        },
      },

      MuiBadge: {
        styleOverrides: {
          badge: {
            fontSize: '0.625rem',
            fontWeight: 700,
            height: '16px',
            minWidth: '16px',
            padding: '0 4px',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: '4px',
            height: '4px',
            backgroundColor: mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(15,23,42,0.08)',
          },
          bar: { borderRadius: '4px' },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? C.surface3 : C.surface1,
            border: `1px solid ${C.borderDefault}`,
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.6)'
              : '0 8px 24px rgba(15,23,42,0.12)',
            borderRadius: '10px',
            minWidth: '180px',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            borderRadius: '5px',
            margin: '2px 6px',
            padding: '7px 10px',
            '&:hover': { backgroundColor: C.primaryMuted },
            '&.Mui-selected': {
              backgroundColor: C.primaryMuted,
              '&:hover': { backgroundColor: C.primaryMutedHov },
            },
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: C.borderSubtle },
        },
      },

      MuiSelect: {
        styleOverrides: {
          root: { fontSize: '0.8125rem' },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: C.borderDefault,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: C.borderStrong,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: C.primary,
              borderWidth: '1.5px',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '0.8125rem', color: C.textMuted },
        },
      },

      MuiFormLabel: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.8125rem' },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            transition: 'all 130ms ease',
          },
          sizeSmall: { padding: '6px' },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            minHeight: '40px',
            padding: '8px 16px',
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root: { minHeight: '40px' },
          indicator: { height: '2px', borderRadius: '2px' },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(15,23,42,0.06)',
          },
        },
      },
    },
  });
};
