// Conductor Studio - MoE+MCP Router Interface
// Provides routing preview, execution, and system monitoring for the Conductor

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow,
  Preview,
  Psychology,
  Engineering,
  CloudDownload,
  Timeline,
  ExpandMore,
  Refresh,
  OpenInNew,
} from '@mui/icons-material';
import { RolloutTimeline, RolloutStep } from './panels/RolloutTimeline';
import { CanaryHealthPanel } from './panels/CanaryHealthPanel';
import { BudgetGuardrails, Denial } from './panels/BudgetGuardrails';
import { ProvenanceTree, StepNode } from './panels/ProvenanceTree';
import { SLODashboardEmbed } from './panels/SLODashboardEmbed';
import { NLToCypherPreview } from './panels/NLToCypherPreview';
import { DualControlModal } from '../conductor/components/DualControlModal';
import {
  useBudgetDenials,
  useCanaryHealth,
  useProvenanceRoot,
  useRolloutSteps,
} from './hooks';

// GraphQL operations (preview conduct only)
const PREVIEW_ROUTING = gql`
  query PreviewRouting($input: ConductInput!) {
    previewRouting(input: $input) {
      expert
      reason
      confidence
      alternatives {
        expert
        reason
        confidence
      }
      features {
        complexity
        dataIntensity
        timeConstraint
        securityLevel
        keywords
      }
    }
  }
`;

const CONDUCT_MUTATION = gql`
  mutation Conduct($input: ConductInput!) {
    conduct(input: $input) {
      expertId
      cost
      latencyMs
      auditId
      result
      evidence
      traceId
    }
  }
`;

interface Alternative {
  expert: string;
  confidence: number;
  reason: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`conductor-tabpanel-${index}`}
      aria-labelledby={`conductor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface MCPTool {
  name: string;
  description: string;
}

interface MCPServer {
  name: string;
  status: string;
  url: string;
  tools?: MCPTool[];
}

interface MCPSession {
  sid: string;
  scopes: string[];
  servers: string[];
}

interface MCPInvocation {
  id: string;
  createdAt: string;
  details?: {
    argsHash: string;
    resultHash: string;
  };
}

// Routing Preview Panel
function RoutingPreview({
  taskInput,
  onTaskChange,
}: {
  taskInput: string;
  onTaskChange: (value: string) => void;
}) {
  const [maxLatency, setMaxLatency] = useState(30000);
  const target = 'https://maestro.intelgraph.ai/health';
  const rollout = useRolloutSteps();
  const canary = useCanaryHealth(target);
  const denials = useBudgetDenials();
  const prov = useProvenanceRoot();
  const [dualOpen, setDualOpen] = useState<null | 'promote' | 'abort'>(null);
  const [previewRouting, { loading, data, error }] =
    useLazyQuery(PREVIEW_ROUTING);

  const handlePreview = useCallback(() => {
    if (!taskInput.trim()) return;

    previewRouting({
      variables: {
        input: {
          task: taskInput,
          maxLatencyMs: maxLatency,
          context: {},
        },
      },
    });
  }, [taskInput, maxLatency, previewRouting]);

  const getExpertColor = (expert: string) => {
    const colors: Record<string, string> = {
      LLM_LIGHT: '#4caf50',
      LLM_HEAVY: '#ff9800',
      GRAPH_TOOL: '#2196f3',
      RAG_TOOL: '#9c27b0',
      FILES_TOOL: '#795548',
      OSINT_TOOL: '#f44336',
      EXPORT_TOOL: '#607d8b',
    };
    return colors[expert] || '#757575';
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Preview sx={{ mr: 1, verticalAlign: 'middle' }} />
              Routing Preview
            </Typography>

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Task Description"
                value={taskInput}
                onChange={(e) => onTaskChange(e.target.value)}
                placeholder="Enter your task or query here..."
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Max Latency (ms)"
                type="number"
                value={maxLatency}
                onChange={(e) => setMaxLatency(Number(e.target.value))}
                sx={{ width: 200 }}
              />
              <Button
                variant="contained"
                startIcon={<Preview />}
                onClick={handlePreview}
                disabled={loading || !taskInput.trim()}
              >
                Preview Routing
              </Button>
            </Box>

            {loading && <LinearProgress />}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to preview routing: {error.message}
              </Alert>
            )}

            {data?.previewRouting && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Routing Decision
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={data.previewRouting.expert}
                    sx={{
                      backgroundColor: getExpertColor(
                        data.previewRouting.expert,
                      ),
                      color: 'white',
                    }}
                  />
                  <Chip
                    label={`${Math.round(data.previewRouting.confidence * 100)}% confidence`}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Reason:</strong> {data.previewRouting.reason}
                </Typography>

                {data.previewRouting.alternatives?.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        Alternative Options (
                        {data.previewRouting.alternatives.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {data.previewRouting.alternatives.map(
                          (alt: Alternative) => (
                            <ListItem key={alt.expert}>
                              <ListItemIcon>
                                <Chip
                                  size="small"
                                  label={alt.expert}
                                  sx={{
                                    backgroundColor: getExpertColor(alt.expert),
                                    color: 'white',
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${Math.round(alt.confidence * 100)}% confidence`}
                                secondary={alt.reason}
                              />
                            </ListItem>
                          ),
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {data.previewRouting.features && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Extracted Features
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item>
                        <Chip
                          size="small"
                          label={`Complexity: ${data.previewRouting.features.complexity}`}
                        />
                      </Grid>
                      <Grid item>
                        <Chip
                          size="small"
                          label={`Data Intensity: ${data.previewRouting.features.dataIntensity}`}
                        />
                      </Grid>
                      <Grid item>
                        <Chip
                          size="small"
                          label={`Security: ${data.previewRouting.features.securityLevel}`}
                        />
                      </Grid>
                      {data.previewRouting.features.keywords?.length > 0 &&
                        data.previewRouting.features.keywords.map(
                          (keyword: string, idx: number) => (
                            <Grid item key={idx}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={keyword}
                              />
                            </Grid>
                          ),
                        )}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      {/* Rollouts & SLO/Guardrails/Provenance */}
      <Grid item xs={12}>
        <Paper>
          <Tabs
            value={0}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
          >
            <Tab label="Rollout" />
            <Tab label="SLO" />
            <Tab label="Budgets" />
            <Tab label="Provenance" />
          </Tabs>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setDualOpen('promote')}
                  >
                    Promote
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setDualOpen('abort')}
                  >
                    Abort
                  </Button>
                </Box>
                <RolloutTimeline
                  name="maestro-server-rollout"
                  steps={(rollout.data as RolloutStep[]) || []}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <CanaryHealthPanel
                  availability={canary.data?.availability || 0}
                  p95TtfbMs={canary.data?.p95TtfbMs || 0}
                  errorRate={canary.data?.errorRate || 0}
                  target={target}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <BudgetGuardrails denials={(denials.data as Denial[]) || []} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ProvenanceTree root={prov.data as StepNode} />
              </Grid>
              <Grid item xs={12}>
                <SLODashboardEmbed />
              </Grid>
              <Grid item xs={12}>
                <NLToCypherPreview />
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>
      <DualControlModal
        open={dualOpen !== null}
        actionLabel={dualOpen === 'promote' ? 'Promote' : 'Abort'}
        onClose={() => setDualOpen(null)}
        onConfirm={(p) => {
          console.log('dual-control', dualOpen, p);
          setDualOpen(null);
        }}
      />
    </Grid>
  );
}

