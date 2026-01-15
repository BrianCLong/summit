import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Button,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  ExpandMore,
  ExpandLess,
  Security,
  Policy,
  VerifiedUser,
  PowerSettingsNew,
} from '@mui/icons-material';

interface SystemHealthSummary {
  generatedAt: string;
  commitOrVersion: string;
  invariants: {
    enforced: boolean;
    lastViolationAt: string | null;
    activePolicies: number;
    recentViolations24h: number;
  };
  killSwitch: {
    state: 'normal' | 'soft' | 'hard' | 'catastrophic';
    lastTripAt: string | null;
    reason?: string;
  };
  policy: {
    denials24h: number;
    topRules: Array<{ ruleId: string; count: number }>;
  };
  verification: {
    lastRunAt: string | null;
    gates: Array<{
      id: string;
      name: string;
      status: 'pass' | 'fail' | 'warn' | 'unknown';
    }>;
  };
}

interface HealthEvent {
  id: string;
  timestamp: string;
  type: 'invariant_violation' | 'kill_switch_trip' | 'policy_denial' | 'verification_gate_failure' | 'safety_mode_change';
  severity: 'info' | 'warn' | 'error' | 'critical';
  summary: string;
  details: Record<string, any>;
}

interface HealthEventsResponse {
  events: HealthEvent[];
  total: number;
  filters: {
    since: string | null;
    limit: number;
    type: string | null;
    severity: string | null;
  };
}

const STATUS_COLORS = {
  pass: '#4caf50',
  fail: '#f44336',
  warn: '#ff9800',
  unknown: '#9e9e9e',
};

const SEVERITY_CONFIG = {
  info: { icon: <Info />, color: 'info' as const, label: 'Info' },
  warn: { icon: <Warning />, color: 'warning' as const, label: 'Warning' },
  error: { icon: <Error />, color: 'error' as const, label: 'Error' },
  critical: { icon: <Error />, color: 'error' as const, label: 'Critical' },
};

const KILL_SWITCH_CONFIG = {
  normal: { color: 'success', label: 'Normal', description: 'All systems operational' },
  soft: { color: 'warning', label: 'Soft', description: 'High-risk endpoints disabled' },
  hard: { color: 'error', label: 'Hard', description: 'All mutations blocked' },
  catastrophic: { color: 'error', label: 'Catastrophic', description: 'System in emergency mode' },
};

