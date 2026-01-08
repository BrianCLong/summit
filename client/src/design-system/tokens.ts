export type ColorScale = {
  main: string;
  contrastText: string;
  emphasis?: string;
  muted?: string;
  border?: string;
};

export type InteractionState = {
  hover: string;
  active: string;
  focus: string;
  disabled: string;
  outline: string;
};

export type DesignTokens = {
  version: string;
  palette: {
    mode: "light" | "dark";
    primary: ColorScale;
    secondary: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    background: {
      surface: string;
      subtle: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: {
      light: string;
      default: string;
      strong: string;
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
      small: { fontSize: string; lineHeight: number };
      caption: { fontSize: string; lineHeight: number };
    };
  };
  spacing: {
    none: number;
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  motion: {
    fast: string;
    normal: string;
    slow: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
};

export const lightTokens: DesignTokens = {
  version: "1.0.0",
  palette: {
    mode: "light",
    primary: {
      main: "#3B82F6",
      contrastText: "#FFFFFF",
      emphasis: "#1D4ED8",
      muted: "#93C5FD",
      border: "#1D4ED8",
    },
    secondary: {
      main: "#7C3AED",
      contrastText: "#FFFFFF",
      emphasis: "#5B21B6",
      muted: "#C4B5FD",
      border: "#5B21B6",
    },
    success: {
      main: "#10B981",
      contrastText: "#053321",
      emphasis: "#059669",
      muted: "#6EE7B7",
      border: "#047857",
    },
    warning: {
      main: "#F59E0B",
      contrastText: "#3F2C00",
      emphasis: "#D97706",
      muted: "#FCD34D",
      border: "#B45309",
    },
    error: {
      main: "#EF4444",
      contrastText: "#3E0000",
      emphasis: "#DC2626",
      muted: "#FCA5A5",
      border: "#991B1B",
    },
    background: {
      surface: "#FFFFFF",
      subtle: "#F7F9FC",
      elevated: "#F1F5F9",
    },
    text: {
      primary: "#0F172A",
      secondary: "#334155",
      muted: "#64748B",
    },
    border: {
      light: "#E2E8F0",
      default: "#CBD5E1",
      strong: "#94A3B8",
    },
    states: {
      hover: "#E0EAFF",
      active: "#C7D2FE",
      focus: "#1D4ED8",
      disabled: "#CBD5E1",
      outline: "#1D4ED8",
    },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    headings: {
      h1: { fontSize: "32px", fontWeight: 700, lineHeight: 1.1 },
      h2: { fontSize: "28px", fontWeight: 700, lineHeight: 1.2 },
      h3: { fontSize: "24px", fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: "20px", fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: "18px", fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: "16px", fontWeight: 600, lineHeight: 1.5 },
    },
    body: {
      regular: { fontSize: "16px", lineHeight: 1.5 },
      small: { fontSize: "14px", lineHeight: 1.5 },
      caption: { fontSize: "12px", lineHeight: 1.4 },
    },
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    pill: 999,
  },
  motion: {
    fast: "120ms ease-out",
    normal: "180ms ease",
    slow: "260ms ease-in-out",
  },
  shadows: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
    md: "0 2px 8px rgba(15, 23, 42, 0.12)",
    lg: "0 8px 24px rgba(15, 23, 42, 0.12)",
  },
};

export const darkTokens: DesignTokens = {
  ...lightTokens,
  palette: {
    ...lightTokens.palette,
    mode: "dark",
    primary: {
      main: "#93C5FD",
      contrastText: "#0B1220",
      emphasis: "#60A5FA",
      muted: "#1E293B",
      border: "#93C5FD",
    },
    background: {
      surface: "#0B1220",
      subtle: "#111827",
      elevated: "#1F2937",
    },
    text: {
      primary: "#E2E8F0",
      secondary: "#CBD5E1",
      muted: "#94A3B8",
    },
    border: {
      light: "#1F2937",
      default: "#334155",
      strong: "#475569",
    },
    states: {
      hover: "#1F2937",
      active: "#111827",
      focus: "#93C5FD",
      disabled: "#1F2937",
      outline: "#93C5FD",
    },
  },
};

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
