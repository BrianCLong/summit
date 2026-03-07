import { createTheme, ThemeOptions } from "@mui/material/styles";
import { darkTokens, DesignTokens, lightTokens } from "./tokens";

export type BuildThemeOptions = {
  mode?: "light" | "dark";
  tokens?: DesignTokens;
};

const buildPalette = (tokens: DesignTokens): ThemeOptions["palette"] => ({
  mode: tokens.palette.mode,
  primary: {
    main: tokens.palette.primary.main,
    contrastText: tokens.palette.primary.contrastText,
  },
  secondary: {
    main: tokens.palette.secondary.main,
    contrastText: tokens.palette.secondary.contrastText,
  },
  success: {
    main: tokens.palette.success.main,
    contrastText: tokens.palette.success.contrastText,
  },
  warning: {
    main: tokens.palette.warning.main,
    contrastText: tokens.palette.warning.contrastText,
  },
  error: {
    main: tokens.palette.error.main,
    contrastText: tokens.palette.error.contrastText,
  },
  background: {
    default: tokens.palette.background.surface,
    paper: tokens.palette.background.elevated,
  },
  text: {
    primary: tokens.palette.text.primary,
    secondary: tokens.palette.text.secondary,
    disabled: tokens.palette.states.disabled,
  },
});

const buildTypography = (tokens: DesignTokens): ThemeOptions["typography"] => ({
  fontFamily: tokens.typography.fontFamily,
  h1: tokens.typography.headings.h1,
  h2: tokens.typography.headings.h2,
  h3: tokens.typography.headings.h3,
  h4: tokens.typography.headings.h4,
  h5: tokens.typography.headings.h5,
  h6: tokens.typography.headings.h6,
  body1: tokens.typography.body.regular,
  body2: tokens.typography.body.small,
  caption: tokens.typography.body.caption,
});

const buildShape = (tokens: DesignTokens): ThemeOptions["shape"] => ({
  borderRadius: tokens.radius.md,
});

const buildShadows = (tokens: DesignTokens): ThemeOptions["shadows"] => [
  "none",
  tokens.shadows.sm,
  tokens.shadows.md,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
  tokens.shadows.lg,
];

export const buildDesignSystemTheme = ({ mode = "light", tokens }: BuildThemeOptions = {}) => {
  const resolvedTokens = tokens ?? (mode === "dark" ? darkTokens : lightTokens);

  return createTheme({
    palette: buildPalette(resolvedTokens),
    typography: buildTypography(resolvedTokens),
    shape: buildShape(resolvedTokens),
    shadows: buildShadows(resolvedTokens),
    spacing: (factor: number) => resolvedTokens.spacing.sm * factor,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: resolvedTokens.radius.md,
            textTransform: "none",
            fontWeight: 600,
            transition: `all ${resolvedTokens.motion.fast}`,
            "&:focus-visible": {
              outline: `2px solid ${resolvedTokens.palette.states.outline}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedTokens.palette.background.surface,
            border: `1px solid ${resolvedTokens.palette.border.light}`,
            boxShadow: resolvedTokens.shadows.sm,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: resolvedTokens.palette.states.hover,
            },
            "&:focus-within": {
              outline: `2px solid ${resolvedTokens.palette.states.outline}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
    },
  });
};

export type DesignSystemTheme = ReturnType<typeof buildDesignSystemTheme>;
