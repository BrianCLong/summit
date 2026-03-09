/**
 * Summit Design System — Tokens
 *
 * Single source of truth for all design tokens.
 * Consumed by Tailwind config and runtime theme utilities.
 */

export const colors = {
  // Brand
  brand: {
    primary: '#5b9cff',
    secondary: '#667eea',
    tertiary: '#764ba2',
    accent: '#06d6a0',
  },

  // Backgrounds (dark-first)
  bg: {
    primary: '#0b0f14',
    secondary: '#1c1f26',
    tertiary: '#2a2f3a',
    surface: '#161b22',
    surfaceHover: '#1e2430',
    surfaceActive: '#252c38',
    elevated: '#21262d',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },

  // Foregrounds
  fg: {
    primary: '#e6edf3',
    secondary: '#7c8591',
    tertiary: '#484f58',
    muted: '#3b434d',
    inverse: '#0b0f14',
    link: '#58a6ff',
  },

  // Semantic
  semantic: {
    success: '#28a745',
    successMuted: 'rgba(40, 167, 69, 0.15)',
    warning: '#d29922',
    warningMuted: 'rgba(210, 153, 34, 0.15)',
    error: '#f85149',
    errorMuted: 'rgba(248, 81, 73, 0.15)',
    info: '#58a6ff',
    infoMuted: 'rgba(88, 166, 255, 0.15)',
  },

  // Status
  status: {
    up: '#28a745',
    down: '#f85149',
    degraded: '#d29922',
    unknown: '#6c757d',
    pending: '#58a6ff',
  },

  // Graph / visualization palette
  viz: {
    blue: '#58a6ff',
    purple: '#bc8cff',
    green: '#3fb950',
    orange: '#d29922',
    red: '#f85149',
    cyan: '#39d2c0',
    pink: '#f778ba',
    yellow: '#e3b341',
  },

  // Borders
  border: {
    default: '#30363d',
    muted: '#21262d',
    strong: '#484f58',
  },
} as const;

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  64: '16rem',
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
  },
  fontSize: {
    '2xs': ['0.625rem', { lineHeight: '1.4' }],
    xs: ['0.75rem', { lineHeight: '1.5' }],
    sm: ['0.875rem', { lineHeight: '1.5' }],
    base: ['1rem', { lineHeight: '1.5' }],
    lg: ['1.125rem', { lineHeight: '1.5' }],
    xl: ['1.25rem', { lineHeight: '1.4' }],
    '2xl': ['1.5rem', { lineHeight: '1.3' }],
    '3xl': ['1.875rem', { lineHeight: '1.3' }],
    '4xl': ['2.25rem', { lineHeight: '1.2' }],
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const radii = {
  none: '0',
  sm: '0.25rem',
  base: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(91, 156, 255, 0.15)',
  glowStrong: '0 0 40px rgba(91, 156, 255, 0.25)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  commandPalette: 1090,
} as const;

/** Layout constants */
export const layout = {
  navRailWidth: '64px',
  navRailExpandedWidth: '240px',
  topBarHeight: '48px',
  panelMinWidth: '320px',
  panelMaxWidth: '600px',
} as const;
