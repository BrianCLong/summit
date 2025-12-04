/**
 * ThreatHuntingDashboard
 * Main dashboard for orchestrating agentic threat hunts over the knowledge graph
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  BugReport as BugIcon,
  NetworkCheck as NetworkIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

// Types
interface HuntStatus {
  huntId: string;
  status: 'initializing' | 'generating_hypotheses' | 'executing_queries' | 'analyzing_results' | 'enriching_findings' | 'remediating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentPhase: string;
  findingsCount: number;
  elapsedTimeMs: number;
  estimatedRemainingMs: number;
}

interface HuntFinding {
  id: string;
  hypothesisId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidence: number;
  classification: string;
  entitiesInvolved: Array<{ id: string; type: string; name: string }>;
  iocsIdentified: Array<{ id: string; type: string; value: string }>;
  ttpsMatched: Array<{ id: string; name: string; tactic: string }>;
  recommendedActions: Array<{ id: string; type: string; description: string }>;
  autoRemediationEligible: boolean;
  evidenceSummary: string;
}

interface HuntMetrics {
  totalHypothesesTested: number;
  totalQueriesExecuted: number;
  totalFindingsDiscovered: number;
  findingsBySeverity: Record<string, number>;
  iocsDiscovered: number;
  precisionEstimate: number;
  executionTimeMs: number;
  llmTokensUsed: number;
}

interface HuntConfiguration {
  scope: 'all' | 'network' | 'endpoint' | 'identity' | 'cloud';
  timeWindowHours: number;
  autoRemediate: boolean;
  remediationApprovalRequired: boolean;
  confidenceThreshold: number;
  targetPrecision: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const severityColors: Record<string, string> = {
  CRITICAL: '#d32f2f',
  HIGH: '#f57c00',
  MEDIUM: '#fbc02d',
  LOW: '#388e3c',
  INFO: '#1976d2',
};

const statusColors: Record<string, string> = {
  initializing: '#9e9e9e',
  generating_hypotheses: '#2196f3',
  executing_queries: '#ff9800',
  analyzing_results: '#9c27b0',
  enriching_findings: '#00bcd4',
  remediating: '#f44336',
  completed: '#4caf50',
  failed: '#d32f2f',
  cancelled: '#757575',
};

export const ThreatHuntingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeHunt, setActiveHunt] = useState<HuntStatus | null>(null);
  const [findings, setFindings] = useState<HuntFinding[]>([]);
  const [metrics, setMetrics] = useState<HuntMetrics | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<HuntConfiguration>({
    scope: 'all',
    timeWindowHours: 24,
    autoRemediate: false,
    remediationApprovalRequired: true,
    confidenceThreshold: 0.7,
    targetPrecision: 0.91,
  });

  // Polling for hunt status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeHunt && !['completed', 'failed', 'cancelled'].includes(activeHunt.status)) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/v1/hunt/${activeHunt.huntId}/status`);
          if (response.ok) {
            const status = await response.json();
            setActiveHunt(status);

            if (status.status === 'completed') {
              await fetchResults(status.huntId);
            }
          }
        } catch (err) {
          console.error('Failed to fetch hunt status:', err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeHunt?.huntId, activeHunt?.status]);

  const startHunt = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/hunt/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: config.scope,
          timeWindowHours: config.timeWindowHours,
          configuration: {
            autoRemediate: config.autoRemediate,
            remediationApprovalRequired: config.remediationApprovalRequired,
            confidenceThreshold: config.confidenceThreshold,
            targetPrecision: config.targetPrecision,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start hunt');
      }

      const result = await response.json();
      setActiveHunt({
        huntId: result.huntId,
        status: 'initializing',
        progress: 0,
        currentPhase: 'Initializing',
        findingsCount: 0,
        elapsedTimeMs: 0,
        estimatedRemainingMs: result.estimatedDuration,
      });
      setFindings([]);
      setMetrics(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const cancelHunt = useCallback(async () => {
    if (!activeHunt) return;

    try {
      await fetch(`/api/v1/hunt/${activeHunt.huntId}/cancel`, { method: 'POST' });
      setActiveHunt((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeHunt]);

  const fetchResults = async (huntId: string) => {
    try {
      const response = await fetch(`/api/v1/hunt/${huntId}/results`);
      if (response.ok) {
        const results = await response.json();
        setFindings(results.findings || []);
        setMetrics(results.metrics || null);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: statusColors.completed }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: statusColors.failed }} />;
      case 'cancelled':
        return <StopIcon sx={{ color: statusColors.cancelled }} />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Threat Hunting Platform
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Agentic hunt queries over knowledge graph with auto-remediation
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Configuration">
            <IconButton onClick={() => setIsConfigOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {activeHunt && !['completed', 'failed', 'cancelled'].includes(activeHunt.status) ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={cancelHunt}
            >
              Cancel Hunt
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayIcon />}
              onClick={startHunt}
              disabled={isLoading}
            >
              Start Hunt
            </Button>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Active Hunt Status */}
      {activeHunt && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(activeHunt.status)}
                <Box>
                  <Typography variant="h6">
                    Hunt: {activeHunt.huntId.slice(0, 8)}...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeHunt.currentPhase}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Chip
                  label={activeHunt.status.replace('_', ' ').toUpperCase()}
                  sx={{
                    bgcolor: statusColors[activeHunt.status],
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    Elapsed: {formatDuration(activeHunt.elapsedTimeMs)}
                  </Typography>
                  {activeHunt.estimatedRemainingMs > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      ~{formatDuration(activeHunt.estimatedRemainingMs)} remaining
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <LinearProgress
              variant="determinate"
              value={activeHunt.progress}
              sx={{ height: 8, borderRadius: 4 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {activeHunt.progress.toFixed(0)}% complete
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeHunt.findingsCount} findings discovered
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Metrics Summary */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <BugIcon sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {metrics.totalFindingsDiscovered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Findings
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <NetworkIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {metrics.iocsDiscovered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  IOCs
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {(metrics.precisionEstimate * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Precision
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TimelineIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {metrics.totalQueriesExecuted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Queries
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {metrics.totalHypothesesTested}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hypotheses
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <RefreshIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {formatDuration(metrics.executionTimeMs)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Findings" icon={<BugIcon />} iconPosition="start" />
          <Tab label="IOCs" icon={<NetworkIcon />} iconPosition="start" />
          <Tab label="Remediation" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Report" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Findings Tab */}
      <TabPanel value={activeTab} index={0}>
        {findings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <BugIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No findings yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start a threat hunt to discover findings
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Severity breakdown */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {Object.entries(metrics?.findingsBySeverity || {}).map(([severity, count]) => (
                <Chip
                  key={severity}
                  label={`${severity}: ${count}`}
                  sx={{
                    bgcolor: severityColors[severity],
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              ))}
            </Box>

            {/* Findings list */}
            {findings.map((finding) => (
              <Accordion key={finding.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip
                      label={finding.severity}
                      size="small"
                      sx={{
                        bgcolor: severityColors[finding.severity],
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: 80,
                      }}
                    />
                    <Typography sx={{ flex: 1 }}>
                      {finding.classification.replace('_', ' ')}
                    </Typography>
                    <Chip
                      label={`${(finding.confidence * 100).toFixed(0)}% confidence`}
                      size="small"
                      variant="outlined"
                    />
                    {finding.autoRemediationEligible && (
                      <Chip label="Auto-remediate" size="small" color="success" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Evidence Summary
                      </Typography>
                      <Typography>{finding.evidenceSummary}</Typography>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Entities Involved ({finding.entitiesInvolved.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.entitiesInvolved.slice(0, 5).map((entity) => (
                          <Chip
                            key={entity.id}
                            label={`${entity.type}: ${entity.name}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        MITRE ATT&CK ({finding.ttpsMatched.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.ttpsMatched.map((ttp) => (
                          <Chip
                            key={ttp.id}
                            label={`${ttp.id}: ${ttp.name}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Recommended Actions ({finding.recommendedActions.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.recommendedActions.map((action) => (
                          <Chip
                            key={action.id}
                            label={action.type.replace('_', ' ')}
                            size="small"
                            color="warning"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </TabPanel>

      {/* IOCs Tab */}
      <TabPanel value={activeTab} index={1}>
        {findings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <NetworkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No IOCs discovered yet
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Finding</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {findings.flatMap((finding) =>
                  finding.iocsIdentified.map((ioc) => (
                    <TableRow key={`${finding.id}-${ioc.id}`}>
                      <TableCell>
                        <Chip label={ioc.type} size="small" />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{ioc.value}</TableCell>
                      <TableCell>{finding.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Chip
                          label={finding.severity}
                          size="small"
                          sx={{
                            bgcolor: severityColors[finding.severity],
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View details">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Export">
                          <IconButton size="small">
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Remediation Tab */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Remediation actions will appear here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {config.autoRemediate
              ? 'Auto-remediation is enabled'
              : 'Auto-remediation is disabled'}
          </Typography>
        </Box>
      </TabPanel>

      {/* Report Tab */}
      <TabPanel value={activeTab} index={3}>
        {metrics ? (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export JSON
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export PDF
              </Button>
            </Box>

            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Executive Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography paragraph>
                  Threat hunt completed with <strong>{metrics.totalFindingsDiscovered}</strong> findings
                  discovered. <strong>{metrics.findingsBySeverity?.CRITICAL || 0}</strong> critical and{' '}
                  <strong>{metrics.findingsBySeverity?.HIGH || 0}</strong> high severity findings require
                  immediate attention.
                </Typography>
                <Typography paragraph>
                  <strong>{metrics.iocsDiscovered}</strong> IOCs were identified across all findings.
                  Estimated precision: <strong>{(metrics.precisionEstimate * 100).toFixed(1)}%</strong>.
                </Typography>
                <Typography paragraph>
                  Hunt executed <strong>{metrics.totalQueriesExecuted}</strong> graph queries testing{' '}
                  <strong>{metrics.totalHypothesesTested}</strong> hypotheses in{' '}
                  <strong>{formatDuration(metrics.executionTimeMs)}</strong>.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Report will be generated after hunt completion
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onClose={() => setIsConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hunt Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Hunt Scope</InputLabel>
              <Select
                value={config.scope}
                label="Hunt Scope"
                onChange={(e) => setConfig({ ...config, scope: e.target.value as any })}
              >
                <MenuItem value="all">All (Network + Endpoint + Identity)</MenuItem>
                <MenuItem value="network">Network Only</MenuItem>
                <MenuItem value="endpoint">Endpoint Only</MenuItem>
                <MenuItem value="identity">Identity Only</MenuItem>
                <MenuItem value="cloud">Cloud Only</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Time Window (hours)"
              type="number"
              value={config.timeWindowHours}
              onChange={(e) =>
                setConfig({ ...config, timeWindowHours: parseInt(e.target.value) || 24 })
              }
              fullWidth
            />

            <TextField
              label="Confidence Threshold"
              type="number"
              value={config.confidenceThreshold}
              onChange={(e) =>
                setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) || 0.7 })
              }
              inputProps={{ step: 0.1, min: 0, max: 1 }}
              fullWidth
            />

            <TextField
              label="Target Precision"
              type="number"
              value={config.targetPrecision}
              onChange={(e) =>
                setConfig({ ...config, targetPrecision: parseFloat(e.target.value) || 0.91 })
              }
              inputProps={{ step: 0.01, min: 0.5, max: 1 }}
              fullWidth
              helperText="Default: 91% precision"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.autoRemediate}
                  onChange={(e) => setConfig({ ...config, autoRemediate: e.target.checked })}
                />
              }
              label="Enable Auto-Remediation"
            />

            {config.autoRemediate && (
              <FormControlLabel
                control={
                  <Switch
                    checked={config.remediationApprovalRequired}
                    onChange={(e) =>
                      setConfig({ ...config, remediationApprovalRequired: e.target.checked })
                    }
                  />
                }
                label="Require Approval for Remediation"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfigOpen(false)}>Cancel</Button>
          <Button onClick={() => setIsConfigOpen(false)} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatHuntingDashboard;
