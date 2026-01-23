import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface ReadinessCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  lastRunAt?: string;
  evidenceLinks?: string[];
}

interface ReadinessSummary {
  generatedAt: string;
  versionOrCommit: string;
  checks: ReadinessCheck[];
}

interface ControlMapping {
  id: string;
  name: string;
  description: string;
  enforcementPoint: string;
  evidenceArtifact: string;
}

interface EvidenceItem {
  controlId: string;
  controlName: string;
  evidenceType: string;
  location: string;
  verificationCommand: string;
}

interface EvidenceIndex {
  controls: ControlMapping[];
  evidence: EvidenceItem[];
}

const CACHE_KEY_SUMMARY = 'release-readiness-summary';
const CACHE_KEY_EVIDENCE = 'release-readiness-evidence';
const CACHE_KEY_TIMESTAMP = 'release-readiness-timestamp';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Failed to load data';
};

function ReleaseReadinessRoute() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState<ReadinessSummary | null>(null);
  const [evidenceIndex, setEvidenceIndex] = useState<EvidenceIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const hasAccess = Boolean(hasRole && (hasRole('ADMIN') || hasRole('OPERATOR')));

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedSummary = localStorage.getItem(CACHE_KEY_SUMMARY);
      const cachedEvidence = localStorage.getItem(CACHE_KEY_EVIDENCE);
      const cachedTimestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);

      if (cachedSummary && cachedEvidence && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const age = Date.now() - timestamp;

        setSummary(JSON.parse(cachedSummary));
        setEvidenceIndex(JSON.parse(cachedEvidence));

        if (age > CACHE_EXPIRY) {
          setIsStale(true);
        }

        return true;
      }
    } catch (err) {
      console.error('Failed to load from cache:', err);
    }
    return false;
  }, []);

  // Save to cache
  const saveToCache = useCallback((summaryData: ReadinessSummary, evidenceData: EvidenceIndex) => {
    try {
      localStorage.setItem(CACHE_KEY_SUMMARY, JSON.stringify(summaryData));
      localStorage.setItem(CACHE_KEY_EVIDENCE, JSON.stringify(evidenceData));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
    } catch (err) {
      console.error('Failed to save to cache:', err);
    }
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      // Fetch summary and evidence index in parallel
      const [summaryRes, evidenceRes] = await Promise.all([
        fetch('/api/ops/release-readiness/summary', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/ops/release-readiness/evidence-index', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!summaryRes.ok || !evidenceRes.ok) {
        throw new Error('Failed to fetch release readiness data');
      }

      const summaryData = await summaryRes.json();
      const evidenceData = await evidenceRes.json();

      setSummary(summaryData);
      setEvidenceIndex(evidenceData);
      saveToCache(summaryData, evidenceData);
      setIsStale(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsOffline(true);

      // Try loading from cache on error
      if (!loadFromCache()) {
        setError('Failed to load data and no cached data available');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  // Initial load
  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    // Try loading from cache first
    const hasCache = loadFromCache();

    if (hasCache) {
      setLoading(false);
      // Fetch fresh data in background
      fetchData();
    } else {
      // No cache, fetch now
      fetchData();
    }
  }, [fetchData, hasAccess, loadFromCache]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage('Copied to clipboard');
      setSnackbarOpen(true);
    }).catch(() => {
      setSnackbarMessage('Failed to copy');
      setSnackbarOpen(true);
    });
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'fail':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warn':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      default:
        return <HelpIcon sx={{ color: 'grey.500' }} />;
    }
  };

  if (!hasAccess) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You do not have permission to view this page. Admin or Operator role required.
        </Alert>
      </Box>
    );
  }

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Calculate overall status
  const getOverallStatus = () => {
    if (!summary) return 'unknown';
    const failCount = summary.checks.filter(c => c.status === 'fail').length;
    const warnCount = summary.checks.filter(c => c.status === 'warn').length;

    if (failCount > 0) return 'fail';
    if (warnCount > 0) return 'warn';
    return 'pass';
  };

  // Loading state
  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Loading release readiness data...</Typography>
        </Stack>
      </Box>
    );
  }

  // Error state (no cache)
  if (error && !summary) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <Box p={3}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h1">
            Release Readiness & Evidence Explorer
          </Typography>
          <Stack direction="row" spacing={1}>
            {isOffline && (
              <Tooltip title="Showing cached data - offline or failed to fetch">
                <CloudOffIcon color="warning" />
              </Tooltip>
            )}
            {isStale && !isOffline && (
              <Chip
                label="Stale"
                size="small"
                color="warning"
                icon={<WarningIcon />}
              />
            )}
            <IconButton onClick={fetchData} disabled={loading} aria-label="Refresh data">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Offline/Stale Warning */}
        {(isOffline || isStale) && (
          <Alert
            severity={isOffline ? 'warning' : 'info'}
            action={
              <Button color="inherit" size="small" onClick={fetchData}>
                Refresh
              </Button>
            }
          >
            {isOffline
              ? 'Showing cached data - unable to connect to server'
              : `Data is stale (last updated: ${summary ? new Date(summary.generatedAt).toLocaleString() : 'unknown'})`
            }
          </Alert>
        )}

        {/* Summary Card */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Overall Status</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                {getStatusIcon(overallStatus)}
                <Chip
                  label={overallStatus.toUpperCase()}
                  color={getStatusColor(overallStatus)}
                  size="medium"
                />
              </Box>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Version/Commit
                  </Typography>
                  <Typography variant="body2">
                    {summary?.versionOrCommit || 'unknown'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Generated At
                  </Typography>
                  <Typography variant="body2">
                    {summary ? new Date(summary.generatedAt).toLocaleString() : 'unknown'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Checks
                  </Typography>
                  <Typography variant="body2">
                    {summary?.checks.length || 0}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="Release readiness tabs">
          <Tab label="Checks" />
          <Tab label="Evidence Explorer" />
        </Tabs>

        {/* Checks Tab */}
        {activeTab === 0 && (
          <Stack spacing={2}>
            <Typography variant="h6">Readiness Checks</Typography>
            {summary?.checks.length === 0 ? (
              <Alert severity="info">No checks available</Alert>
            ) : (
              summary?.checks.map((check) => (
                <Accordion key={check.id}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${check.id}-content`}
                    id={`${check.id}-header`}
                  >
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      {getStatusIcon(check.status)}
                      <Typography sx={{ flexGrow: 1 }}>{check.name}</Typography>
                      <Chip
                        label={check.status}
                        color={getStatusColor(check.status)}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {check.lastRunAt && (
                        <Typography variant="body2" color="text.secondary">
                          Last checked: {new Date(check.lastRunAt).toLocaleString()}
                        </Typography>
                      )}
                      {check.evidenceLinks && check.evidenceLinks.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2">Evidence:</Typography>
                          {check.evidenceLinks.map((link, i) => (
                            <Typography key={i} variant="body2" component="code" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              {link}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Stack>
        )}

        {/* Evidence Explorer Tab */}
        {activeTab === 1 && (
          <Stack spacing={3}>
            <Typography variant="h6">Controls & Evidence</Typography>

            {/* Controls Table */}
            {evidenceIndex && evidenceIndex.controls.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Controls
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small" aria-label="Controls table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Control ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Enforcement Point</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {evidenceIndex.controls.map((control) => (
                        <TableRow key={control.id}>
                          <TableCell>
                            <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {control.id}
                            </Typography>
                          </TableCell>
                          <TableCell>{control.name}</TableCell>
                          <TableCell>{control.description}</TableCell>
                          <TableCell>{control.enforcementPoint}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Evidence Items */}
            {evidenceIndex && evidenceIndex.evidence.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Evidence Items
                </Typography>
                <Stack spacing={2}>
                  {evidenceIndex.evidence.map((item, index) => (
                    <Card key={`${item.controlId}-${index}`} variant="outlined">
                      <CardContent>
                        <Stack spacing={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={item.controlId} size="small" />
                            <Typography variant="body2" fontWeight="bold">
                              {item.controlName}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Type: {item.evidenceType}
                          </Typography>
                          <Typography variant="body2">
                            Location: <code>{item.location}</code>
                          </Typography>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Verification Command:
                            </Typography>
                            <Box
                              sx={{
                                backgroundColor: 'grey.900',
                                color: 'grey.100',
                                p: 1,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                component="code"
                                sx={{ fontFamily: 'monospace', color: 'inherit' }}
                              >
                                {item.verificationCommand}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(item.verificationCommand)}
                                sx={{ color: 'grey.100' }}
                                aria-label="Copy verification command"
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {(!evidenceIndex || (evidenceIndex.controls.length === 0 && evidenceIndex.evidence.length === 0)) && (
              <Alert severity="info">No evidence data available</Alert>
            )}
          </Stack>
        )}
      </Stack>

      {/* Snackbar for copy notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default ReleaseReadinessRoute;
