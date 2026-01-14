/**
 * Compliance Dashboard
 *
 * Main dashboard for compliance analytics and audit readiness.
 *
 * SOC 2 Controls: CC2.1, CC3.1, CC4.1, PI1.1
 *
 * @module pages/Analytics/ComplianceDashboard
 */

import React, { useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  useComplianceSummary,
  useAuditReadiness,
  useFrameworkStatus,
  useControlStatus,
} from '../../../hooks/useAnalytics';

// ============================================================================
// Helper Components
// ============================================================================

const AuditReadinessGauge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const getLabel = () => {
    if (score >= 80) return 'Ready';
    if (score >= 60) return 'Needs Work';
    return 'At Risk';
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={160}
        thickness={6}
        sx={{ color: getColor() }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h3" component="div" fontWeight="bold">
          {score}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getLabel()}
        </Typography>
      </Box>
    </Box>
  );
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'compliant':
      return <CheckIcon color="success" />;
    case 'partially_compliant':
      return <WarningIcon color="warning" />;
    case 'non_compliant':
      return <ErrorIcon color="error" />;
    default:
      return <HelpIcon color="disabled" />;
  }
};

const FrameworkCard: React.FC<{
  displayName: string;
  percentage: number;
  total: number;
  compliant: number;
}> = ({ displayName, percentage, total, compliant }) => {
  const getColor = () => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6">{displayName}</Typography>
          <Chip
            size="small"
            label={`${percentage}%`}
            color={getColor()}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={getColor()}
          sx={{ height: 8, borderRadius: 4, mb: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {compliant} of {total} controls compliant
        </Typography>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const ComplianceDashboard: React.FC = () => {
  const summary = useComplianceSummary();
  const readiness = useAuditReadiness();
  const frameworks = useFrameworkStatus();
  const controls = useControlStatus();

  const handleRefresh = useCallback(() => {
    summary.refresh();
    readiness.refresh();
    frameworks.refresh();
    controls.refresh();
  }, [summary, readiness, frameworks, controls]);

  const isLoading = summary.loading || readiness.loading || frameworks.loading;
  const hasError = summary.error || readiness.error || frameworks.error;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Compliance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor audit readiness, control status, and compliance health
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {summary.error || readiness.error || frameworks.error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Audit Readiness Score */}
        <Grid xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Audit Readiness
            </Typography>
            <AuditReadinessGauge score={readiness.data?.overallScore || 0} />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {readiness.data?.controlCoverage || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Control Coverage
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {readiness.data?.evidenceCoverage || 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Evidence Coverage
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Control Status Summary */}
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Control Status
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={6} sm={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4">
                      {summary.data?.controlsByStatus.compliant || 0}
                    </Typography>
                    <Typography variant="body2">Compliant</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4">
                      {summary.data?.controlsByStatus.partially_compliant || 0}
                    </Typography>
                    <Typography variant="body2">Partial</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4">
                      {summary.data?.controlsByStatus.non_compliant || 0}
                    </Typography>
                    <Typography variant="body2">Non-Compliant</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'grey.300' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="h4">
                      {summary.data?.controlsByStatus.not_assessed || 0}
                    </Typography>
                    <Typography variant="body2">Not Assessed</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Gaps Summary */}
            <Box sx={{ mt: 2 }}>
              <Alert
                severity={
                  readiness.data?.criticalGaps === 0
                    ? 'success'
                    : readiness.data?.criticalGaps && readiness.data.criticalGaps > 3
                      ? 'error'
                      : 'warning'
                }
              >
                <Typography variant="body2">
                  {readiness.data?.gapCount || 0} total gaps identified
                  {readiness.data?.criticalGaps
                    ? ` (${readiness.data.criticalGaps} critical)`
                    : ''}
                </Typography>
              </Alert>
            </Box>
          </Paper>
        </Grid>

        {/* Framework Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Framework Compliance
            </Typography>
            <Grid container spacing={2}>
              {frameworks.data && frameworks.data.length > 0 ? (
                frameworks.data.map((fw) => (
                  <Grid xs={12} sm={6} md={3} key={fw.framework}>
                    <FrameworkCard
                      displayName={fw.displayName}
                      percentage={fw.compliancePercentage}
                      total={fw.totalControls}
                      compliant={fw.compliantControls}
                    />
                  </Grid>
                ))
              ) : (
                <Grid xs={12}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No framework data available. Configure compliance frameworks to see status.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Evidence Status */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Evidence Status
            </Typography>
            {summary.data?.evidenceStatus ? (
              <Grid container spacing={2}>
                <Grid xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <InventoryIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4">{summary.data.evidenceStatus.current}</Typography>
                    <Typography variant="body2">Current</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <TimelineIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4">{summary.data.evidenceStatus.expiring}</Typography>
                    <Typography variant="body2">Expiring Soon</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                    <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                    <Typography variant="h4">{summary.data.evidenceStatus.expired}</Typography>
                    <Typography variant="body2">Expired</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.200', borderRadius: 2 }}>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="h4">{summary.data.evidenceStatus.total}</Typography>
                    <Typography variant="body2">Total</Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No evidence data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recommendations */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            {readiness.data?.recommendations && readiness.data.recommendations.length > 0 ? (
              <List dense>
                {readiness.data.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success">
                No specific recommendations at this time. Keep up the good work!
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Control Details Table */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Control Details
            </Typography>
            {controls.data && controls.data.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Control ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Framework</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Evidence</TableCell>
                      <TableCell align="right">Gaps</TableCell>
                      <TableCell>Last Assessed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {controls.data.slice(0, 10).map((control) => (
                      <TableRow key={control.controlId}>
                        <TableCell>{control.controlId}</TableCell>
                        <TableCell>{control.controlName}</TableCell>
                        <TableCell>
                          <Chip size="small" label={control.framework.toUpperCase()} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusIcon status={control.status} />
                            {control.status.replace('_', ' ')}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{control.evidenceCount}</TableCell>
                        <TableCell align="right">
                          {control.gapCount > 0 ? (
                            <Chip size="small" label={control.gapCount} color="error" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {control.lastAssessed
                            ? new Date(control.lastAssessed).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No control data available. Configure compliance controls to see details.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComplianceDashboard;
