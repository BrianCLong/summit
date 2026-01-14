/**
 * Tenant Isolation & Policy Simulator
 *
 * Safe UI for testing authorization/policy decisions across tenants, roles, and resources.
 * No production data access - simulation-only.
 *
 * @module pages/PolicySimulator
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Divider,
  FormHelperText,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import {
  PlayArrow,
  ExpandMore,
  CheckCircle,
  Cancel,
  Warning,
  Science,
  ListAlt,
  Code,
} from '@mui/icons-material';

interface SimulationInput {
  tenantId: string;
  actor: {
    id: string;
    roles: string[];
  };
  action: string;
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  context?: Record<string, any>;
}

interface SimulationResult {
  decision: 'allow' | 'deny';
  ruleId?: string;
  reasons?: string[];
  evaluatedAt: string;
  trace?: {
    steps: Array<{
      rule: string;
      matched: boolean;
      reason: string;
    }>;
  };
}

interface PolicyFixture {
  id: string;
  name: string;
  description: string;
  input: SimulationInput;
  expectedDecision: 'allow' | 'deny';
}

const ROLE_OPTIONS = ['admin', 'operator', 'analyst', 'viewer'];
const RESOURCE_TYPES = ['case', 'evidence', 'workflow', 'task', 'tenant', 'user'];
const ACTION_OPTIONS = [
  'read',
  'write',
  'delete',
  'execute',
  'workflow:manage',
  'workflow:read',
  'task:execute',
];

export default function PolicySimulator() {
  const [input, setInput] = useState<SimulationInput>({
    tenantId: 'tenant-001',
    actor: {
      id: 'user-analyst',
      roles: ['analyst'],
    },
    action: 'read',
    resource: {
      type: 'case',
      id: 'case-123',
      attributes: {},
    },
    context: {},
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<PolicyFixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixtureResults, setFixtureResults] = useState<any[]>([]);
  const [attributesJson, setAttributesJson] = useState('{}');
  const [contextJson, setContextJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    loadFixtures();

    // Check online status
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadFixtures = async () => {
    try {
      const response = await fetch('/api/ops/policy/fixtures', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFixtures(data.fixtures || []);
      }
    } catch (err: any) {
      console.error('Failed to load fixtures:', err);
    }
  };

  const handleSimulate = async () => {
    if (offline) {
      setError('Cannot run simulation while offline. Please check your connection.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate JSON inputs
      let attributes = {};
      let context = {};

      try {
        attributes = JSON.parse(attributesJson || '{}');
        context = JSON.parse(contextJson || '{}');
      } catch (e) {
        throw new Error('Invalid JSON in attributes or context');
      }

      const payload: SimulationInput = {
        ...input,
        resource: {
          ...input.resource,
          attributes,
        },
        context,
      };

      const response = await fetch('/api/ops/policy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Simulation failed');
      }

      setResult(data.simulation);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate policy');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFixture = (fixture: PolicyFixture) => {
    setInput(fixture.input);
    setAttributesJson(JSON.stringify(fixture.input.resource.attributes || {}, null, 2));
    setContextJson(JSON.stringify(fixture.input.context || {}, null, 2));
    setJsonError(null);
    setResult(null);
    setError(null);
  };

  const handleRunAllFixtures = async () => {
    if (offline) {
      setError('Cannot run fixtures while offline. Please check your connection.');
      return;
    }

    setFixturesLoading(true);
    setError(null);
    setFixtureResults([]);

    try {
      const response = await fetch('/api/ops/policy/fixtures/run', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to run fixtures');
      }

      setFixtureResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Failed to run all fixtures');
    } finally {
      setFixturesLoading(false);
    }
  };

  const validateJson = (value: string, setter: (val: string) => void) => {
    setter(value);
    try {
      JSON.parse(value || '{}');
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Science /> Tenant Isolation & Policy Simulator
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>SIMULATION ONLY</strong> – This tool tests authorization policies with
          user-supplied inputs. No production data or secrets are accessed.
        </Alert>

        {offline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Offline Mode</strong> – Cannot run new simulations. Showing cached results.
          </Alert>
        )}

        {process.env.NODE_ENV === 'production' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Warning /> Production environment detected. Ensure POLICY_SIMULATOR=1 is set if this
            feature should be enabled.
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel: Input Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Input
              </Typography>

              <TextField
                fullWidth
                label="Tenant ID"
                value={input.tenantId}
                onChange={(e) => setInput({ ...input, tenantId: e.target.value })}
                margin="normal"
                helperText="The tenant context for this request"
              />

              <TextField
                fullWidth
                label="Actor ID"
                value={input.actor.id}
                onChange={(e) =>
                  setInput({
                    ...input,
                    actor: { ...input.actor, id: e.target.value },
                  })
                }
                margin="normal"
                helperText="User or service account ID"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Actor Roles</InputLabel>
                <Select
                  multiple
                  value={input.actor.roles}
                  onChange={(e: SelectChangeEvent<string[]>) => {
                    const value = e.target.value;
                    setInput({
                      ...input,
                      actor: {
                        ...input.actor,
                        roles: typeof value === 'string' ? value.split(',') : value,
                      },
                    });
                  }}
                  input={<OutlinedInput label="Actor Roles" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select one or more roles</FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Action</InputLabel>
                <Select
                  value={input.action}
                  onChange={(e) => setInput({ ...input, action: e.target.value })}
                  label="Action"
                >
                  {ACTION_OPTIONS.map((action) => (
                    <MenuItem key={action} value={action}>
                      {action}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Operation being performed</FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Resource Type</InputLabel>
                <Select
                  value={input.resource.type}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      resource: { ...input.resource, type: e.target.value },
                    })
                  }
                  label="Resource Type"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Resource ID"
                value={input.resource.id}
                onChange={(e) =>
                  setInput({
                    ...input,
                    resource: { ...input.resource, id: e.target.value },
                  })
                }
                margin="normal"
              />

              <TextField
                fullWidth
                label="Resource Attributes (JSON)"
                value={attributesJson}
                onChange={(e) => validateJson(e.target.value, setAttributesJson)}
                margin="normal"
                multiline
                rows={3}
                error={!!jsonError}
                helperText={jsonError || 'Optional metadata (e.g., {"tenantId": "tenant-001", "ownerId": "user-123"})'}
              />

              <TextField
                fullWidth
                label="Context (JSON)"
                value={contextJson}
                onChange={(e) => validateJson(e.target.value, setContextJson)}
                margin="normal"
                multiline
                rows={2}
                error={!!jsonError}
                helperText="Optional additional context"
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleSimulate}
                disabled={loading || !!jsonError || offline}
                sx={{ mt: 2 }}
              >
                {loading ? 'Simulating...' : 'Run Simulation'}
              </Button>
            </CardContent>
          </Card>

          {/* Fixtures Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListAlt /> Test Fixtures
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleRunAllFixtures}
                disabled={fixturesLoading || offline}
                sx={{ mb: 2 }}
              >
                {fixturesLoading ? 'Running...' : `Run All ${fixtures.length} Fixtures`}
              </Button>

              {fixtures.map((fixture) => (
                <Accordion key={fixture.id}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">{fixture.name}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {fixture.description}
                    </Typography>
                    <Chip
                      label={`Expected: ${fixture.expectedDecision}`}
                      size="small"
                      color={fixture.expectedDecision === 'allow' ? 'success' : 'error'}
                      sx={{ mb: 1 }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleLoadFixture(fixture)}
                      fullWidth
                    >
                      Load into Form
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel: Results */}
        <Grid item xs={12} md={6}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Simulation Result
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={result.decision === 'allow' ? <CheckCircle /> : <Cancel />}
                    label={result.decision.toUpperCase()}
                    color={result.decision === 'allow' ? 'success' : 'error'}
                    size="large"
                    sx={{ fontSize: '1.1rem', py: 2.5 }}
                  />
                </Box>

                {result.ruleId && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Rule ID:</strong> <Code>{result.ruleId}</Code>
                  </Typography>
                )}

                {result.reasons && result.reasons.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Reasons:
                    </Typography>
                    {result.reasons.map((reason, idx) => (
                      <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                        {reason}
                      </Alert>
                    ))}
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary">
                  Evaluated at: {new Date(result.evaluatedAt).toLocaleString()}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {result.trace && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">Policy Trace</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Rule</TableCell>
                              <TableCell>Matched</TableCell>
                              <TableCell>Reason</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.trace.steps.map((step, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <code>{step.rule}</code>
                                </TableCell>
                                <TableCell>
                                  {step.matched ? (
                                    <CheckCircle color="success" fontSize="small" />
                                  ) : (
                                    <Cancel color="error" fontSize="small" />
                                  )}
                                </TableCell>
                                <TableCell>{step.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {!result && !error && (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  Configure simulation parameters and click "Run Simulation" to test policy
                  decisions.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Fixture Results */}
          {fixtureResults.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Batch Fixture Results
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fixture</TableCell>
                        <TableCell>Decision</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fixtureResults.map((fr, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{fr.fixture.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={fr.result.decision}
                              size="small"
                              color={fr.result.decision === 'allow' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            {fr.passed ? (
                              <Chip label="PASS" size="small" color="success" icon={<CheckCircle />} />
                            ) : (
                              <Chip label="FAIL" size="small" color="error" icon={<Cancel />} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
