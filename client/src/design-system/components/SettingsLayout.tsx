import React from "react";
import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import { PageShell, PageShellProps } from "./PageShell";
import { useDesignSystemTelemetry } from "../DesignSystemProvider";

export type SettingsSection = {
  title: string;
  description?: string;
  content: React.ReactNode;
};

export type SettingsLayoutProps = Omit<PageShellProps, "children"> & {
  sections: SettingsSection[];
};

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ sections, ...pageProps }) => {
  const telemetry = useDesignSystemTelemetry();
  React.useEffect(() => {
    telemetry.record("SettingsLayout", "1.0.0", { sections: sections.map((s) => s.title) });
  }, [sections, telemetry]);

  return (
    <PageShell {...pageProps}>
      <Stack spacing={2}>
        {sections.map((section) => (
          <Paper key={section.title} variant="outlined" sx={{ p: 3 }}>
            <Grid2 container spacing={2} columns={12} alignItems="flex-start">
              <Grid2 xs={12} md={4}>
                <Typography variant="h6" component="h2">
                  {section.title}
                </Typography>
                {section.description && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {section.description}
                  </Typography>
                )}
              </Grid2>
              <Grid2 xs={12} md={8}>
                <Divider sx={{ mb: 2, display: { md: "none" } }} />
                <Box>{section.content}</Box>
              </Grid2>
            </Grid2>
          </Paper>
        ))}
      </Stack>
    </PageShell>
  );
};
