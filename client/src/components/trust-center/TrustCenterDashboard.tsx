/**
 * Trust Center Dashboard
 *
 * Main dashboard component for the Trust Center showing compliance status,
 * certifications, SLO metrics, and regulatory pack access.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Button,
  Tab,
  Tabs,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Security,
  Assessment,
  Download,
  Refresh,
  Shield,
  VerifiedUser,
  Timeline,
  Speed,
  CloudDone,
} from '@mui/icons-material';

// =============================================================================
// Types
// =============================================================================

interface CertificationStatus {
  framework: string;
  name: string;
  status: 'active' | 'pending' | 'expired';
  validFrom?: string;
  validUntil?: string;
  auditor?: string;
}

interface SLOMetrics {
  availability: {
    target: number;
    current: number;
    period: string;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    target: number;
  };
  errorRate: {
    target: number;
    current: number;
  };
}

interface RegulatoryPackSummary {
  id: string;
  name: string;
  framework: string;
  version: string;
  status: string;
  controlCount: number;
  lastUpdated: string;
}

interface TrustCenterData {
  overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  certifications: CertificationStatus[];
  sloSummary: SLOMetrics;
  lastUpdated: string;
  incidentCount: number;
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'operational':
    case 'active':
    case 'effective':
      return 'success';
    case 'degraded':
    case 'pending':
    case 'partially_effective':
      return 'warning';
    case 'partial_outage':
    case 'major_outage':
    case 'expired':
    case 'ineffective':
      return 'error';
    default:
      return 'info';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'operational':
    case 'active':
      return <CheckCircle color="success" />;
    case 'degraded':
    case 'pending':
      return <Warning color="warning" />;
    case 'partial_outage':
    case 'major_outage':
    case 'expired':
      return <Error color="error" />;
    default:
      return <CheckCircle color="info" />;
  }
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// =============================================================================
// Sub-Components
// =============================================================================

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  status: 'success' | 'warning' | 'error' | 'info';
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, subtitle, icon, status }) => {
  const colors = {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: colors[status], fontWeight: 'bold' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: colors[status] }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface CertificationCardProps {
  cert: CertificationStatus;
  onDownload?: () => void;
}

const CertificationCard: React.FC<CertificationCardProps> = ({ cert, onDownload }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <VerifiedUser color={getStatusColor(cert.status)} />
            <Typography variant="h6">{cert.name}</Typography>
          </Box>
          <Chip
            label={cert.status.toUpperCase()}
            color={getStatusColor(cert.status)}
            size="small"
          />
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="textSecondary">
          {cert.auditor && `Auditor: ${cert.auditor}`}
        </Typography>
        {cert.validUntil && (
          <Typography variant="body2" color="textSecondary">
            Valid until: {formatDate(cert.validUntil)}
          </Typography>
        )}
        {onDownload && (
          <Box mt={2}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={onDownload}
            >
              Download Certificate
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

interface SLOGaugeProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

const SLOGauge: React.FC<SLOGaugeProps> = ({ label, current, target, unit = '%' }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isMet = current >= target;

  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color={isMet ? 'success.main' : 'error.main'}>
          {current}
          {unit} / {target}
          {unit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={isMet ? 'success' : 'error'}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const TrustCenterDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrustCenterData | null>(null);
  const [packs, setPacks] = useState<RegulatoryPackSummary[]>([]);

  // Fetch trust center data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch status
        const statusRes = await fetch('/api/v1/trust/status');
        if (!statusRes.ok) throw new Error('Failed to fetch status');
        const statusData = await statusRes.json();
        setData(statusData);

        // Fetch packs
        const packsRes = await fetch('/api/v1/trust/packs');
        if (!packsRes.ok) throw new Error('Failed to fetch packs');
        const packsData = await packsRes.json();
        setPacks(packsData.packs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Re-trigger fetch
    window.location.reload();
  };

  const handleDownloadReport = async (packId: string) => {
    try {
      const res = await fetch('/api/v1/trust/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, format: 'pdf' }),
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const report = await res.json();
      // Handle download
      console.log('Report generated:', report);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box p={4}>
        <LinearProgress />
        <Typography variant="body1" align="center" mt={2}>
          Loading Trust Center...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Shield fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4">Trust Center</Typography>
            <Typography variant="body2" color="textSecondary">
              Security, compliance, and privacy information
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={getStatusIcon(data.overallStatus)}
            label={data.overallStatus.replace('_', ' ').toUpperCase()}
            color={getStatusColor(data.overallStatus)}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Status Overview Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Availability (30d)"
            value={formatPercentage(data.uptime.last30d)}
            subtitle="Target: 99.9%"
            icon={<CloudDone fontSize="large" />}
            status={data.uptime.last30d >= 99.9 ? 'success' : 'warning'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Latency P95"
            value={`${data.sloSummary.latency.p95}ms`}
            subtitle={`Target: ${data.sloSummary.latency.target}ms`}
            icon={<Speed fontSize="large" />}
            status={data.sloSummary.latency.p95 <= data.sloSummary.latency.target ? 'success' : 'warning'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Active Certifications"
            value={String(data.certifications.filter(c => c.status === 'active').length)}
            subtitle={`${data.certifications.length} total`}
            icon={<VerifiedUser fontSize="large" />}
            status="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard
            title="Incidents (30d)"
            value={String(data.incidentCount)}
            icon={<Assessment fontSize="large" />}
            status={data.incidentCount === 0 ? 'success' : data.incidentCount < 3 ? 'warning' : 'error'}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Certifications" icon={<VerifiedUser />} iconPosition="start" />
          <Tab label="SLO Metrics" icon={<Timeline />} iconPosition="start" />
          <Tab label="Regulatory Packs" icon={<Security />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {data.certifications.map((cert) => (
            <Grid item xs={12} sm={6} md={4} key={cert.framework}>
              <CertificationCard
                cert={cert}
                onDownload={() => console.log('Download', cert.framework)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Service Level Objectives
                </Typography>
                <SLOGauge
                  label="Availability"
                  current={data.sloSummary.availability.current}
                  target={data.sloSummary.availability.target}
                />
                <SLOGauge
                  label="Latency P95"
                  current={data.sloSummary.latency.target - data.sloSummary.latency.p95}
                  target={data.sloSummary.latency.target}
                  unit="ms buffer"
                />
                <SLOGauge
                  label="Error Rate (inverted)"
                  current={data.sloSummary.errorRate.target - data.sloSummary.errorRate.current}
                  target={data.sloSummary.errorRate.target}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Uptime History
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={data.uptime.last24h >= 99.9 ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last 24 Hours"
                      secondary={formatPercentage(data.uptime.last24h)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={data.uptime.last7d >= 99.9 ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last 7 Days"
                      secondary={formatPercentage(data.uptime.last7d)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={data.uptime.last30d >= 99.9 ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last 30 Days"
                      secondary={formatPercentage(data.uptime.last30d)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {packs.map((pack) => (
            <Grid item xs={12} sm={6} md={4} key={pack.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="h6">{pack.name}</Typography>
                    <Chip
                      label={pack.status.toUpperCase()}
                      color={getStatusColor(pack.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {pack.framework.replace(/_/g, ' ')}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    Controls: {pack.controlCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Version: {pack.version}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Updated: {formatDate(pack.lastUpdated)}
                  </Typography>
                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => console.log('View pack', pack.id)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Download />}
                      onClick={() => handleDownloadReport(pack.id)}
                    >
                      Report
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Footer */}
      <Box mt={4} pt={2} borderTop={1} borderColor="divider">
        <Typography variant="body2" color="textSecondary" align="center">
          Last updated: {formatDate(data.lastUpdated)} |{' '}
          <a href="/docs/compliance/trust-center-regulatory-packs-v0.md" style={{ color: 'inherit' }}>
            Documentation
          </a>{' '}
          |{' '}
          <a href="mailto:security@company.io" style={{ color: 'inherit' }}>
            Contact Security Team
          </a>
        </Typography>
      </Box>
    </Box>
  );
};

export default TrustCenterDashboard;
