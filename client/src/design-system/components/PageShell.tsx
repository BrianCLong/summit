import React from "react";
import { Box, Breadcrumbs, Button, Stack, Typography, Alert } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import { useDesignSystemTelemetry } from "../DesignSystemProvider";

export type Breadcrumb = { label: string; href?: string; onClick?: () => void };

export type PageShellProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  permission?: { allowed: boolean; reason?: string };
  children: React.ReactNode;
};

export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  permission,
  children,
}) => {
  const telemetry = useDesignSystemTelemetry();
  const isAllowed = permission?.allowed ?? true;
  const reason = permission?.reason;

  React.useEffect(() => {
    telemetry.record("PageShell", "1.0.0", { title, allowed: isAllowed });
  }, [telemetry, title, isAllowed]);

  return (
    <Box component="section" sx={{ p: 3, gap: 2, display: "flex", flexDirection: "column" }}>
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon fontSize="small" />}>
            <Button
              variant="text"
              size="small"
              startIcon={<HomeOutlinedIcon fontSize="small" />}
              onClick={breadcrumbs[0]?.onClick}
            >
              Home
            </Button>
            {breadcrumbs.map((crumb) => (
              <Button
                key={crumb.label}
                variant="text"
                size="small"
                onClick={crumb.onClick}
                href={crumb.href}
              >
                {crumb.label}
              </Button>
            ))}
          </Breadcrumbs>
        )}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mt={breadcrumbs ? 2 : 0}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {secondaryAction}
            {primaryAction}
          </Stack>
        </Stack>
      </Box>
      {!isAllowed && (
        <Alert severity="warning" role="status" aria-live="polite">
          <Typography variant="body1" fontWeight={600} gutterBottom>
            You don’t have access to this area.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reason || "Contact your administrator to request permission."}
          </Typography>
        </Alert>
      )}
      <Box aria-busy={!isAllowed ? undefined : false} aria-live="polite">
        {children}
      </Box>
    </Box>
  );
};
