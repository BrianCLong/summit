import React, { createContext, useContext, useEffect, useMemo } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { buildDesignSystemTheme } from "./theme";
import { DesignSystemTelemetry, globalTelemetry } from "./telemetry";
import { DesignTokens, darkTokens, lightTokens } from "./tokens";

export type DesignSystemProviderProps = {
  mode?: "light" | "dark";
  tokens?: DesignTokens;
  telemetry?: DesignSystemTelemetry;
  children: React.ReactNode;
};

// eslint-disable-next-line react-refresh/only-export-components
export const TelemetryContext = createContext<DesignSystemTelemetry>(globalTelemetry);

// eslint-disable-next-line react-refresh/only-export-components
export const useDesignSystemTelemetry = () => useContext(TelemetryContext);

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  mode = "light",
  tokens,
  telemetry = globalTelemetry,
  children,
}) => {
  const resolvedTokens = useMemo(
    () => tokens ?? (mode === "dark" ? darkTokens : lightTokens),
    [mode, tokens]
  );
  const theme = useMemo(
    () => buildDesignSystemTheme({ mode, tokens: resolvedTokens }),
    [mode, resolvedTokens]
  );

  useEffect(() => {
    telemetry.record("DesignSystemProvider", resolvedTokens.version, { mode });
    return () => telemetry.dispose();
  }, [mode, telemetry, resolvedTokens.version]);

  return (
    <TelemetryContext.Provider value={telemetry}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </TelemetryContext.Provider>
  );
};
