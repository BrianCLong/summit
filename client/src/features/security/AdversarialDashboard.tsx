// client/src/features/security/AdversarialDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Shield,
  BugReport,
} from '@mui/icons-material';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useResilientPolling } from '../../hooks/useResilientPolling';

interface ThreatMetrics {
  totalThreats: number;
  criticalThreats: number;
  mitigated: number;
  inProgress: number;
  lastUpdated: string;
}

interface ThreatEvent {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'mitigated' | 'investigating';
  timestamp: string;
  mitreAttackId?: string;
}

/**
 * Adversarial Defense Dashboard
 * Displays security threats, MITRE ATT&CK framework integration, and defense metrics
 */
export default function AdversarialDashboard() {
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threat data
  const fetchThreatData = useCallback(async () => {
    try {
      const response = await fetch('/api/security/adversarial/metrics');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setThreats(data.threats || []);

      // Only clear error when online
      if (navigator.onLine) {
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch threat data:', err);

      // Only set error when online - offline is handled by banner
      if (navigator.onLine) {
        setError(err instanceof Error ? err.message : 'Failed to fetch threat data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchThreatData();
  }, [fetchThreatData]);

  // Set up resilient polling
  useResilientPolling(fetchThreatData, {
    interval: 30000, // 30 seconds
    enabled: true,
    refreshOnReconnect: true,
    preventConcurrent: true,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mitigated':
        return <CheckCircle color="success" />;
      case 'active':
        return <Warning color="error" />;
      case 'investigating':
        return <BugReport color="warning" />;
      default:
        return <Security />;
    }
  };

  // Loading state
  if (loading && !metrics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading threat intelligence data...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state (only when online)
  if (error && navigator.onLine && !metrics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          action={
            <Button color="inherit" size="small" onClick={fetchThreatData} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Error Loading Data</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  // Empty state
  if (!metrics || (!threats || threats.length === 0)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <OfflineBanner onRetry={fetchThreatData} />
        <Box textAlign="center" py={8}>
          <Shield sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            All Clear
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No active threats detected. Your systems are secure.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchThreatData}
            sx={{ mt: 3 }}
          >
            Refresh Data
          </Button>
        </Box>
      </Container>
    );
  }

  // Main dashboard view
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <OfflineBanner onRetry={fetchThreatData} />

      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom>
          <Security sx={{ fontSize: 40, verticalAlign: 'middle', mr: 1 }} />
          Adversarial Defense Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time threat monitoring powered by MITRE ATT&CK framework
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Threats
                  </Typography>
                  <Typography variant="h4">{metrics.totalThreats}</Typography>
                </Box>
                <Security color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Critical
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {metrics.criticalThreats}
                  </Typography>
                </Box>
                <Warning color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Mitigated
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {metrics.mitigated}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    In Progress
                  </Typography>
                  <Typography variant="h4">{metrics.inProgress}</Typography>
                </Box>
                <BugReport color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threat Events Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Threat Events</Typography>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={fetchThreatData}
            >
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Threat Name</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>MITRE ATT&CK</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {threats.map((threat) => (
                  <TableRow key={threat.id}>
                    <TableCell>{getStatusIcon(threat.status)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {threat.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={threat.severity.toUpperCase()}
                        color={getSeverityColor(threat.severity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {threat.mitreAttackId ? (
                        <Chip label={threat.mitreAttackId} size="small" variant="outlined" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(threat.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <Box mt={2} textAlign="right">
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </Typography>
      </Box>
    </Container>
  );
}
