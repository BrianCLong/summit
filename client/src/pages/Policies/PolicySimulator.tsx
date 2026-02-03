/**
 * Policy Simulator Page
 *
 * Interactive policy simulation and what-if analysis.
 *
 * SOC 2 Controls: CC7.2, PI1.1
 *
 * @module pages/Policies/PolicySimulator
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Check as PassIcon,
  Close as FailIcon,
  Warning as WarnIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { usePolicySimulator, usePolicies } from '../../hooks/usePolicies';
import {
  SimulationRequest,
  SimulationContext,
  PolicyRule,
  ManagedPolicy,
} from '../../services/policy-api';

// ============================================================================
// Types
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// Helper Components
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

const VerdictChip: React.FC<{ action: string }> = ({ action }) => {
  const getColor = (): 'success' | 'error' | 'warning' | 'info' => {
    switch (action) {
      case 'ALLOW': return 'success';
      case 'DENY': return 'error';
      case 'ESCALATE': return 'warning';
      case 'WARN': return 'info';
      default: return 'info';
    }
  };

  return <Chip label={action} color={getColor()} size="medium" />;
};

const RiskLevelChip: React.FC<{ level: string }> = ({ level }) => {
  const getColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  return <Chip label={level.toUpperCase()} color={getColor()} size="small" />;
};

// ============================================================================
// Default Values
// ============================================================================

const defaultPolicy = {
  id: 'test-policy',
  description: 'Test policy for simulation',
  scope: {
    stages: ['runtime'] as ('data' | 'train' | 'alignment' | 'runtime')[],
    tenants: ['*'],
  },
  rules: [] as PolicyRule[],
  action: 'ALLOW' as const,
};

const defaultContext: SimulationContext = {
  stage: 'runtime',
  tenantId: 'default-tenant',
  region: 'us-east-1',
  payload: {},
  metadata: {},
  simulation: true,
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Invalid JSON';
};

// ============================================================================
// Component
// ============================================================================

const PolicySimulator: React.FC = () => {
  // State
  const [tab, setTab] = useState(0);
  const [policyJson, setPolicyJson] = useState(JSON.stringify(defaultPolicy, null, 2));
  const [contextJson, setContextJson] = useState(JSON.stringify(defaultContext, null, 2));
  const [comparePolicy, setComparePolicy] = useState<string | null>(null);
  const [comparePolicyJson, setComparePolicyJson] = useState('');
  const [jsonErrors, setJsonErrors] = useState<{ policy?: string; context?: string; compare?: string }>({});

  // Hooks
  const simulator = usePolicySimulator();
  const { policies } = usePolicies({ pageSize: 100 });

  // Memoized values
  const activePolicies = useMemo(
    () => policies.filter((p) => p.status === 'active' || p.status === 'approved'),
    [policies]
  );

  // Handlers
  const handleTabChange = useCallback((_: unknown, newValue: number) => {
    setTab(newValue);
  }, []);

  const validateJson = useCallback((json: string, field: 'policy' | 'context' | 'compare'): boolean => {
    try {
      JSON.parse(json);
      setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch (err) {
      setJsonErrors((prev) => ({ ...prev, [field]: getErrorMessage(err) }));
      return false;
    }
  }, []);

  const handleRunSimulation = useCallback(async () => {
    // Validate inputs
    const policyValid = validateJson(policyJson, 'policy');
    const contextValid = validateJson(contextJson, 'context');

    if (!policyValid || !contextValid) return;

    try {
      const policy = JSON.parse(policyJson);
      const context = JSON.parse(contextJson);

      const request: SimulationRequest = {
        policy,
        context,
      };

      // Add comparison if enabled
      if (comparePolicy && comparePolicyJson) {
        const compareValid = validateJson(comparePolicyJson, 'compare');
        if (compareValid) {
          request.compareWith = JSON.parse(comparePolicyJson);
        }
      }

      await simulator.simulate(request);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  }, [policyJson, contextJson, comparePolicy, comparePolicyJson, validateJson, simulator]);

  const handleAnalyzeImpact = useCallback(async () => {
    const currentValid = validateJson(policyJson, 'policy');
    const newValid = validateJson(comparePolicyJson, 'compare');

    if (!currentValid || !newValid) return;

    try {
      const currentPolicy = JSON.parse(policyJson);
      const newPolicy = JSON.parse(comparePolicyJson);
      await simulator.analyzeImpact(currentPolicy, newPolicy);
    } catch (err) {
      console.error('Impact analysis error:', err);
    }
  }, [policyJson, comparePolicyJson, validateJson, simulator]);

  const handleLoadPolicy = useCallback((policy: ManagedPolicy, target: 'main' | 'compare') => {
    const policyData = {
      id: policy.id,
      description: policy.description,
      scope: policy.scope,
      rules: policy.rules,
      action: policy.action,
    };
    const json = JSON.stringify(policyData, null, 2);

    if (target === 'main') {
      setPolicyJson(json);
      setJsonErrors((prev) => ({ ...prev, policy: undefined }));
    } else {
      setComparePolicy(policy.id);
      setComparePolicyJson(json);
      setJsonErrors((prev) => ({ ...prev, compare: undefined }));
    }
  }, []);

  const handleCopyResult = useCallback(() => {
    if (simulator.result) {
      navigator.clipboard.writeText(JSON.stringify(simulator.result, null, 2));
    }
  }, [simulator.result]);

  // Render
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Policy Simulator
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={simulator.clearResults}
          disabled={simulator.loading}
        >
          Clear Results
        </Button>
      </Box>

      {/* Error Display */}
      {simulator.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {simulator.error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Input */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Simulate" />
              <Tab label="Compare" />
              <Tab label="Impact Analysis" />
            </Tabs>

            {/* Simulate Tab */}
            <TabPanel value={tab} index={0}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Policy Definition</Typography>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Load from...</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => {
                        const policy = activePolicies.find((p) => p.id === e.target.value);
                        if (policy) handleLoadPolicy(policy, 'main');
                      }}
                      label="Load from..."
                    >
                      {activePolicies.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={policyJson}
                  onChange={(e) => {
                    setPolicyJson(e.target.value);
                    validateJson(e.target.value, 'policy');
                  }}
                  error={Boolean(jsonErrors.policy)}
                  helperText={jsonErrors.policy}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Simulation Context
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={contextJson}
                  onChange={(e) => {
                    setContextJson(e.target.value);
                    validateJson(e.target.value, 'context');
                  }}
                  error={Boolean(jsonErrors.context)}
                  helperText={jsonErrors.context}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={simulator.loading ? <CircularProgress size={20} /> : <RunIcon />}
                onClick={handleRunSimulation}
                disabled={simulator.loading || Boolean(jsonErrors.policy) || Boolean(jsonErrors.context)}
              >
                Run Simulation
              </Button>
            </TabPanel>

            {/* Compare Tab */}
            <TabPanel value={tab} index={1}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Compare two policies to see how they differ in behavior.
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Policy
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={policyJson}
                  onChange={(e) => {
                    setPolicyJson(e.target.value);
                    validateJson(e.target.value, 'policy');
                  }}
                  error={Boolean(jsonErrors.policy)}
                  helperText={jsonErrors.policy}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Compare With</Typography>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Load from...</InputLabel>
                    <Select
                      value={comparePolicy || ''}
                      onChange={(e) => {
                        const policy = activePolicies.find((p) => p.id === e.target.value);
                        if (policy) handleLoadPolicy(policy, 'compare');
                      }}
                      label="Load from..."
                    >
                      {activePolicies.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={comparePolicyJson}
                  onChange={(e) => {
                    setComparePolicyJson(e.target.value);
                    validateJson(e.target.value, 'compare');
                  }}
                  error={Boolean(jsonErrors.compare)}
                  helperText={jsonErrors.compare}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Test Context
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={contextJson}
                  onChange={(e) => {
                    setContextJson(e.target.value);
                    validateJson(e.target.value, 'context');
                  }}
                  error={Boolean(jsonErrors.context)}
                  helperText={jsonErrors.context}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={simulator.loading ? <CircularProgress size={20} /> : <CompareIcon />}
                onClick={handleRunSimulation}
                disabled={simulator.loading || !comparePolicyJson}
              >
                Compare Policies
              </Button>
            </TabPanel>

            {/* Impact Analysis Tab */}
            <TabPanel value={tab} index={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Analyze the potential impact of changing from one policy to another.
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Policy
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={policyJson}
                  onChange={(e) => {
                    setPolicyJson(e.target.value);
                    validateJson(e.target.value, 'policy');
                  }}
                  error={Boolean(jsonErrors.policy)}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Proposed New Policy
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={comparePolicyJson}
                  onChange={(e) => {
                    setComparePolicyJson(e.target.value);
                    validateJson(e.target.value, 'compare');
                  }}
                  error={Boolean(jsonErrors.compare)}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                color="warning"
                startIcon={simulator.loading ? <CircularProgress size={20} /> : <WarnIcon />}
                onClick={handleAnalyzeImpact}
                disabled={simulator.loading || !comparePolicyJson}
              >
                Analyze Impact
              </Button>
            </TabPanel>
          </Paper>
        </Grid>

        {/* Right Panel - Results */}
        <Grid item xs={12} lg={6}>
          {/* Simulation Result */}
          {simulator.result && (
            <Card sx={{ mb: 2 }}>
              <CardHeader
                title="Simulation Result"
                action={
                  <Tooltip title="Copy JSON">
                    <IconButton onClick={handleCopyResult}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="subtitle1">Verdict:</Typography>
                  <VerdictChip action={simulator.result.verdict.action} />
                  <Typography variant="body2" color="text.secondary">
                    ({simulator.result.verdict.metadata.latencyMs}ms)
                  </Typography>
                </Box>

                {simulator.result.verdict.reasons.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Reasons:
                    </Typography>
                    <List dense>
                      {simulator.result.verdict.reasons.map((reason, i) => (
                        <ListItem key={i}>
                          <ListItemText primary={reason} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Evaluation Path */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Evaluation Path ({simulator.result.evaluationPath.length} steps)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {simulator.result.evaluationPath.map((step) => (
                        <ListItem key={step.step}>
                          <ListItemIcon>
                            {step.result === 'passed' ? (
                              <PassIcon color="success" />
                            ) : step.result === 'failed' ? (
                              <FailIcon color="error" />
                            ) : (
                              <WarnIcon color="disabled" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={`Step ${step.step}: ${step.description}`}
                            secondary={step.details ? JSON.stringify(step.details) : undefined}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>

                {/* Matched Rules */}
                {simulator.result.matchedRules.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Rules ({simulator.result.matchedRules.filter((r) => r.matched).length}/
                        {simulator.result.matchedRules.length} matched)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {simulator.result.matchedRules.map((match, i) => (
                          <ListItem key={i}>
                            <ListItemIcon>
                              {match.matched ? <PassIcon color="success" /> : <FailIcon color="error" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={`${match.rule.field} ${match.rule.operator} ${JSON.stringify(match.rule.value)}`}
                              secondary={match.reason}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Comparison Diff */}
                {simulator.result.comparisonDiff && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Policy Differences</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {simulator.result.comparisonDiff.actionChanged && (
                          <Grid item xs={12}>
                            <Alert severity="warning">
                              Action changed: {simulator.result.comparisonDiff.beforeAction} → {simulator.result.comparisonDiff.afterAction}
                            </Alert>
                          </Grid>
                        )}
                        {simulator.result.comparisonDiff.addedRules.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="success.main">
                              Added Rules:
                            </Typography>
                            {simulator.result.comparisonDiff.addedRules.map((rule, i) => (
                              <Chip
                                key={i}
                                size="small"
                                label={`${rule.field} ${rule.operator}`}
                                color="success"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Grid>
                        )}
                        {simulator.result.comparisonDiff.removedRules.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="error.main">
                              Removed Rules:
                            </Typography>
                            {simulator.result.comparisonDiff.removedRules.map((rule, i) => (
                              <Chip
                                key={i}
                                size="small"
                                label={`${rule.field} ${rule.operator}`}
                                color="error"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {/* Impact Analysis Result */}
          {simulator.impactAnalysis && (
            <Card>
              <CardHeader title="Impact Analysis" />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="subtitle1">Risk Level:</Typography>
                  <RiskLevelChip level={simulator.impactAnalysis.riskLevel} />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {simulator.impactAnalysis.estimatedAffectedUsers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Affected Users
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {simulator.impactAnalysis.estimatedAffectedResources}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Affected Resources
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {simulator.impactAnalysis.warnings.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Warnings:
                    </Typography>
                    {simulator.impactAnalysis.warnings.map((warning, i) => (
                      <Alert key={i} severity="warning" sx={{ mb: 1 }}>
                        {warning}
                      </Alert>
                    ))}
                  </Box>
                )}

                {simulator.impactAnalysis.recommendations.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recommendations:
                    </Typography>
                    <List dense>
                      {simulator.impactAnalysis.recommendations.map((rec, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <PassIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {!simulator.result && !simulator.impactAnalysis && !simulator.loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Run a simulation to see results here.
              </Typography>
            </Paper>
          )}

          {/* Loading */}
          {simulator.loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Running simulation...</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PolicySimulator;
