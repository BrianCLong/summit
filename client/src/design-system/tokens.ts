// Summit Design System — Tokens v2.0
// Dark-first enterprise intelligence platform

export type ColorScale = {
  main: string;
  contrastText: string;
  emphasis?: string;
  muted?: string;
  border?: string;
};

export type InteractionState = {
  hover:    string;
  active:   string;
  focus:    string;
  disabled: string;
  outline:  string;
};

export type DesignTokens = {
  version: string;
  palette: {
    mode: 'light' | 'dark';
    primary:   ColorScale;
    secondary: ColorScale;
    success:   ColorScale;
    warning:   ColorScale;
    error:     ColorScale;
    background: {
      surface:  string;
      subtle:   string;
      elevated: string;
    };
    text: {
      primary:   string;
      secondary: string;
      muted:     string;
    };
    border: {
      light:   string;
      default: string;
      strong:  string;
    };
    states: InteractionState;
  };
  typography: {
    fontFamily: string;
    headings: {
      h1: { fontSize: string; fontWeight: number; lineHeight: number };
      h2: { fontSize: string; fontWeight: number; lineHeight: number };
      h3: { fontSize: string; fontWeight: number; lineHeight: number };
      h4: { fontSize: string; fontWeight: number; lineHeight: number };
      h5: { fontSize: string; fontWeight: number; lineHeight: number };
      h6: { fontSize: string; fontWeight: number; lineHeight: number };
    };
    body: {
      regular: { fontSize: string; lineHeight: number };
      small:   { fontSize: string; lineHeight: number };
      caption: { fontSize: string; lineHeight: number };
    };
  };
  spacing: {
    none: number;
    xxs:  number;
    xs:   number;
    sm:   number;
    md:   number;
    lg:   number;
    xl:   number;
    xxl:  number;
  };
  radius: {
    sm:   number;
    md:   number;
    lg:   number;
    pill: number;
  };
  motion: {
    fast:   string;
    normal: string;
    slow:   string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
};

// ── Light tokens ───────────────────────────────────────────────────────────
export const lightTokens: DesignTokens = {
  version: '2.0.0',
  palette: {
    mode: 'light',
    primary: {
      main:         '#2563EB',
      contrastText: '#FFFFFF',
      emphasis:     '#1D4ED8',
      muted:        '#DBEAFE',
      border:       '#1D4ED8',
    },
    secondary: {
      main:         '#0D9488',
      contrastText: '#FFFFFF',
      emphasis:     '#0F766E',
      muted:        '#CCFBF1',
      border:       '#0F766E',
    },
    success: {
      main:         '#16A34A',
      contrastText: '#FFFFFF',
      emphasis:     '#15803D',
      muted:        '#DCFCE7',
      border:       '#166534',
    },
    warning: {
      main:         '#D97706',
      contrastText: '#FFFFFF',
      emphasis:     '#B45309',
      muted:        '#FEF3C7',
      border:       '#92400E',
    },
    error: {
      main:         '#DC2626',
      contrastText: '#FFFFFF',
      emphasis:     '#B91C1C',
      muted:        '#FEE2E2',
      border:       '#991B1B',
    },
    background: {
      surface:  '#FFFFFF',
      subtle:   '#F8FAFC',
      elevated: '#F1F5F9',
    },
    text: {
      primary:   '#0F172A',
      secondary: '#334155',
      muted:     '#64748B',
    },
    border: {
      light:   '#E2E8F0',
      default: '#CBD5E1',
      strong:  '#94A3B8',
    },
    states: {
      hover:    'rgba(37,99,235,0.06)',
      active:   'rgba(37,99,235,0.12)',
      focus:    '#2563EB',
      disabled: '#CBD5E1',
      outline:  '#2563EB',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    headings: {
      h1: { fontSize: '30px', fontWeight: 700, lineHeight: 1.1 },
      h2: { fontSize: '24px', fontWeight: 700, lineHeight: 1.2 },
      h3: { fontSize: '20px', fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: '17px', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '15px', fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5 },
    },
    body: {
      regular: { fontSize: '15px', lineHeight: 1.55 },
      small:   { fontSize: '13px', lineHeight: 1.55 },
      caption: { fontSize: '11px', lineHeight: 1.4 },
    },
  },
  spacing: {
    none: 0,
    xxs:  2,
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    xxl:  32,
  },
  radius: {
    sm:   4,
    md:   8,
    lg:   12,
    pill: 999,
  },
  motion: {
    fast:   '130ms ease',
    normal: '200ms ease',
    slow:   '280ms ease-in-out',
  },
  shadows: {
    sm: '0 1px 3px rgba(15, 23, 42, 0.07)',
    md: '0 4px 12px rgba(15, 23, 42, 0.10)',
    lg: '0 8px 28px rgba(15, 23, 42, 0.12)',
  },
};

// ── Dark tokens ────────────────────────────────────────────────────────────
export const darkTokens: DesignTokens = {
  ...lightTokens,
  version: '2.0.0',
  palette: {
    ...lightTokens.palette,
    mode: 'dark',
    primary: {
      main:         '#3D7EFF',
      contrastText: '#E8EEF7',
      emphasis:     '#2563EB',
      muted:        'rgba(61, 126, 255, 0.15)',
      border:       '#3D7EFF',
    },
    secondary: {
      main:         '#00C9A7',
      contrastText: '#07090F',
      emphasis:     '#00A389',
      muted:        'rgba(0, 201, 167, 0.12)',
      border:       '#00C9A7',
    },
    success: {
      main:         '#22C55E',
      contrastText: '#07090F',
      emphasis:     '#16A34A',
      muted:        'rgba(34, 197, 94, 0.12)',
      border:       '#22C55E',
    },
    warning: {
      main:         '#F59E0B',
      contrastText: '#07090F',
      emphasis:     '#D97706',
      muted:        'rgba(245, 158, 11, 0.12)',
      border:       '#F59E0B',
    },
    error: {
      main:         '#EF4444',
      contrastText: '#FFFFFF',
      emphasis:     '#DC2626',
      muted:        'rgba(239, 68, 68, 0.12)',
      border:       '#EF4444',
    },
    background: {
      surface:  '#0C1220',
      subtle:   '#111A2E',
      elevated: '#18243D',
    },
    text: {
      primary:   '#E8EEF7',
      secondary: '#8B9EC4',
      muted:     '#546483',
    },
    border: {
      light:   'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.09)',
      strong:  'rgba(255, 255, 255, 0.16)',
    },
    states: {
      hover:    'rgba(61, 126, 255, 0.12)',
      active:   'rgba(61, 126, 255, 0.18)',
      focus:    '#3D7EFF',
      disabled: 'rgba(255, 255, 255, 0.09)',
      outline:  '#3D7EFF',
    },
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.4)',
    md: '0 4px 16px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
};

// ── Allowed value sets for lint / enforcement ──────────────────────────────
export const allowedColors = new Set([
  lightTokens.palette.primary.main,
  lightTokens.palette.primary.emphasis as string,
  lightTokens.palette.secondary.main,
  lightTokens.palette.success.main,
  lightTokens.palette.warning.main,
  lightTokens.palette.error.main,
  lightTokens.palette.text.primary,
  lightTokens.palette.text.secondary,
  lightTokens.palette.text.muted,
  darkTokens.palette.primary.main,
  darkTokens.palette.primary.emphasis as string,
  darkTokens.palette.secondary.main,
  darkTokens.palette.success.main,
  darkTokens.palette.warning.main,
  darkTokens.palette.error.main,
  darkTokens.palette.text.primary,
  darkTokens.palette.text.secondary,
  darkTokens.palette.text.muted,
]);

export const allowedSpacing = new Set<number>([
  lightTokens.spacing.none,
  lightTokens.spacing.xxs,
  lightTokens.spacing.xs,
  lightTokens.spacing.sm,
  lightTokens.spacing.md,
  lightTokens.spacing.lg,
  lightTokens.spacing.xl,
  lightTokens.spacing.xxl,
]);
