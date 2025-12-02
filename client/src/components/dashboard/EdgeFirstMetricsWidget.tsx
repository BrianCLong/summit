import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

export interface EdgeDeploymentStatus {
  nodeId: string;
  nodeName: string;
  location: string;
  status: 'online' | 'offline' | 'syncing' | 'degraded';
  latencyMs: number;
  lastSync: Date;
  offlineCapable: boolean;
  pendingSync: number;
}

export interface EdgeMetrics {
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  onlineNodes: number;
  totalNodes: number;
  offlineCapableNodes: number;
  pendingSyncOperations: number;
  lastGlobalSync: Date;
}

// Mock data - in production, this would come from a GraphQL query
const mockMetrics: EdgeMetrics = {
  avgLatencyMs: 47,
  p95LatencyMs: 82,
  p99LatencyMs: 98,
  onlineNodes: 8,
  totalNodes: 10,
  offlineCapableNodes: 10,
  pendingSyncOperations: 23,
  lastGlobalSync: new Date(Date.now() - 120000),
};

const mockNodes: EdgeDeploymentStatus[] = [
  {
    nodeId: 'edge-001',
    nodeName: 'CONUS-Primary',
    location: 'Fort Meade, MD',
    status: 'online',
    latencyMs: 12,
    lastSync: new Date(),
    offlineCapable: true,
    pendingSync: 0,
  },
  {
    nodeId: 'edge-002',
    nodeName: 'EUCOM-Alpha',
    location: 'Stuttgart, DE',
    status: 'online',
    latencyMs: 67,
    lastSync: new Date(Date.now() - 30000),
    offlineCapable: true,
    pendingSync: 5,
  },
  {
    nodeId: 'edge-003',
    nodeName: 'INDOPACOM-Bravo',
    location: 'Camp Smith, HI',
    status: 'syncing',
    latencyMs: 89,
    lastSync: new Date(Date.now() - 180000),
    offlineCapable: true,
    pendingSync: 12,
  },
  {
    nodeId: 'edge-004',
    nodeName: 'Tactical-FOB-7',
    location: 'Undisclosed',
    status: 'offline',
    latencyMs: 0,
    lastSync: new Date(Date.now() - 3600000),
    offlineCapable: true,
    pendingSync: 47,
  },
];

function getStatusIcon(status: EdgeDeploymentStatus['status']) {
  switch (status) {
    case 'online':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'syncing':
      return (
        <SyncIcon
          color="info"
          fontSize="small"
          sx={{
            animation: 'spin 2s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      );
    case 'offline':
      return <CloudOffIcon color="warning" fontSize="small" />;
    case 'degraded':
      return <SignalCellularAltIcon color="error" fontSize="small" />;
    default:
      return null;
  }
}

function getStatusColor(
  status: EdgeDeploymentStatus['status'],
): 'success' | 'info' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'online':
      return 'success';
    case 'syncing':
      return 'info';
    case 'offline':
      return 'warning';
    case 'degraded':
      return 'error';
    default:
      return 'default';
  }
}

function getLatencyColor(latencyMs: number): string {
  if (latencyMs === 0) return '#9e9e9e';
  if (latencyMs < 50) return '#4caf50';
  if (latencyMs < 100) return '#ff9800';
  return '#f44336';
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  target?: string;
}

function MetricDisplay({
  label,
  value,
  unit,
  color,
  target,
}: MetricDisplayProps) {
  return (
    <Box textAlign="center">
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{ color: color || 'text.primary', fontWeight: 600 }}
      >
        {value}
        {unit && (
          <Typography component="span" variant="body2" color="text.secondary">
            {unit}
          </Typography>
        )}
      </Typography>
      {target && (
        <Typography variant="caption" color="text.secondary">
          Target: {target}
        </Typography>
      )}
    </Box>
  );
}

export default function EdgeFirstMetricsWidget() {
  const metrics = mockMetrics;
  const nodes = mockNodes;

  const latencyMeetsTarget = metrics.p95LatencyMs < 100;
  const nodeAvailability = (metrics.onlineNodes / metrics.totalNodes) * 100;

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <SpeedIcon color="primary" />
            <Typography variant="h6">Edge-First Deployment</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<CloudOffIcon />}
              label="Offline Capable"
              size="small"
              color="info"
              variant="outlined"
            />
            {latencyMeetsTarget && (
              <Chip
                icon={<CheckCircleIcon />}
                label="<100ms Target Met"
                size="small"
                color="success"
              />
            )}
          </Stack>
        </Stack>

        {/* Key Latency Metrics */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <MetricDisplay
              label="Avg Latency"
              value={metrics.avgLatencyMs}
              unit="ms"
              color={getLatencyColor(metrics.avgLatencyMs)}
            />
          </Grid>
          <Grid item xs={4}>
            <MetricDisplay
              label="P95 Latency"
              value={metrics.p95LatencyMs}
              unit="ms"
              color={getLatencyColor(metrics.p95LatencyMs)}
              target="<100ms"
            />
          </Grid>
          <Grid item xs={4}>
            <MetricDisplay
              label="P99 Latency"
              value={metrics.p99LatencyMs}
              unit="ms"
              color={getLatencyColor(metrics.p99LatencyMs)}
            />
          </Grid>
        </Grid>

        {/* Node Availability */}
        <Box mb={3}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={0.5}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Edge Node Availability
            </Typography>
            <Typography variant="body2">
              {metrics.onlineNodes}/{metrics.totalNodes} nodes online (
              {nodeAvailability.toFixed(0)}%)
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={nodeAvailability}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.selected',
              '& .MuiLinearProgress-bar': {
                bgcolor: nodeAvailability >= 80 ? '#4caf50' : '#ff9800',
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Edge Nodes List */}
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Deployed Edge Nodes
        </Typography>
        <Stack spacing={1}>
          {nodes.map((node) => (
            <Box
              key={node.nodeId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                {getStatusIcon(node.status)}
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {node.nodeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {node.location} • Synced {formatTimeSince(node.lastSync)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                {node.status !== 'offline' && (
                  <Tooltip title="Round-trip latency">
                    <Typography
                      variant="body2"
                      sx={{
                        color: getLatencyColor(node.latencyMs),
                        fontWeight: 500,
                      }}
                    >
                      {node.latencyMs}ms
                    </Typography>
                  </Tooltip>
                )}
                {node.pendingSync > 0 && (
                  <Tooltip title="Pending sync operations">
                    <Chip
                      label={`${node.pendingSync} pending`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
                <Chip
                  label={node.status.toUpperCase()}
                  size="small"
                  color={getStatusColor(node.status)}
                  variant={node.status === 'offline' ? 'filled' : 'outlined'}
                />
              </Stack>
            </Box>
          ))}
        </Stack>

        {/* Sync Status */}
        {metrics.pendingSyncOperations > 0 && (
          <Box
            mt={2}
            p={1.5}
            sx={{
              bgcolor: 'info.light',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'info.main',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <SyncIcon color="info" fontSize="small" />
              <Typography variant="body2">
                {metrics.pendingSyncOperations} sync operations pending across
                offline nodes
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Last global sync: {formatTimeSince(metrics.lastGlobalSync)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
