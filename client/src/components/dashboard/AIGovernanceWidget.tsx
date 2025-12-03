import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';

export interface AgentFleetStatus {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error' | 'contained';
  policyCompliance: number;
  lastHeartbeat: Date;
  incidentsToday: number;
}

export interface GovernanceMetrics {
  automatedValidationRate: number;
  humanEscalations: number;
  policyViolations: number;
  activeAgents: number;
  containedAgents: number;
  avgResponseTimeMs: number;
}

// Mock data - in production, this would come from a GraphQL query or API call
const mockMetrics: GovernanceMetrics = {
  automatedValidationRate: 85,
  humanEscalations: 12,
  policyViolations: 3,
  activeAgents: 24,
  containedAgents: 1,
  avgResponseTimeMs: 47,
};

const mockFleet: AgentFleetStatus[] = [
  {
    id: 'agent-001',
    name: 'Entity Extraction Fleet',
    status: 'active',
    policyCompliance: 98,
    lastHeartbeat: new Date(),
    incidentsToday: 0,
  },
  {
    id: 'agent-002',
    name: 'Relationship Inference Fleet',
    status: 'active',
    policyCompliance: 92,
    lastHeartbeat: new Date(),
    incidentsToday: 1,
  },
  {
    id: 'agent-003',
    name: 'Anomaly Detection Fleet',
    status: 'paused',
    policyCompliance: 100,
    lastHeartbeat: new Date(Date.now() - 300000),
    incidentsToday: 0,
  },
  {
    id: 'agent-004',
    name: 'OSINT Collector Fleet',
    status: 'contained',
    policyCompliance: 67,
    lastHeartbeat: new Date(Date.now() - 600000),
    incidentsToday: 3,
  },
];

function getStatusIcon(status: AgentFleetStatus['status']) {
  switch (status) {
    case 'active':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'paused':
      return <PauseCircleIcon color="warning" fontSize="small" />;
    case 'error':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'contained':
      return <WarningIcon color="error" fontSize="small" />;
    default:
      return null;
  }
}

function getStatusColor(
  status: AgentFleetStatus['status'],
): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'error':
    case 'contained':
      return 'error';
    default:
      return 'default';
  }
}

function getComplianceColor(compliance: number): string {
  if (compliance >= 90) return '#4caf50';
  if (compliance >= 70) return '#ff9800';
  return '#f44336';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function MetricCard({ title, value, subtitle, color }: MetricCardProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography
        variant="h4"
        sx={{ color: color || 'text.primary', fontWeight: 600 }}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export default function AIGovernanceWidget() {
  const [metrics] = useState<GovernanceMetrics>(mockMetrics);
  const [fleet] = useState<AgentFleetStatus[]>(mockFleet);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">AI Governance & Agent Fleet</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${metrics.automatedValidationRate}% Automated`}
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Tooltip title="Refresh metrics">
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Key Metrics Row */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="Policy Validation Rate"
              value={`${metrics.automatedValidationRate}%`}
              subtitle="OPA-based validation"
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="Human Escalations"
              value={metrics.humanEscalations}
              subtitle="Last 24 hours"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="Active Agents"
              value={metrics.activeAgents}
              subtitle={`${metrics.containedAgents} contained`}
              color={metrics.containedAgents > 0 ? '#ff9800' : '#4caf50'}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="Avg Response Time"
              value={`${metrics.avgResponseTimeMs}ms`}
              subtitle="Incident response"
              color="#2196f3"
            />
          </Grid>
        </Grid>

        {/* Agent Fleet Status */}
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Agent Fleet Status
        </Typography>
        <Stack spacing={1}>
          {fleet.map((agent) => (
            <Box
              key={agent.id}
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
                {getStatusIcon(agent.status)}
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {agent.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last heartbeat:{' '}
                    {agent.lastHeartbeat.toLocaleTimeString()}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Tooltip title="Policy Compliance">
                  <Box sx={{ width: 100 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption">Compliance</Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: getComplianceColor(agent.policyCompliance) }}
                      >
                        {agent.policyCompliance}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={agent.policyCompliance}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'action.selected',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getComplianceColor(agent.policyCompliance),
                        },
                      }}
                    />
                  </Box>
                </Tooltip>
                <Chip
                  label={agent.status.toUpperCase()}
                  size="small"
                  color={getStatusColor(agent.status)}
                  variant={agent.status === 'contained' ? 'filled' : 'outlined'}
                />
                {agent.incidentsToday > 0 && (
                  <Tooltip title={`${agent.incidentsToday} incidents today`}>
                    <Chip
                      label={`${agent.incidentsToday} incidents`}
                      size="small"
                      color="warning"
                    />
                  </Tooltip>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>

        {/* Incident Response Actions */}
        {metrics.containedAgents > 0 && (
          <Box
            mt={2}
            p={1.5}
            sx={{
              bgcolor: 'warning.light',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.main',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningIcon color="warning" fontSize="small" />
              <Typography variant="body2" fontWeight={500}>
                {metrics.containedAgents} agent(s) automatically contained due
                to policy violations
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" mt={0.5}>
              Review in Agent Fleet Control Center for manual release
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
