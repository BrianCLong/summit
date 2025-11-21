import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * UI Theme extension point for custom visual themes
 */
export interface ThemeExtension extends ExtensionPoint<ThemeContext, ThemeConfig> {
  type: 'ui-theme';
  name: string;
  description: string;
  preview: string; // Preview image URL
}

export interface ThemeContext {
  mode: 'light' | 'dark' | 'auto';
  userPreferences?: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
  };
}

export interface ThemeConfig {
  name: string;
  mode: 'light' | 'dark';
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  components?: ComponentOverrides;
  cssVariables?: Record<string, string>;
}

export interface ColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;

  background: {
    default: string;
    paper: string;
    elevated: string;
  };

  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };

  border: {
    default: string;
    strong: string;
    subtle: string;
  };
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface Typography {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface Spacing {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface Shadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ComponentOverrides {
  button?: Record<string, any>;
  input?: Record<string, any>;
  card?: Record<string, any>;
  modal?: Record<string, any>;
  table?: Record<string, any>;
  [key: string]: Record<string, any> | undefined;
}

/**
 * Base class for theme extensions
 */
export abstract class BaseThemeExtension implements ThemeExtension {
  readonly type = 'ui-theme' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly preview: string
  ) {}

  abstract execute(context: ThemeContext): Promise<ThemeConfig>;

  /**
   * Generate CSS from theme config
   */
  generateCSS(config: ThemeConfig): string {
    const cssVars: string[] = [];

    // Colors
    for (const [category, colors] of Object.entries(config.colors)) {
      if (typeof colors === 'object') {
        for (const [key, value] of Object.entries(colors)) {
          cssVars.push(`--color-${category}-${key}: ${value};`);
        }
      }
    }

    // Typography
    for (const [category, values] of Object.entries(config.typography)) {
      for (const [key, value] of Object.entries(values)) {
        cssVars.push(`--${category}-${key}: ${value};`);
      }
    }

    // Custom CSS variables
    if (config.cssVariables) {
      for (const [key, value] of Object.entries(config.cssVariables)) {
        cssVars.push(`--${key}: ${value};`);
      }
    }

    return `:root {\n  ${cssVars.join('\n  ')}\n}`;
  }
}
