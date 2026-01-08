import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Assessment, CloudUpload, Savings, Storage, TrendingUp } from "@mui/icons-material";
import { FinOpsAPI } from "../../services/api";

type TrendPoint = {
  usageDate: string;
  totalCostUsd: number;
  computeCostUsd: number;
  storageCostUsd: number;
  egressCostUsd: number;
  thirdPartyCostUsd: number;
  computeUnits: number;
  storageGbHours: number;
  egressGb: number;
  thirdPartyRequests: number;
};

type FinOpsOverview = {
  tenantId: string;
  periodDays: number;
  totals: {
    totalCostUsd: number;
    computeCostUsd: number;
    storageCostUsd: number;
    egressCostUsd: number;
    thirdPartyCostUsd: number;
  };
  buckets: Array<{
    key: "compute" | "storage" | "egress" | "third_party";
    label: string;
    costUsd: number;
    allocationPct: number;
    units: number;
  }>;
  unitMetrics: {
    costPerComputeUnit: number;
    costPerGbHour: number;
    costPerEgressGb: number;
    costPerThirdPartyRequest: number;
  };
  trend: TrendPoint[];
};

const bucketIconMap: Record<string, JSX.Element> = {
  compute: <TrendingUp color="primary" />,
  storage: <Storage color="secondary" />,
  egress: <CloudUpload color="info" />,
  third_party: <Assessment color="action" />,
};

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function Sparkline({
  points,
  color = "#1976d2",
  height = 40,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  if (!points.length) {
    return <Box sx={{ height }} />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const width = Math.max(points.length * 14, 80);
  const range = Math.max(max - min, 1);
  const path = points
    .map((value, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export default function FinOpsDashboard() {
  const [windowDays, setWindowDays] = useState(30);
  const [overview, setOverview] = useState<FinOpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    FinOpsAPI.rollups(windowDays)
      .then((data) => {
        if (mounted) setOverview(data);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message || "Failed to load FinOps data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [windowDays]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trendPoints = overview?.trend || [];
  const totalSparkline = useMemo(
    () => trendPoints.map((point) => point.totalCostUsd),
    [trendPoints]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            FinOps Cost & Usage
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Daily attribution by compute, storage, egress, and third-party usage with per-unit
            insights.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Window
          </Typography>
          <Select
            size="small"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
          >
            {[7, 14, 30, 60, 90].map((window) => (
              <MenuItem key={window} value={window}>
                Last {window} days
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Cost
                  </Typography>
                  <Typography variant="h5">
                    {formatUsd(overview?.totals.totalCostUsd || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across {overview?.periodDays || windowDays} days
                  </Typography>
                </Box>
                <Savings color="success" />
              </Stack>
              <Box sx={{ mt: 2 }}>
                <Sparkline points={totalSparkline} color="#2e7d32" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {(overview?.buckets || []).map((bucket) => (
          <Grid xs={12} md={2} key={bucket.key}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {bucketIconMap[bucket.key]}
                  <Typography variant="subtitle2" color="text.secondary">
                    {bucket.label}
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {formatUsd(bucket.costUsd)}
                </Typography>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  <Chip
                    label={`${bucket.allocationPct.toFixed(1)}%`}
                    size="small"
                    color={
                      bucket.allocationPct > 70
                        ? "error"
                        : bucket.allocationPct > 50
                          ? "warning"
                          : "default"
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    Units: {bucket.units.toFixed(1)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TrendingUp color="primary" />
                <Typography variant="h6">Unit Metrics</Typography>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Cost per compute unit</TableCell>
                    <TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerComputeUnit || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cost per GB-hour</TableCell>
                    <TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerGbHour || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cost per egress GB</TableCell>
                    <TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerEgressGb || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cost per 3p request</TableCell>
                    <TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerThirdPartyRequest || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Assessment color="primary" />
                <Typography variant="h6">Daily Trend</Typography>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Compute</TableCell>
                    <TableCell align="right">Storage</TableCell>
                    <TableCell align="right">Egress</TableCell>
                    <TableCell align="right">3P</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendPoints.map((point) => (
                    <TableRow key={point.usageDate}>
                      <TableCell>{point.usageDate}</TableCell>
                      <TableCell align="right">{formatUsd(point.totalCostUsd)}</TableCell>
                      <TableCell align="right">{formatUsd(point.computeCostUsd)}</TableCell>
                      <TableCell align="right">{formatUsd(point.storageCostUsd)}</TableCell>
                      <TableCell align="right">{formatUsd(point.egressCostUsd)}</TableCell>
                      <TableCell align="right">{formatUsd(point.thirdPartyCostUsd)}</TableCell>
                    </TableRow>
                  ))}
                  {!trendPoints.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary">
                          No rollup data available for this window.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
