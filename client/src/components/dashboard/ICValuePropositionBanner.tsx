import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface ValueMetricProps {
  icon: React.ReactNode;
  metric: string;
  label: string;
  sublabel: string;
  color: string;
}

function ValueMetric({
  icon,
  metric,
  label,
  sublabel,
  color,
}: ValueMetricProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: `${color}15`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: color, lineHeight: 1 }}
        >
          {metric}
        </Typography>
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {sublabel}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ICValuePropositionBanner() {
  const theme = useTheme();

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ py: 3 }}>
        <Stack spacing={2}>
          {/* Header */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  letterSpacing: 1.5,
                }}
              >
                Intelligence Community Platform
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                ODNI-Aligned • Edge-First • Mission-Ready
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'success.main',
                color: 'success.contrastText',
              }}
            >
              <Typography variant="caption" fontWeight={600}>
                RFI READY
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {/* Key Metrics */}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <ValueMetric
                icon={<TrendingUpIcon />}
                metric="50%"
                label="Faster Insights"
                sublabel="vs. legacy systems"
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ValueMetric
                icon={<SpeedIcon />}
                metric="<100ms"
                label="Edge Latency"
                sublabel="tactical deployment"
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ValueMetric
                icon={<SmartToyIcon />}
                metric="85%"
                label="AI Automation"
                sublabel="policy validation"
                color="#9c27b0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ValueMetric
                icon={<SecurityIcon />}
                metric="Zero-Trust"
                label="Security Model"
                sublabel="RBAC + ABAC + OPA"
                color="#ff9800"
              />
            </Grid>
          </Grid>

          {/* Compliance Tags */}
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            sx={{ gap: 1, pt: 1 }}
          >
            {[
              'ICD 503 Aligned',
              'FedRAMP Ready',
              'JWICS Compatible',
              'SIPRNet Tested',
              'Air-Gap Capable',
              'STIX/TAXII Native',
            ].map((tag) => (
              <Box
                key={tag}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'action.selected',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" fontWeight={500}>
                  {tag}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
