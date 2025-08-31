// Generated design token types

export interface SymphonyTokens {
  color: {
    brand: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      surface: string;
      surface-dim: string;
      surface-bright: string;
    };
    foreground: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    status: {
      up: string;
      down: string;
      degraded: string;
      unknown: string;
    };
  };
  typography: {
    font-family: {
      sans: string[];
      mono: string[];
    };
    font-size: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      2xl: string;
      3xl: string;
      4xl: string;
    };
    font-weight: {
      light: string;
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    line-height: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  spacing: {
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
  };
  radius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    2xl: string;
    full: string;
  };
  shadow: {
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    2xl: string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
      slower: string;
    };
    timing: {
      ease-in: string;
      ease-out: string;
      ease-in-out: string;
    };
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    2xl: string;
  };
  z-index: {
    base: string;
    dropdown: string;
    sticky: string;
    fixed: string;
    modal-backdrop: string;
    modal: string;
    popover: string;
    tooltip: string;
    toast: string;
  };
}

declare const tokens: SymphonyTokens;
export default tokens;