// Execution Panel
function ExecutionPanel({ taskInput }: { taskInput: string }) {
  const [conduct, { loading, data, error }] = useMutation(CONDUCT_MUTATION);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const handleExecute = useCallback(async () => {
    if (!taskInput.trim()) return;

    setExecutionLog((prev) => [
      ...prev,
      `🚀 Starting execution: ${new Date().toLocaleTimeString()}`,
    ]);

    try {
      const result = await conduct({
        variables: {
          input: {
            task: taskInput,
            maxLatencyMs: 30000,
            context: {},
          },
        },
      });

      setExecutionLog((prev) => [
        ...prev,
        `✅ Execution completed in ${result.data?.conduct?.latencyMs}ms`,
        `💰 Cost: $${result.data?.conduct?.cost?.toFixed(4)}`,
        `🔍 Audit ID: ${result.data?.conduct?.auditId}`,
        `🎯 Expert: ${result.data?.conduct?.expertId}`,
      ]);
    } catch (err) {
      setExecutionLog((prev) => [
        ...prev,
        `❌ Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      ]);
    }
  }, [taskInput, conduct]);

  const downloadEvidence = useCallback(() => {
    if (!data?.conduct?.evidence) return;

    const blob = new Blob([JSON.stringify(data.conduct.evidence, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conductor-evidence-${data.conduct.auditId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <PlayArrow sx={{ mr: 1, verticalAlign: 'middle' }} />
              Execute Task
            </Typography>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleExecute}
              disabled={loading || !taskInput.trim()}
              sx={{ mb: 2 }}
            >
              {loading ? 'Executing...' : 'Execute Task'}
            </Button>

            {loading && <LinearProgress />}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Execution failed: {error.message}
              </Alert>
            )}

            {data?.conduct && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Execution Results
                </Typography>

                <Grid
                  container
                  spacing={1}
                  sx={{ mb: 2, alignItems: 'center' }}
                >
                  <Grid item xs={6}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="caption">Latency</Typography>
                      <Typography variant="h6">
                        {data.conduct.latencyMs}ms
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="caption">Cost</Typography>
                      <Typography variant="h6">
                        ${data.conduct.cost?.toFixed(4)}
                      </Typography>
                    </Paper>
                  </Grid>
                  {Number(data.conduct.cost || 0) === 0 &&
                    Number(data.conduct.latencyMs || 0) < 50 && (
                      <Grid item xs={12}>
                        <Chip
                          size="small"
                          color="success"
                          label="from cache (heuristic)"
                        />
                      </Grid>
                    )}
                </Grid>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {data.conduct.traceId && (
                    <Tooltip title="Open trace in monitoring">
                      <IconButton size="small">
                        <OpenInNew />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Button
                    size="small"
                    startIcon={<CloudDownload />}
                    onClick={downloadEvidence}
                    disabled={!data.conduct.evidence}
                  >
                    Download Evidence
                  </Button>
                </Box>

                {data.conduct.result && (
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {typeof data.conduct.result === 'string'
                        ? data.conduct.result
                        : JSON.stringify(data.conduct.result, null, 2)}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
              Execution Log
            </Typography>

            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={() => setExecutionLog([])}
              sx={{ mb: 2 }}
            >
              Clear Log
            </Button>

            <Paper
              sx={{
                p: 2,
                backgroundColor: 'grey.900',
                color: 'grey.100',
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {executionLog.length === 0 ? (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  No execution logs yet...
                </Typography>
              ) : (
                executionLog.map((log, idx) => (
                  <Typography
                    key={idx}
                    variant="body2"
                    component="div"
                    sx={{ fontFamily: 'monospace', mb: 0.5 }}
                  >
                    {log}
                  </Typography>
                ))
              )}
            </Paper>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// MCP Registry Panel
function MCPRegistry() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ mcpServers: MCPServer[] }>({
    mcpServers: [],
  });
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/maestro/v1/mcp/servers');
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const servers = await res.json();
      setData({
        mcpServers: servers.map((s: MCPServer) => ({
          ...s,
          status: 'healthy',
        })),
      });
    } catch (e: unknown) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6">
                <Engineering sx={{ mr: 1, verticalAlign: 'middle' }} />
                MCP Server Registry
              </Typography>
              <Button
                startIcon={<Refresh />}
                onClick={() => refetch()}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            {loading && <LinearProgress />}

            {error && (
              <Alert severity="error">
                Failed to load MCP servers: {String(error.message || error)}
              </Alert>
            )}

            {data?.mcpServers && data.mcpServers.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Server</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>URL</TableCell>
                      <TableCell>Tools</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.mcpServers.map((server: MCPServer, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {server.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={server.status}
                            color={getStatusColor(server.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {server.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                          >
                            {server.tools?.map((tool: MCPTool) => (
                              <Tooltip key={tool.name} title={tool.description}>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={tool.name}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              !loading && (
                <Alert severity="info">
                  No MCP servers found. Make sure the Conductor system is
                  running.
                </Alert>
              )
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// Main Conductor Studio Component
export default function ConductorStudio() {
  const [tabValue, setTabValue] = useState(0);
  const [taskInput, setTaskInput] = useState('');
  const [sessions, setSessions] = useState<MCPSession[]>([]);
  const [invocations, setInvocations] = useState<MCPInvocation[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/maestro/v1/runs/demo-run/mcp/sessions`);
      if (res.ok) setSessions(await res.json());
    } catch {
      /* noop */
    }
  }, []); // runId removed from dependency array

  const loadInvocations = useCallback(async () => {
    try {
      const res = await await fetch(
        `/api/maestro/v1/runs/demo-run/mcp/invocations`,
      );
      if (res.ok) setInvocations(await res.json());
    } catch {
      /* noop */
    }
  }, []); // runId removed from dependency array

  useEffect(() => {
    loadSessions();
    loadInvocations();
  }, [loadSessions, loadInvocations]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <Psychology sx={{ mr: 1, verticalAlign: 'middle', fontSize: '2rem' }} />
        Conductor Studio
        <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          Multi-Expert Router & MCP Tool Orchestra
        </Typography>
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Preview />} label="Routing Preview" />
          <Tab icon={<PlayArrow />} label="Execute" />
          <Tab icon={<Engineering />} label="MCP Registry" />
          <Tab icon={<Timeline />} label="Tools & Evidence" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <RoutingPreview taskInput={taskInput} onTaskChange={setTaskInput} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ExecutionPanel taskInput={taskInput} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <MCPRegistry />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attached MCP Sessions
                </Typography>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={loadSessions}
                  sx={{ mb: 2 }}
                >
                  Refresh
                </Button>
                {sessions.length === 0 ? (
                  <Alert severity="info">
                    No active sessions for run: demo-run
                  </Alert>
                ) : (
                  <List>
                    {sessions.map((s, i) => (
                      <React.Fragment key={s.sid}>
                        <ListItem>
                          <ListItemText
                            primary={`sid=${s.sid}`}
                            secondary={`scopes=[${(s.scopes || []).join(', ')}] servers=[${(s.servers || []).join(', ')}]`}
                          />
                        </ListItem>
                        {i < sessions.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tool Invocations (Audit)
                </Typography>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={loadInvocations}
                  sx={{ mb: 2 }}
                >
                  Refresh
                </Button>
                {invocations.length === 0 ? (
                  <Alert severity="info">
                    No invocations recorded for run: demo-run
                  </Alert>
                ) : (
                  <List>
                    {invocations.map((v, i) => (
                      <React.Fragment key={v.id}>
                        <ListItem>
                          <ListItemText
                            primary={new Date(v.createdAt).toLocaleString()}
                            secondary={`argsHash=${v.details?.argsHash} resultHash=${v.details?.resultHash}`}
                          />
                        </ListItem>
                        {i < invocations.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