export default function SystemHealthDashboard() {
  const [summary, setSummary] = useState<SystemHealthSummary | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [eventSeverityFilter, setEventSeverityFilter] = useState<string>('all');

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, eventsRes] = await Promise.all([
        fetch('http://localhost:4000/api/ops/system-health/summary', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-token'}`,
          },
        }),
        fetch('http://localhost:4000/api/ops/system-health/events?limit=50', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-token'}`,
          },
        }),
      ]);

      if (!summaryRes.ok || !eventsRes.ok) {
        throw new Error('Failed to fetch health data');
      }

      const summaryData = await summaryRes.json();
      const eventsData: HealthEventsResponse = await eventsRes.json();

      setSummary(summaryData);
      setEvents(eventsData.events);
      setLastFetch(new Date());
      setOffline(false);

      // Cache for offline use
      localStorage.setItem('systemHealthSummary', JSON.stringify(summaryData));
      localStorage.setItem('systemHealthEvents', JSON.stringify(eventsData.events));
      localStorage.setItem('systemHealthLastFetch', new Date().toISOString());
    } catch (err: any) {
      // Try to load cached data
      const cachedSummary = localStorage.getItem('systemHealthSummary');
      const cachedEvents = localStorage.getItem('systemHealthEvents');
      const cachedTime = localStorage.getItem('systemHealthLastFetch');

      if (cachedSummary && cachedEvents) {
        setSummary(JSON.parse(cachedSummary));
        setEvents(JSON.parse(cachedEvents));
        setLastFetch(cachedTime ? new Date(cachedTime) : null);
        setOffline(true);
      } else {
        setError(err.message || 'Failed to fetch health data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const getOverallStatus = (): { label: string; color: 'success' | 'warning' | 'error'; message: string } => {
    if (!summary) return { label: 'Unknown', color: 'warning', message: 'Loading...' };

    const hasViolations = summary.invariants.recentViolations24h > 0;
    const killSwitchActive = summary.killSwitch.state !== 'normal';
    const hasFailedGates = summary.verification.gates.some(g => g.status === 'fail');

    if (summary.killSwitch.state === 'catastrophic' || hasFailedGates) {
      return { label: 'Critical', color: 'error', message: 'System requires immediate attention' };
    }

    if (killSwitchActive || hasViolations) {
      return { label: 'Warning', color: 'warning', message: 'System operating in degraded mode' };
    }

    return { label: 'OK', color: 'success', message: 'All systems operational' };
  };

  const filteredEvents = events.filter(event => {
    if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) return false;
    if (eventSeverityFilter !== 'all' && event.severity !== eventSeverityFilter) return false;
    return true;
  });

  if (loading && !summary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchHealthData} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  const status = getOverallStatus();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Health & Invariants
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {offline && (
            <Chip
              label="Offline - Showing Cached Data"
              color="warning"
              size="small"
            />
          )}
          {lastFetch && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastFetch.toLocaleTimeString()}
            </Typography>
          )}
          <IconButton onClick={fetchHealthData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ mb: 3, backgroundColor: status.color === 'success' ? '#e8f5e9' : status.color === 'warning' ? '#fff3e0' : '#ffebee' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {status.color === 'success' && <CheckCircle sx={{ fontSize: 48, color: '#4caf50' }} />}
            {status.color === 'warning' && <Warning sx={{ fontSize: 48, color: '#ff9800' }} />}
            {status.color === 'error' && <Error sx={{ fontSize: 48, color: '#f44336' }} />}
            <Box>
              <Typography variant="h5">Status: {status.label}</Typography>
              <Typography variant="body2" color="text.secondary">{status.message}</Typography>
              {summary && (
                <Typography variant="caption" color="text.secondary">
                  Version: {summary.commitOrVersion}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="Overview" />
          <Tab label="Events Timeline" />
        </Tabs>
      </Box>

      {selectedTab === 0 && summary && (
        <Grid container spacing={3}>
          {/* Invariants Panel */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Security color="primary" />
                  <Typography variant="h6">Invariants</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={summary.invariants.enforced ? 'Enforced' : 'Not Enforced'}
                    color={summary.invariants.enforced ? 'success' : 'error'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Active Policies: {summary.invariants.activePolicies}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Violations (24h): {summary.invariants.recentViolations24h}
                </Typography>
                {summary.invariants.lastViolationAt && (
                  <Typography variant="body2" color="error" gutterBottom>
                    Last Violation: {new Date(summary.invariants.lastViolationAt).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Kill Switch Panel */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PowerSettingsNew color={summary.killSwitch.state === 'normal' ? 'success' : 'error'} />
                  <Typography variant="h6">Kill Switch</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={KILL_SWITCH_CONFIG[summary.killSwitch.state].label}
                    color={KILL_SWITCH_CONFIG[summary.killSwitch.state].color as any}
                    size="small"
                  />
                </Box>

                <Tooltip title={KILL_SWITCH_CONFIG[summary.killSwitch.state].description}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {KILL_SWITCH_CONFIG[summary.killSwitch.state].description}
                  </Typography>
                </Tooltip>

                {summary.killSwitch.reason && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {summary.killSwitch.reason}
                  </Alert>
                )}

                {summary.killSwitch.lastTripAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Last Trip: {new Date(summary.killSwitch.lastTripAt).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Policy Denials Panel */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Policy color="primary" />
                  <Typography variant="h6">Policy Denials</Typography>
                </Box>

                <Typography variant="h4" gutterBottom>
                  {summary.policy.denials24h}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total denials in last 24 hours
                </Typography>

                {summary.policy.topRules.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                      Top Rules:
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {summary.policy.topRules.map((rule) => (
                            <TableRow key={rule.ruleId}>
                              <TableCell>{rule.ruleId}</TableCell>
                              <TableCell align="right">{rule.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Verification Gates Panel */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VerifiedUser color="primary" />
                  <Typography variant="h6">Verification Gates</Typography>
                </Box>

                {summary.verification.lastRunAt && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Run: {new Date(summary.verification.lastRunAt).toLocaleString()}
                  </Typography>
                )}

                <Box sx={{ mt: 2 }}>
                  {summary.verification.gates.map((gate) => (
                    <Box
                      key={gate.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: gate.status === 'fail' ? '#ffebee' : 'transparent',
                      }}
                    >
                      <Typography variant="body2">{gate.name}</Typography>
                      <Chip
                        label={gate.status.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: STATUS_COLORS[gate.status],
                          color: 'white',
                        }}
                      />
                    </Box>
                  ))}
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Run verification: <code>npm run verify</code>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Box>
          {/* Event Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Event Type</InputLabel>
              <Select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} label="Event Type">
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="invariant_violation">Invariant Violations</MenuItem>
                <MenuItem value="kill_switch_trip">Kill Switch Trips</MenuItem>
                <MenuItem value="policy_denial">Policy Denials</MenuItem>
                <MenuItem value="verification_gate_failure">Verification Failures</MenuItem>
                <MenuItem value="safety_mode_change">Safety Mode Changes</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={eventSeverityFilter} onChange={(e) => setEventSeverityFilter(e.target.value)} label="Severity">
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Events Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No events found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <React.Fragment key={event.id}>
                      <TableRow>
                        <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip label={event.type.replace(/_/g, ' ')} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={SEVERITY_CONFIG[event.severity].icon}
                            label={SEVERITY_CONFIG[event.severity].label}
                            color={SEVERITY_CONFIG[event.severity].color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{event.summary}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          >
                            {expandedEvent === event.id ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0 }}>
                          <Collapse in={expandedEvent === event.id}>
                            <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Details:
                              </Typography>
                              <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
