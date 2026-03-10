export type DesignTokenValue = string | number

export type DesignTokenGroup = Record<string, DesignTokenValue>

export interface DesignTokens {
  spacing: DesignTokenGroup
  radii: DesignTokenGroup
  typography: {
    fontFamily: string
    fontFamilyMono: string
    sizes: DesignTokenGroup
    lineHeights: DesignTokenGroup
    weights: DesignTokenGroup
    letterSpacing: DesignTokenGroup
  }
  zIndices: DesignTokenGroup
  shadows: DesignTokenGroup
  motion: DesignTokenGroup
}

export const tokens: DesignTokens = {
  spacing: {
    '3xs': 2,
    '2xs': 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
    '6xl': 80,
    '7xl': 96,
  },
  radii: {
    none: 0,
    xs: 2,
    sm: 3,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    pill: 9999,
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontFamilyMono: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
    sizes: {
      '2xs': 10,
      xs: 11,
      sm: 12,
      md: 13,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
      '3xl': 24,
      '4xl': 28,
      '5xl': 32,
      '6xl': 40,
      display: 48,
    },
    lineHeights: {
      none: 1,
      tight: 1.2,
      snug: 1.35,
      standard: 1.5,
      relaxed: 1.625,
      loose: 1.75,
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    letterSpacing: {
      tighter: '-0.04em',
      tight: '-0.02em',
      normal: '0em',
      wide: '0.04em',
      wider: '0.08em',
      widest: '0.12em',
    },
  },
  zIndices: {
    below: -1,
    base: 1,
    card: 10,
    sticky: 50,
    dropdown: 100,
    navigation: 200,
    overlay: 400,
    modal: 500,
    toast: 650,
    tooltip: 700,
    supreme: 9999,
  },
  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.5)',
    '2xl': '0 24px 64px rgba(0, 0, 0, 0.8), 0 12px 24px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
    glow: '0 0 0 1px rgba(37, 99, 235, 0.4), 0 0 20px rgba(37, 99, 235, 0.15)',
    'glow-sm': '0 0 0 1px rgba(37, 99, 235, 0.3), 0 0 10px rgba(37, 99, 235, 0.1)',
  },
  motion: {
    instant: '0ms',
    fast: '100ms',
    base: '150ms',
    slow: '250ms',
    deliberate: '400ms',
    'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-in': 'cubic-bezier(0.7, 0, 0.84, 0)',
    'ease-in-out': 'cubic-bezier(0.45, 0, 0.55, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
}

const formatPx = (value: DesignTokenValue) =>
  typeof value === 'number' ? `${value}px` : value

const buildCssVariables = (): Record<string, string> => {
  const vars: Record<string, string> = {
    'ds-font-family-sans': tokens.typography.fontFamily,
    'ds-font-family-mono': tokens.typography.fontFamilyMono,
  }

  Object.entries(tokens.spacing).forEach(([key, value]) => {
    vars[`ds-space-${key}`] = formatPx(value)
  })

  Object.entries(tokens.radii).forEach(([key, value]) => {
    vars[`ds-radius-${key}`] = formatPx(value)
  })

  Object.entries(tokens.typography.sizes).forEach(([key, value]) => {
    vars[`ds-font-size-${key}`] = formatPx(value)
  })

  Object.entries(tokens.typography.lineHeights).forEach(([key, value]) => {
    vars[`ds-line-height-${key}`] = `${value}`
  })

  Object.entries(tokens.typography.weights).forEach(([key, value]) => {
    vars[`ds-font-weight-${key}`] = `${value}`
  })

  Object.entries(tokens.typography.letterSpacing).forEach(([key, value]) => {
    vars[`ds-letter-spacing-${key}`] = `${value}`
  })

  Object.entries(tokens.zIndices).forEach(([key, value]) => {
    vars[`ds-z-${key}`] = `${value}`
  })

  Object.entries(tokens.shadows).forEach(([key, value]) => {
    vars[`ds-shadow-${key}`] = `${value}`
  })

  Object.entries(tokens.motion).forEach(([key, value]) => {
    vars[`ds-motion-${key}`] = `${value}`
  })

  return vars
}

export const tokenVariables = buildCssVariables()
export const designTokenEntries = Object.entries(tokenVariables)

export const tokenVar = (name: string): string => `var(--${name})`
